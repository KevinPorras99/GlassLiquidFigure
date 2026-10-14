import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ appType: 'custom', logLevel: 'error', server: { middlewareMode: true, ws: false } });
try {
  const { createOrbRenderer } = await server.ssrLoadModule('/src/orb-renderer.ts');
  const { stylePresets } = await server.ssrLoadModule('/src/presets.ts');
  const frames = new Map();
  let nextFrame = 0;
  globalThis.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  globalThis.document = Object.assign(new EventTarget(), { hidden: false });
  globalThis.window = { devicePixelRatio: 1 };
  globalThis.GPUBufferUsage = { UNIFORM: 1, COPY_DST: 2 };
  globalThis.GPUTextureUsage = { RENDER_ATTACHMENT: 1, TEXTURE_BINDING: 2 };
  const compiled = [];
  let draws = 0;
  const pass = { setPipeline() {}, setBindGroup() {}, draw() { draws++; }, end() {} };
  const device = Object.assign(new EventTarget(), {
    lost: new Promise(() => {}),
    queue: { writeBuffer() {}, submit() {} },
    createShaderModule: () => ({ getCompilationInfo: async () => ({ messages: [] }) }),
    createRenderPipelineAsync: async descriptor => {
      compiled.push(descriptor.label);
      return { getBindGroupLayout() { return {}; } };
    },
    createBuffer() { return {}; }, createBindGroup() { return {}; }, createSampler() { return {}; },
    createTexture: () => ({ createView() { return {}; }, destroy() {} }),
    createCommandEncoder: () => ({ beginRenderPass: () => pass, finish() { return {}; } }),
    destroy() {},
  });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { gpu: {
    requestAdapter: async () => ({ requestDevice: async () => device }),
    getPreferredCanvasFormat: () => 'bgra8unorm',
  } } });
  const canvas = Object.assign(new EventTarget(), {
    clientWidth: 640, clientHeight: 640, width: 0, height: 0, dataset: {},
    getContext: () => ({ configure() {}, getCurrentTexture: () => ({ createView() { return {}; } }) }),
  });
  let params = { style: 'siri', ...stylePresets.siri };
  const errors = [];
  const stop = createOrbRenderer({ canvas, getTarget: () => ({ state: 'thinking', params, activationDuration: 0, transitionDuration: 0 }), onReady() {}, onError: error => errors.push(error) });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const step = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(performance.now())); };
  await flush();
  step();
  assert.deepEqual(compiled, ['orb-glass-liquid-pipeline'], 'Normal figures must not compile particle pipelines');
  assert.equal(draws, 1);
  params = { style: 'particleRibbon', ...stylePresets.particleRibbon };
  step(); await flush(); step();
  assert.equal(compiled.length, 3);
  assert.equal(draws, 3, 'Particle effect draws its offscreen and composite passes');
  step(); assert.equal(compiled.length, 3, 'Reuse particle pipelines');
  document.hidden = true; document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(frames.size, 0, 'Pause rendering in background');
  document.hidden = false; document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(frames.size, 1, 'Resume rendering when visible');
  stop(); assert.equal(frames.size, 0);
  assert.deepEqual(errors, []);
  console.log('Renderer: lazy particle compilation, pipeline reuse, visibility pause/resume, and cleanup passed.');
} finally { await server.close(); }
