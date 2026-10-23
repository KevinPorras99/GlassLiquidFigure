import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createServer } from "vite";

const server = await createServer({ appType: "custom", logLevel: "error", server: { middlewareMode: true, ws: false } });
try {
  const [audio, presets, uniforms, states, exports] = await Promise.all([
    "orb-audio", "presets", "orb-uniforms", "orb-states", "code-export",
  ].map(name => server.ssrLoadModule(`/src/${name}.ts`)));
  const wave = new Float32Array(2048).fill(0.08);
  for (const [band, hz] of [["low", 100], ["mid", 800], ["high", 6000]]) {
    const spectrum = new Float32Array(1024).fill(-Infinity);
    spectrum[Math.round(hz / 24000 * spectrum.length)] = -24;
    const levels = audio.analyzeAudioSpectrum(spectrum, wave, 48000);
    assert.ok(levels[band] > 0.2, `${band}: tone must be detected`);
    for (const other of ["low", "mid", "high"].filter(key => key !== band)) assert.equal(levels[other], 0, "Bands must remain isolated");
    assert.deepEqual(audio.analyzeAudioSpectrum(spectrum, new Float32Array(2048).fill(0.001), 48000), audio.silentBands(), "Background noise must not trigger motion");
  }
  assert.deepEqual(audio.analyzeAudioSpectrum(new Float32Array(0), wave, 48000), audio.silentBands());
  const input = new audio.OrbAudioInput();
  const impact = audio.createAudioImpactResponse();
  const kick = impact({ low: 1, mid: 1, high: 1, all: 1 }, 1 / 60);
  assert.ok(kick.low > 0 && kick.low < 1, 'Bass onset must create a bounded spring impulse');
  assert.ok(kick.mid > 0 && kick.mid < 1, 'Mids have a fast attack');
  assert.equal(kick.high, 1, 'Treble must catch transients immediately');
  const recoil = impact(audio.silentBands(), 1 / 60);
  assert.ok(recoil.low > kick.low, 'Bass spring carries momentum after a short hit');
  assert.ok(recoil.high < 1 && recoil.high > 0, 'Treble highlights release quickly');
  let settled;
  for (let i = 0; i < 240; i++) settled = impact(audio.silentBands(), 1 / 60);
  assert.deepEqual(settled, audio.silentBands(), 'Physical response returns to rest in silence');
  assert.ok(Object.values(impact({ low: NaN, mid: Infinity, high: -1, all: 3 }, NaN)).every(Number.isFinite));
  assert.deepEqual(input.read(NaN), audio.silentBands());
  input.stop();

  // Execute the shader's wave expression: silence is exact, each band vibrates,
  // and the vibration fades at the silhouette rather than distorting the shell.
  const shader = await readFile(new URL("../effect.wgsl", import.meta.url), "utf8");
  const waveBody = shader.match(/fn glsAudioWave\([^]*?\) -> f32 \{([^]*?)\n\}/)[1]
    .replace(/\blet\b/g, "const").replace(/\b(pow|max|sin)\(/g, "Math.$1(");
  const vibration = new Function("x", "t", "u", waveBody);
  for (const bands of [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }]) {
    const samples = Array.from({ length: 81 }, (_, index) => vibration((index - 40) / 40, 0.3, { audioBands: bands }));
    assert.ok(samples.every(Number.isFinite));
    assert.ok(samples[0] === 0);
    assert.ok(samples[80] === 0);
    if (bands.x + bands.y + bands.z === 0) assert.ok(samples.every(value => value === 0));
    else assert.ok(Math.max(...samples.map(Math.abs)) > 0.04, "Every band must visibly vibrate internal waves");
  }
  input.smoothed = { low: 0.5, mid: 0.5, high: 0.5, all: 0.5 };
  input.bandGain = { low: 2, mid: 1, high: 0 };
  assert.deepEqual(input.read(0), { low: 1, mid: 0.5, high: 0, all: 0.5 });
  input.gain = 0;
  assert.deepEqual(input.read(0), audio.silentBands(), "Zero sensitivity must disable all vibration");
  input.stop();
  assert.deepEqual(input.bands, audio.silentBands());

  await mkdir("output/audio-qa", { recursive: true });
  const nativeChecks = [];
  let nativeHelper = "";
  for (const style of presets.styleNames) {
    const physicalConfig = states.createOrbStateConfiguration({ ...presets.stylePresets[style], style, audioResponse: 'impact', orbitRingsEnabled: true });
    const physicalWeb = exports.createWebExport(physicalConfig, 'thinking');
    const physicalSnippet = physicalWeb.slice(physicalWeb.indexOf('const audioRules ='), physicalWeb.indexOf('function srgbToLinear'));
    const physicalApply = new Function(`${physicalSnippet}; return applyAudioUniforms;`)();
    if (style === 'siri') {
      const exportedResponse = new Function(`${physicalSnippet}; return createAudioImpactResponse;`)()();
      const editorResponse = audio.createAudioImpactResponse();
      for (const dt of [0, 1 / 120, 1 / 60, 1 / 30, 0.1, NaN]) {
        for (const bands of [{ low: 1, mid: 0.7, high: 0.4, all: 0.8 }, audio.silentBands()]) {
          assert.deepEqual(exportedResponse(bands, dt), editorResponse(bands, dt), 'Exported spring damping and transients must match the editor');
        }
      }
    }
    const physicalSeed = uniforms.createOrbUniformSnapshot(states.resolveOrbStateParams(physicalConfig, 'thinking'));
    for (const bands of [audio.silentBands(), { low: 1, mid: 0.7, high: 0.4, all: 0.8 }, { low: NaN, mid: Infinity, high: -1, all: 4 }]) {
      const actual = new Float32Array(physicalSeed), exported = new Float32Array(physicalSeed);
      audio.applyAudioUniforms(actual, bands); physicalApply(exported, bands);
      assert.deepEqual(actual, exported, 'Physical mode must match the exported runtime for every material');
      assert.deepEqual(Array.from(actual.slice(0, 188)), physicalSeed.slice(0, 188), 'Physical mode must preserve flow speed, wave bands and orbit rings');
      assert.ok(Array.from(actual).every(Number.isFinite));
      if (Object.values(bands).every(v => v === 0)) assert.deepEqual(Array.from(actual), physicalSeed);
      else assert.notDeepEqual(Array.from(actual), physicalSeed, 'Physical reaction works on all presets');
    }
    const config = states.createPresetOrbStateConfiguration(style);
    const web = exports.createWebExport(config, "thinking");
    const swift = exports.createSwiftExport(config, "thinking");
    const snippet = web.slice(web.indexOf("const audioRules ="), web.indexOf("function srgbToLinear"));
    const webApply = new Function(`${snippet}; return applyAudioUniforms;`)();
    nativeHelper = swift.slice(swift.indexOf("public struct LiquidOrbAudio"), swift.indexOf("public enum LiquidOrbState"));
    for (const state of ["idle", "thinking"]) {
      const seed = uniforms.createOrbUniformSnapshot(states.resolveOrbStateParams(config, state));
      for (const bands of [audio.silentBands(), { low: 1, mid: 0, high: 0, all: 0 }, { low: 0, mid: 1, high: 0, all: 0 }, { low: 0, mid: 0, high: 1, all: 0 }, { low: 1, mid: 0.7, high: 0.4, all: 0.8 }, { low: NaN, mid: Infinity, high: -1, all: 4 }]) {
        const actual = new Float32Array(seed), exported = new Float32Array(seed);
        audio.applyAudioUniforms(actual, bands);
        webApply(exported, bands);
        assert.deepEqual(actual, exported, `${style}/${state}: Web mismatch`);
        assert.ok([...actual].every(Number.isFinite));
        if (!audio.audioStyleStrengths[style] || Object.values(bands).every(v => v === 0)) {
          assert.deepEqual([...actual], seed, `${style}/${state}: unsupported or silence changed`);
        } else {
          assert.notDeepEqual([...actual], seed, `${style}/${state}: audio did not change uniforms`);
        }
        assert.deepEqual([...actual.slice(22, 152)], seed.slice(22, 152), "Audio changed palette/material settings");
        assert.deepEqual([...actual.slice(156)], seed.slice(156), "Audio must preserve aura colors and effects");
        const strength = audio.audioStyleStrengths[style] ?? 0;
        const safe = value => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0) * strength;
        assert.deepEqual(actual.slice(152, 156), new Float32Array([safe(bands.low), safe(bands.mid), safe(bands.high), safe(bands.all)]), "Shaders must receive real audio bands");
        if (Object.values(bands).every(Number.isFinite)) {
          nativeChecks.push(`do { var values: [Float] = ${JSON.stringify(seed)}; applyOrbAudio(&values, LiquidOrbAudio(low: ${bands.low}, mid: ${bands.mid}, high: ${bands.high}, all: ${bands.all})); let expected: [Float] = ${JSON.stringify([...actual])}; for i in 0..<values.count { precondition(abs(values[i] - expected[i]) < 0.00001, "${style}/${state} Swift mismatch") } }`);
        }
      }
    }
    for (const [enabled, reactive] of [[true, true], [true, false], [false, true]]) {
      const auraParams = { ...presets.stylePresets[style], style, auraEnabled: enabled, auraAudioEnabled: reactive };
      const auraConfig = states.createOrbStateConfiguration(auraParams);
      for (const state of ["idle", "thinking"]) {
        const seed = uniforms.createOrbUniformSnapshot(states.resolveOrbStateParams(auraConfig, state));
        for (const [bands, changedIndex] of [
          [audio.silentBands(), null],
          [{ low: 1, mid: 0, high: 0, all: 0 }, 142],
          [{ low: 0, mid: 1, high: 0, all: 0 }, 141],
          [{ low: 0, mid: 0, high: 1, all: 0 }, 143],
          [{ low: NaN, mid: Infinity, high: -1, all: 0 }, null],
        ]) {
          const actual = new Float32Array(seed), exported = new Float32Array(seed);
          audio.applyAudioUniforms(actual, bands);
          webApply(exported, bands);
          assert.deepEqual(actual, exported, "Aura audio must match Web export");
          for (const index of [140, 141, 142, 143]) {
            if (enabled && reactive && index === changedIndex) assert.ok(actual[index] > seed[index], "Each band must drive its aura effect");
            else assert.equal(actual[index], seed[index], "Disabled or silent aura must preserve settings");
          }
          assert.deepEqual([...actual.slice(144, 152)], seed.slice(144, 152), "Audio must preserve aura colors A/B");
          assert.deepEqual([...actual.slice(156)], seed.slice(156), "Audio must preserve aura color C, effect, and toggle");
          if (Object.values(bands).every(Number.isFinite)) nativeChecks.push(`do { var values: [Float] = ${JSON.stringify(seed)}; applyOrbAudio(&values, LiquidOrbAudio(low: ${bands.low}, mid: ${bands.mid}, high: ${bands.high}, all: ${bands.all})); let expected: [Float] = ${JSON.stringify([...actual])}; for i in 0..<values.count { precondition(abs(values[i] - expected[i]) < 0.00001, "${style}/${state} aura Swift mismatch") } }`);
        }
      }
    }
    if (style === "siri") {
      await writeFile("output/audio-qa/export.html", web);
      await writeFile("output/audio-qa/LiquidOrb.swift", swift);
    }
  }
  await writeFile("output/audio-qa/native-check.swift", nativeHelper + nativeChecks.join("\n") + '\nprint("Swift audio parity passed")\n');
  console.log(`Audio: all ${presets.styleNames.length} presets × both states verified; Web parity and invalid input checks passed.`);
} finally { await server.close(); }
