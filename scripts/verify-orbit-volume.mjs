import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const shader = await readFile(new URL('../src/orbit-rings.wgsl', import.meta.url), 'utf8');
const radiusBody = shader.match(/fn orbitRingRadius\([^]*?\) -> f32 \{([^]*?)\n\}/)[1];
const radius = new Function('index', 'width', radiusBody);
// Every tube point is within width + ripple of its center radius.
// Rotation preserves distance from the origin, so disjoint radial bounds
// guarantee no collisions at any angle or time, including maximum width.
for (let step = 0; step <= 130; step++) {
  const width = 0.03 + step * 0.001;
  for (let index = 0; index < 2; index++) {
    const outer = radius(index, width) + 0.045 + width;
    const inner = radius(index + 1, width) - 0.045 - width;
    assert.ok(inner - outer >= 0.065 - 1e-10, 'Rotating ring volumes must retain a positive gap');
  }
}
const body = shader.match(/fn orbitRingDistance\([^]*?\) -> f32 \{([^]*?)\n\}/)[1];
const distance = new Function('p', 'index', 'phase', 'width', 'length', 'vec2', 'orbitRingRadius', body
  .replace(/vec2<f32>/g, 'vec2')
  .replace(/\b(sin|cos|atan2)\(/g, 'Math.$1('));
const field = (x, y, z, phase = 0) => distance(
  { x, y, z, xy: [x, y] }, 0, phase, 0.09,
  value => Math.hypot(...value), (...value) => value, radius,
);
assert.ok(field(1.28, 0, 0.035) < 0, 'Orbit ribbons have physical depth');
assert.ok(field(1.28, 0, 0.09) > 0, 'Depth stays bounded');
// An exactly edge-on ray must still hit the rounded tube.
let travel = 0, hit = false;
for (let i = 0; i < 80; i++) {
  const d = field(4 - travel, 0, 0.02);
  if (d < 0.001) { hit = true; break; }
  travel += Math.max(d * 0.85, 0.00035);
}
assert.ok(hit, 'Edge-on rings must not collapse into a plane');

const blinkBody = shader.match(/  let eyeIndex =([^]*?)\n  let eyeAlmond/)[1];
const aperture = new Function('u', 'index', 'angle', 'phase', 'fract', 'smoothstep',
  `let eyeIndex =${blinkBody}\nreturn aperture;`.replace(/\bfloor\(/g, 'Math.floor('));
const smoothstep = (a, b, value) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const eye = (time, index = 0) => aperture({ auraEffect: { z: time } }, index, 0, 0, v => v - Math.floor(v), smoothstep);
assert.equal(eye(0), 1, 'Eyelid starts open');
assert.ok(eye(0.12) < 0.02, 'Eyelid closes over the iris');
assert.equal(eye(0.5), 1, 'Eyelid reopens');
assert.notEqual(eye(0.12), eye(0.12, 1), 'Different rings blink at staggered times');
console.log('Orbit rings: collision-free shells across 131 widths, physical depth, edge-on intersection and staggered blinking passed.');
