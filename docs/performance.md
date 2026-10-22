# Loading and data preparation optimizations

Measured against the same working tree with all 20 presets, before the optimization pass.

| Measurement | Before | After |
| --- | ---: | ---: |
| Static initial JavaScript, including module preloads | 602,087 bytes | 534,480 bytes |
| Static initial JavaScript, gzip | 182,880 bytes | 166,482 bytes |
| GPU uniform preparation, median of three 40,000-frame samples | 242.8 ms | 55.6 ms |

Static initial JavaScript excludes dynamically loaded modules, images, styles, and fonts. These are bundle measurements, not browser load-time or frame-rate measurements. The uniform timing is a local CPU microbenchmark; results vary by device.

Changes:

- Import the specific UI primitives that each control uses, keeping optional color-picker dependencies in their own chunks.
- Keep preview images as separate cacheable resources instead of embedding small images in JavaScript. Existing lazy image loading remains in place.
- Precompute the constant shader palette and reuse parsed colors in a cache bounded to 256 entries.
- Memoize resolved editor parameters and generated star positions when their inputs have not changed.
- Stop audio-meter animation callbacks while audio is off or the document is hidden, retaining the existing audio cleanup lifecycle.

Validation:

- All build checks passed: 20 presets across idle/thinking, editor/Web export parity, audio silence and invalid-input handling, renderer lifecycle, and sacred-shape intersections.
- Compared 2,080 uniform snapshots with the original writer, including changing colors, cache eviction, reused buffers, and enabled/disabled aura settings. All 168 float lanes matched bit for bit.
- Kept existing CSS coverage, rendering resolution, shader iterations, presets, and image contents unchanged during this pass.

Local comparison artifacts and the benchmark runner are under `output/`; generated outputs are ignored by Git.
