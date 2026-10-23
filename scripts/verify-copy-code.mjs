import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { createServer } from 'vite';

const server = await createServer({ appType: 'custom', logLevel: 'error', server: { middlewareMode: true, ws: false } });
try {
  const { createWebExport, createSwiftExport } = await server.ssrLoadModule('/src/code-export.ts');
  const { createOrbStateConfiguration, resolveOrbStateParams } = await server.ssrLoadModule('/src/orb-states.ts');
  const { createOrbUniformSnapshot } = await server.ssrLoadModule('/src/orb-uniforms.ts');
  const { effectDefaults } = await server.ssrLoadModule('/src/presets.ts');
  const { orbShaderSource } = await server.ssrLoadModule('/src/shader-source.ts');
  const preview = { pitch: 0.42, yaw: -1.3, view3d: true, motionPhase: 17.25, ringTime: 8, scale: 1.2 };
  for (const autoRotate of [false, true]) {
    const config = createOrbStateConfiguration({ ...effectDefaults, shape: 'metatron', orbitRingsEnabled: true, autoRotate, rotationSpeed: 0.7, orbitRingEyeColor: '#FF00AA' });
    const captured = { ...preview, params: { ...resolveOrbStateParams(config, 'thinking'), exposure: 0.57 } };
    const html = createWebExport(config, 'thinking', captured);
    const script = html.match(/<script type="module">([^]*?)<\/script>/)[1];
    let frame, sent;
    const errors = [];
    const pass = { setPipeline() {}, setBindGroup() {}, draw() {}, end() {} };
    const device = Object.assign(new EventTarget(), {
      lost: new Promise(() => {}), destroy() {},
      queue: { writeBuffer(_buffer, _offset, values) { sent = Array.from(values); }, submit() {} },
      createShaderModule({ code }) {
        assert.equal(code, orbShaderSource, 'Copy Code must use the exact editor shader');
        return { getCompilationInfo: async () => ({ messages: [] }) };
      },
      createRenderPipeline: () => ({ getBindGroupLayout: () => ({}) }),
      createBuffer: () => ({}), createBindGroup: () => ({}), createSampler: () => ({}),
      createCommandEncoder: () => ({ beginRenderPass: () => pass, finish() {} }),
    });
    const canvas = Object.assign(new EventTarget(), {
      clientWidth: 640, clientHeight: 640, width: 0, height: 0,
      getContext: () => ({ configure() {}, getCurrentTexture: () => ({ createView: () => ({}) }) }),
    });
    const context = {
      console: { error: error => errors.push(error) }, performance: { now: () => 0 }, Float32Array,
      document: { querySelector: selector => selector === '#orb' ? canvas : {} },
      window: Object.assign(new EventTarget(), { devicePixelRatio: 1 }),
      navigator: { gpu: { requestAdapter: async () => ({ requestDevice: async () => device }), getPreferredCanvasFormat: () => 'rgba8unorm' } },
      GPUBufferUsage: { UNIFORM: 1, COPY_DST: 2 }, GPUTextureUsage: { RENDER_ATTACHMENT: 1, TEXTURE_BINDING: 2 },
      requestAnimationFrame: callback => { frame = callback; return 1; }, cancelAnimationFrame() {},
    };
    runInNewContext(script.replace('start().catch(', 'globalThis.started = start().catch('), context);
    await context.started;
    assert.deepEqual(errors, []);
    frame(0);
    const expected = createOrbUniformSnapshot(captured.params);
    expected[0] = 640; expected[1] = 640;
    expected[2] = Math.fround(preview.motionPhase / Math.max(expected[3], 0.001));
    expected[137] = Math.fround(preview.pitch); expected[138] = Math.fround(preview.yaw); expected[139] = 1;
    expected[162] = preview.ringTime;
    assert.deepEqual(sent, expected, 'The first exported frame must match editor parameters, camera and animation phase');
    context.window.liquidOrb.setAudioBands({ low: 1, mid: 1, high: 1, all: 1 });
    frame(100);
    assert.ok(Math.abs(sent[162] - 8.1) < 1e-6, 'Exported ring clock advances only with elapsed time, regardless of audio');
    assert.ok(Math.abs(sent[138] - (preview.yaw + (autoRotate ? 0.07 : 0))) < 1e-6);
    assert.ok(html.includes('transform: scale(1.2)'), 'Export preserves preview zoom');
    const swift = createSwiftExport(config, 'thinking', preview);
    assert.ok(swift.includes('private var motionPhase: CFTimeInterval = 17.25'));
    assert.ok(swift.includes('private var yaw: Float = -1.3'));
    assert.ok(swift.includes('.scaleEffect(1.2)'));
    assert.ok(swift.includes('solidColor(in.uv, u)'), 'Swift must render the same 3D solid view');
  }
  console.log('Copy Code: exported runtime matches editor uniforms, shader, camera, zoom, animation phase and automatic rotation.');
} finally { await server.close(); }
