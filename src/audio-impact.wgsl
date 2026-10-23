// Physical response deforms only the figure. Orbit rings use untouched UVs.
fn physicalFigureUv(uv: vec2<f32>) -> vec2<f32> {
  if (u.auraEffect.w < 0.5 || max(u.physicalAudio.x, u.physicalAudio.y) <= 0.0) { return uv; }
  let bass = u.physicalAudio.x;
  let mids = u.physicalAudio.y;
  let clock = u.auraEffect.z;
  let vibration = vec2<f32>(sin(clock * 67.0), sin(clock * 83.0 + 0.7)) * mids * 0.003;
  let scale = vec2<f32>(1.0 + bass * 0.11, 1.0 - bass * 0.065);
  return (uv - vec2<f32>(0.5) - vibration) / scale + vec2<f32>(0.5);
}

fn physicalFigureColor(color: vec4<f32>, uv: vec2<f32>) -> vec4<f32> {
  if (u.auraEffect.w < 0.5 || max(u.physicalAudio.z, u.physicalAudio.w) <= 0.0) { return color; }
  let p = (uv * 2.0 - 1.0) * u.size / glsRenderMinSize() / max(u.radius, 0.05);
  let catchlight = pow(max(1.0 - length(p - vec2<f32>(-0.35, -0.4)) / 0.9, 0.0), 8.0);
  let reflection = u.physicalAudio.z * catchlight * 0.75;
  let energy = u.physicalAudio.w * 0.07;
  let rgb = color.rgb * (1.0 + energy) + u.specColor.rgb * reflection * color.a;
  return vec4<f32>(min(rgb, vec3<f32>(color.a)), color.a);
}
