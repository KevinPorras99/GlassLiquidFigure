import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ appType: 'custom', logLevel: 'error', server: { middlewareMode: true, ws: false } });
try {
  const { createOrbRenderer } = await server.ssrLoadModule('/src/orb-renderer.ts');
  const { stylePresets } = await server.ssrLoadModule('/src/presets.ts');
  const { createPresetOrbStateConfiguration, resolveOrbStateParams } = await server.ssrLoadModule('/src/orb-states.ts');
  const { SliderControl } = await server.ssrLoadModule('/src/toolcraft/ui/components/controls/slider/slider-control.tsx');
  const { formatSliderValue, formatSliderValueWithUnit } = await server.ssrLoadModule('/src/toolcraft/ui/components/controls/slider/slider-value.ts');
  for (const value of [undefined, null, Number.NaN, Infinity, '0.35']) {
    assert.equal(formatSliderValue(value, 0.05), '0');
    assert.equal(formatSliderValueWithUnit(value, 0.05, 's'), '0s');
  }
  assert.equal(formatSliderValue(0.35, 0.05), '0.35');
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const legacyConfiguration = createPresetOrbStateConfiguration('siri');
  delete legacyConfiguration.shared.rotationSpeed;
  delete legacyConfiguration.shared.autoRotate;
  const restored = resolveOrbStateParams(legacyConfiguration, 'thinking');
  assert.equal(restored.rotationSpeed, 0.35, 'Older editor state receives default rotation speed');
  for (const value of [undefined, Number.NaN, Infinity]) {
    assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(SliderControl, {
      name: 'Rotation Speed', value, baseValue: restored.rotationSpeed, min: 0.1, max: 2, step: 0.05,
    })), 'Missing or invalid slider values must not crash the editor');
  }
  const { SwitchControl } = await server.ssrLoadModule('/src/toolcraft/ui/components/controls/boolean/boolean-controls.tsx');
  for (const checked of [undefined, null, false, true]) {
    const markup = renderToStaticMarkup(React.createElement(SwitchControl, { name: 'Auto Rotate', checked }));
    assert.ok(markup.includes(`aria-checked="${checked === true}"`), 'Switch always receives a controlled boolean');
  }
  legacyConfiguration.shared.autoRotate = undefined;
  legacyConfiguration.shared.rotationSpeed = Number.NaN;
  legacyConfiguration.profiles.thinking.autoRotate = undefined;
  const normalized = resolveOrbStateParams(legacyConfiguration, 'thinking');
  assert.equal(normalized.autoRotate, false);
  assert.equal(normalized.rotationSpeed, 0.35);
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
  let lastUniforms;
  let now = 0;
  const pass = { setPipeline() {}, setBindGroup() {}, draw() { draws++; }, end() {} };
  const device = Object.assign(new EventTarget(), {
    lost: new Promise(() => {}),
    queue: { writeBuffer(_buffer, _offset, values) { lastUniforms = new Float32Array(values); }, submit() {} },
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
  const step = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now += 16)); };
  // Dynamic shader imports can require I/O; a single event-loop tick is not readiness.
  const deadline = Date.now() + 10000;
  while (frames.size === 0 && errors.length === 0 && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.deepEqual(errors, [], 'Shader loading must succeed');
  assert.ok(frames.size > 0, 'Renderer must schedule its first frame after loading the shader');
  step();
  assert.deepEqual(compiled, ['orb-glass-liquid-pipeline'], 'Normal figures must not compile particle pipelines');
  assert.equal(draws, 1);
  params = { ...params, autoRotate: true, rotationSpeed: 0.5 };
  step();
  assert.equal(lastUniforms[139], 1, 'Automatic rotation enables the 3D preview');
  const firstAngle = lastUniforms[138];
  step();
  assert.ok(lastUniforms[138] > firstAngle, 'Automatic rotation advances with frame time');
  params = { ...params, autoRotate: false };
  const stoppedAngle = lastUniforms[138];
  step();
  assert.equal(lastUniforms[138], stoppedAngle, 'Disabling rotation retains the current angle');
  draws = 1;
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
  console.log('Renderer: lazy particle compilation, pipeline reuse, visibility pause/resume, automatic rotation, and cleanup passed.');
} finally { await server.close(); }
