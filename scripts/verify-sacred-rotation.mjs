import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const wgsl = await readFile(new URL('../effect.wgsl', import.meta.url), 'utf8');
const shader = await readFile(new URL('../src/shader-source.ts', import.meta.url), 'utf8');
// Evaluate the actual outline definitions, including every Metatron segment.
const body = wgsl.match(/fn glsSacredDistance\(p: vec2<f32>\) -> f32 \{([\s\S]*?)\n\}/)[1];
const segment = (p, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  const h = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / Math.max(dx * dx + dy * dy, 0.00001)));
  return Math.hypot(p.x - ax - dx * h, p.y - ay - dy * h);
};
const outline = new Function('p', 'u', 'glsSacredSegment', body
  .replace(/\bvar\b/g, 'let').replace(/\b(min|abs|sqrt)\(/g, 'Math.$1('));
assert.match(shader, /if \(sacred\) \{ planarDistance = glsSacredDistance\(p.xy\) \/ 12\.0;/);
const depth = Number(shader.match(/let depth = select\(0\.28, ([\d.]+), sacred\)/)[1]);
const bevel = Number(shader.match(/let bevel = select\(0\.025, ([\d.]+), sacred\)/)[1]);
assert.ok(depth <= 0.018, 'Sacred outlines must stay thin when viewed from the side');
assert.ok(bevel <= 0.002, 'Bevel must preserve the original outline width');
const rotate = ([x, y, z], yaw, pitch) => {
  const a = Math.cos(yaw) * x - Math.sin(yaw) * z;
  const b = Math.sin(yaw) * x + Math.cos(yaw) * z;
  return [a, Math.cos(pitch) * y + Math.sin(pitch) * b, -Math.sin(pitch) * y + Math.cos(pitch) * b];
};
for (const [shape, x] of [[8, 0.75], [9, 0.72], [11, 0.8]]) {
  const distance = ([px, py, pz]) => {
    const planar = outline({ x: px, y: py }, { shape: { x: shape } }, segment) / 12;
    const z = Math.abs(pz) - depth;
    return Math.min(Math.max(planar, z), 0) + Math.hypot(Math.max(planar, 0), Math.max(z, 0)) - bevel;
  };
  for (let yaw = 0; yaw < 16; yaw++) for (let pitch = 0; pitch < 8; pitch++) {
    const origin = rotate([0, 0, 4], yaw * Math.PI / 8, pitch * Math.PI / 4);
    const direction = [x - origin[0], -origin[1], -origin[2]];
    const length = Math.hypot(...direction);
    const ray = direction.map(value => value / length);
    let travel = 0, hit = false;
    for (let i = 0; i < 96; i++) {
      const d = distance(origin.map((value, axis) => value + ray[axis] * travel));
      if (d < 0.002) { hit = true; break; }
      travel += Math.max(d * 0.65, 0.001);
      if (travel > 7) break;
    }
    assert.ok(hit, `Shape ${shape} disappeared at yaw ${yaw}, pitch ${pitch}`);
  }
}
console.log('Sacred figures: ray intersections passed at 128 orientations per shape.');
