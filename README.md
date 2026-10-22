# Liquid Orb Editor

A real-time liquid glass orb editor built with React, WebGPU/WGSL, and Toolcraft UI.


### Features

- 18 editable animated orb presets, including Visionary Fractal and Infinite Gaze with optional random eye blinking
- Shape selector: orb, cube in perspective, rhomboid, trapezoid, triangle, pentagon, hexagon, octagon, Flower of Life, Seed of Life, Vesica Piscis, and Metatron’s Cube; preserved in share links and Web/Swift exports
- English interface
- Controls for color, speed, shape, glass refraction, and outer glow
- Optional twinkling star background with count and brightness controls, saved in share links and Web/Swift exports
- Optional animated aura blending three colors with independent intensity, size, and motion controls, plus Flow, Pulse, Waves, Spiral, and a rotating Eye Ring effect
- Optional aura audio response on every material: bass expands the halo, mids increase brightness, and treble accelerates effects
- Dedicated orb preview and in-context scene preview
- Shareable configurations stored in the URL hash
- Standalone Web and SwiftUI/Metal code export
- Identical parameter snapshots across Web and SwiftUI exports
- The same orb animation output from both orb and scene preview modes

### Audio response

Use **Audio response** in the right-side control panel to start the microphone or select a local audio file, then adjust the sensitivity (0–200%), smoothness, and Bass/Mids/Treble response. Live meters show each frequency band. Bass drives broad internal waves and contour motion, mids drive faster pulses, and treble adds fine vibration and highlights. Real band levels reach the shader to vibrate the internal waves like an equalizer. Audio response is available for Siri Wave, Voice Membrane, Aurora Veil, Neural Plasma, Prismatic Field, Violet Core, Infinite Gaze, and Visionary Fractal. For Infinite Gaze and Visionary Fractal, bass expands the pattern, mids sway its rotation, and treble lifts its highlights. Other presets remain unchanged; switching to an unsupported preset stops the active audio input. Audio is analyzed locally in the browser and is never uploaded. Microphone input is not played back.

Low, mid, and high frequency bands plus overall energy drive the contour, internal distortion, highlights, and motion speed. Linear spectral energy separates the bands, with a noise gate and configurable fast attack/slow release to prevent jitter. Pausing audio eases the orb back to its base appearance; stopping the input or setting sensitivity to 0 restores the original preset parameters. Audio modulation is applied after state transitions and does not overwrite presets, colors, or URL parameters. This feature modulates the existing procedural animation; it does not embed or reproduce the reference site's fluid solver.

Web and Swift exports use the same audio-to-parameter mapping. The host application supplies audio capture, frequency analysis, smoothing, and sensitivity. Pass smoothed values from 0 to 1 after applying sensitivity, and pass zero values when audio stops. Exported pages do not request microphone access automatically or bundle the currently selected audio file. Audio source, sensitivity, smoothness, and band response are session-only editor settings and are not included in share links.

```js
window.liquidOrb.setAudioBands({ low: 0.5, mid: 0.3, high: 0.1, all: 0.4 });
window.liquidOrb.setAudioBands(); // Stop audio response
```

```swift
LiquidOrbView(
    state: .thinking,
    audio: LiquidOrbAudio(low: 0.5, mid: 0.3, high: 0.1, all: 0.4)
)
```

Run `node scripts/verify-audio.mjs` to verify preset support, silence behavior, invalid input handling, and Web mapping parity. The script writes Swift parity fixtures to `output/audio-qa/`; run `xcrun swift output/audio-qa/native-check.swift` to verify the Swift mapping.

### Maintenance status

This project is under active development. Presets, motion models, editor stability, and parity between WebGPU and SwiftUI/Metal output are continuously refined. OpenAI Codex assists with implementation, regression testing, and releases.

### Local development

Requires Node.js 22, pnpm 11, and a browser with WebGPU support.

```bash
pnpm install
pnpm dev
```

Production build and preview:

```bash
pnpm build
pnpm preview
```

### Project structure

- `src/presets.ts`: preset definitions and default parameters
- `src/orb-uniforms.ts`: the single mapping from editor parameters to GPU uniforms
- `src/orb-renderer.ts`: WebGPU renderer
- `src/orb-audio.ts`: local audio analysis and preset-specific response mapping
- `src/code-export.ts`: Web and SwiftUI exporters
- `effect.wgsl`: browser shader
- `effect.metal`: Metal shader used by SwiftUI exports

### License

Project code is licensed under the [MIT License](LICENSE). Toolcraft UI code in `src/toolcraft` retains its original MIT copyright notice; see [TOOLCRAFT_LICENSE.md](TOOLCRAFT_LICENSE.md).

---

Additional procedural presets: Galaxy Core (spiral dust and stars), Mystic Mist (layered drifting mist), and Crystal Light (moving caustic highlights). All three support figure shapes, glass shells, aura, state transitions, and Web/SwiftUI exports.

