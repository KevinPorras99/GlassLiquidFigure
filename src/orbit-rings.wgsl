// Rounded elliptical tubes give the orbit ribbons physical depth from every angle.
struct OrbitRingHit {
  color: vec4<f32>,
  depth: f32,
};

fn orbitRingRotate(p: vec3<f32>, yaw: f32, tilt: f32) -> vec3<f32> {
  let q = vec3<f32>(cos(yaw) * p.x - sin(yaw) * p.z, p.y, sin(yaw) * p.x + cos(yaw) * p.z);
  return vec3<f32>(q.x, cos(tilt) * q.y + sin(tilt) * q.z, -sin(tilt) * q.y + cos(tilt) * q.z);
}

// Disjoint spherical shells stay separated under any independent rotation.
fn orbitRingRadius(index: f32, width: f32) -> f32 {
  return 1.28 + index * (2.0 * (width + 0.045) + 0.065);
}

fn orbitRingDistance(p: vec3<f32>, index: f32, phase: f32, width: f32) -> f32 {
  let angle = atan2(p.y, p.x);
  let radius = orbitRingRadius(index, width) + 0.045 * sin(angle * 9.0 + phase + index);
  let localWidth = width * (0.8 + 0.2 * cos(angle * 9.0 + phase));
  // An elliptical cross-section has both a broad patterned face and rounded sides.
  return (length(vec2<f32>(length(p.xy) - radius, p.z / 0.62)) - localWidth) / 2.2;
}

fn orbitRingHit(uv: vec2<f32>, index: f32) -> OrbitRingHit {
  var hit: OrbitRingHit;
  hit.color = vec4<f32>(0.0);
  hit.depth = 100.0;
  // auraEffect.z stores a dedicated clock unaffected by audio-driven flow time.
  let phase = u.auraEffect.z * u.orbitRings.z;
  let yaw = phase * (0.65 + index * 0.17) + index * 2.094 + u.shape.z;
  let tilt = 0.65 + index * 0.75 + sin(phase * 0.4 + index) * 0.22 + u.shape.y;
  let screen = (uv * 2.0 - 1.0) * u.size / glsRenderMinSize();
  let origin = orbitRingRotate(vec3<f32>(0.0, 0.0, 4.0), yaw, tilt);
  let ray = orbitRingRotate(normalize(vec3<f32>(screen.x / max(u.radius, 0.05), -screen.y / max(u.radius, 0.05), -4.0)), yaw, tilt);
  let width = clamp(u.orbitRings.w, 0.03, 0.16);
  // Skip rays outside the bounding sphere and start at its front surface.
  let projection = dot(origin, ray);
  let bound = orbitRingRadius(index, width) + 0.045 + width + 0.02;
  let discriminant = projection * projection - dot(origin, origin) + bound * bound;
  if (discriminant < 0.0) { return hit; }
  var travel = max(-projection - sqrt(discriminant), 0.0);
  let exit = -projection + sqrt(discriminant);
  let epsilon = max(0.0007, 0.65 / (glsRenderMinSize() * max(u.radius, 0.05)));
  var found = false;
  for (var step = 0; step < 80; step++) {
    let distance = orbitRingDistance(origin + ray * travel, index, phase, width);
    if (distance < epsilon) { found = true; break; }
    travel += max(distance * 0.85, epsilon * 0.35);
    if (travel > exit) { break; }
  }
  if (!found) { return hit; }
  let p = origin + ray * travel;
  let angle = atan2(p.y, p.x);
  let radius = orbitRingRadius(index, width) + 0.045 * sin(angle * 9.0 + phase + index);
  let localWidth = width * (0.8 + 0.2 * cos(angle * 9.0 + phase));
  let edge = abs(length(p.xy) - radius) / localWidth;
  let alpha = 1.0;
  let e = 0.001;
  let normal = normalize(vec3<f32>(
    orbitRingDistance(p + vec3<f32>(e, 0.0, 0.0), index, phase, width) - orbitRingDistance(p - vec3<f32>(e, 0.0, 0.0), index, phase, width),
    orbitRingDistance(p + vec3<f32>(0.0, e, 0.0), index, phase, width) - orbitRingDistance(p - vec3<f32>(0.0, e, 0.0), index, phase, width),
    orbitRingDistance(p + vec3<f32>(0.0, 0.0, e), index, phase, width) - orbitRingDistance(p - vec3<f32>(0.0, 0.0, e), index, phase, width)
  ));
  // Repeating almond eyes inside a gold-edged, rippling turquoise ribbon.
  let along = fract(angle / 6.2831853 * 12.0 - phase * 0.14 + index * 0.3) * 2.0 - 1.0;
  let across = (length(p.xy) - radius) / localWidth;
  let almond = abs(across) / max(0.13, 0.72 * (1.0 - along * along));
  let bandPhase = min(almond, 2.0) * 5.5 + sin(angle * 3.0 - phase) * 0.4;
  let bands = 0.5 + 0.5 * cos(bandPhase);
  var color = mix(u.orbitRingColorA.rgb, u.orbitRingColorB.rgb, bands);
  color = mix(color, u.orbitRingColorA.rgb * 0.3, 0.35 * (0.5 + 0.5 * sin(bandPhase * 1.7)));
  // Short staggered blinks run independently of orbital speed.
  let eyeIndex = floor(angle / 6.2831853 * 12.0 - phase * 0.14 + index * 0.3);
  let blinkCycle = fract((u.auraEffect.z + index * 0.73 + eyeIndex * 0.19) / 4.8);
  let blink = smoothstep(0.0, 0.025, blinkCycle) * (1.0 - smoothstep(0.025, 0.075, blinkCycle));
  let aperture = 1.0 - blink * 0.985;
  let eyeAlmond = abs(across) / max(0.008, 0.72 * (1.0 - along * along) * aperture);
  let eyeMask = 1.0 - smoothstep(0.88, 1.0, eyeAlmond);
  let eyeLine = 1.0 - smoothstep(0.035, 0.10, abs(eyeAlmond - 1.0));
  color = mix(color, u.orbitRingEdgeColor.rgb, eyeLine);
  let iris = length(vec2<f32>(along * 2.8, across * 1.6 / max(aperture, 0.015)));
  color = mix(color, u.orbitRingEyeColor.rgb, (1.0 - smoothstep(0.28, 0.38, iris)) * eyeMask);
  color = mix(color, u.orbitRingEyeColor.rgb * 0.025, (1.0 - smoothstep(0.10, 0.19, iris)) * eyeMask);
  let rim = smoothstep(0.78, 0.91, edge);
  color = mix(color, u.orbitRingEdgeColor.rgb, rim);
  let light = orbitRingRotate(normalize(vec3<f32>(-0.4, 0.7, 1.0)), yaw, tilt);
  let diffuse = 0.38 + 0.62 * max(dot(normal, light), 0.0);
  let specular = pow(max(dot(normal, normalize(light - ray)), 0.0), 32.0);
  color = color * diffuse + mix(u.orbitRingEdgeColor.rgb, vec3<f32>(1.0), 0.4) * specular * 0.55;
  hit.color = vec4<f32>(color * alpha, alpha);
  hit.depth = travel;
  return hit;
}

fn orbitRingOver(front: vec4<f32>, back: vec4<f32>) -> vec4<f32> {
  return front + back * (1.0 - front.a);
}

fn orbitRingsColor(base: vec4<f32>, uv: vec2<f32>) -> vec4<f32> {
  if (u.orbitRings.x < 0.5) { return base; }
  var a = orbitRingHit(uv, 0.0);
  var b: OrbitRingHit;
  b.color = vec4<f32>(0.0); b.depth = 100.0;
  var c = b;
  if (u.orbitRings.y > 1.5) { b = orbitRingHit(uv, 1.0); }
  if (u.orbitRings.y > 2.5) { c = orbitRingHit(uv, 2.0); }
  // Sort all intersections, then place the figure between back/front arcs.
  if (a.depth < b.depth) { let temp = a; a = b; b = temp; }
  if (b.depth < c.depth) { let temp = b; b = c; c = temp; }
  if (a.depth < b.depth) { let temp = a; a = b; b = temp; }
  let screen = (uv * 2.0 - 1.0) * u.size / glsRenderMinSize() / max(u.radius, 0.05);
  let ray = normalize(vec3<f32>(screen.x, -screen.y, -4.0));
  let figureDepth = -4.0 / ray.z;
  var behind = vec4<f32>(0.0);
  var front = vec4<f32>(0.0);
  if (a.depth >= figureDepth) { behind = orbitRingOver(a.color, behind); }
  else { front = orbitRingOver(a.color, front); }
  if (b.depth >= figureDepth) { behind = orbitRingOver(b.color, behind); }
  else { front = orbitRingOver(b.color, front); }
  if (c.depth >= figureDepth) { behind = orbitRingOver(c.color, behind); }
  else { front = orbitRingOver(c.color, front); }
  return orbitRingOver(front, orbitRingOver(base, behind));
}
