import effectSource from "../effect.wgsl?raw";

const vertexAndFragment = `

// Sample one color per character cell, then draw a 5x5 ASCII glyph.
fn asciiCellSize() -> vec2<f32> {
  return vec2<f32>(0.65, 1.0) * clamp(u.renderViewport.z, 5.0, 24.0) * max(glsRenderMinSize() / 700.0, 0.75);
}
fn asciiUv(uv: vec2<f32>) -> vec2<f32> {
  if (u.renderViewport.y < 0.5) { return uv; }
  let cell = asciiCellSize();
  return clamp((floor(uv * u.size / cell) + 0.5) * cell / u.size, vec2<f32>(0.0), vec2<f32>(1.0));
}
fn asciiColor(color: vec4<f32>, uv: vec2<f32>) -> vec4<f32> {
  if (u.renderViewport.y < 0.5) { return color; }
  let brightness = dot(color.rgb / max(color.a, 0.001), vec3<f32>(0.2126, 0.7152, 0.0722));
  let glyphs = array<u32, 8>(4194304u, 131200u, 14336u, 145536u, 18185553u, 1016800u, 11512810u, 15398446u);
  let glyph = glyphs[u32(clamp(sqrt(max(brightness, 0.0)) * 7.0, 0.0, 7.0))];
  let local = fract(uv * u.size / asciiCellSize());
  let pixel = vec2<u32>(floor(local * vec2<f32>(6.0, 7.0)));
  let bit = min(pixel.y * 5u + pixel.x, 31u);
  let ink = select(0.0, 1.0, pixel.x < 5u && pixel.y < 5u && ((glyph >> bit) & 1u) == 1u);
  return color * ink;
}

struct VOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) i: u32) -> VOut {
  var p = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0),
  );
  var out: VOut;
  out.pos = vec4<f32>(p[i], 0.0, 1.0);
  let uv01 = (p[i] + vec2<f32>(1.0)) * 0.5;
  out.uv = vec2<f32>(uv01.x, 1.0 - uv01.y);
  return out;
}

fn figureColor(in: VOut) -> vec4<f32> {
  let c = orbGlassLiquidAnim(in.uv);

  let fc = vec2<f32>(in.uv.x, 1.0 - in.uv.y) * u.size;
  let uv = (2.0 * fc - u.size) / glsRenderMinSize();
  let rad = max(u.radius, 0.05);
  let t = u.time * u.speed;
  let contourRad = rad * glsContourScale(uv, t, u.contourDeform);
  let q = (2.0 * fc - u.size) / u.size;
  let fitEnd = 1.0;
  let fitFeather = 2.0 / glsRenderMinSize();
  let fitStart = select(min(mix(contourRad, fitEnd, 0.5), fitEnd - fitFeather), fitEnd - fitFeather, u.aura.x > 0.5);
  let fit = 1.0 - smoothstep(fitStart, fitEnd, max(abs(q.x), abs(q.y)));
  return vec4<f32>(c.rgb * fit, c.a * fit);
}

const PR_U_SEGMENTS: u32 = 384u;
const PR_V_SEGMENTS: u32 = 96u;
const PR_PARTICLES_PER_LAYER: u32 = PR_U_SEGMENTS * PR_V_SEGMENTS;

struct RibbonOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) local: vec2<f32>,
  @location(1) color: vec3<f32>,
  @location(2) opacity: f32,
};

fn prHash(value: f32) -> f32 {
  return fract(sin(value * 12.9898 + 78.233) * 43758.5453);
}

fn prRotateX(p: vec3<f32>, angle: f32) -> vec3<f32> {
  let c = cos(angle);
  let s = sin(angle);
  return vec3<f32>(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

fn prRotateY(p: vec3<f32>, angle: f32) -> vec3<f32> {
  let c = cos(angle);
  let s = sin(angle);
  return vec3<f32>(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

fn prCurve(theta: f32, layer: f32, phase: f32) -> vec3<f32> {
  let local = theta + layer * 0.11;
  let foldPhase = 2.0 * local + phase * (0.72 + layer * 0.025);
  let fold = clamp(u.ribbonFold, 0.0, 1.2);
  let radial = 0.4 + (0.085 + fold * 0.04) * cos(foldPhase);
  let orbit = local + phase * 0.13
              + sin(local - phase * 0.22 + layer) * fold * 0.13;
  let vertical = (0.235 + fold * 0.085) * sin(foldPhase)
                 + 0.055 * sin(local * 3.0 - phase * 0.46 + layer * 0.7);
  return vec3<f32>(radial * cos(orbit), vertical, radial * sin(orbit));
}

fn prPalette(valueIn: f32) -> vec3<f32> {
  let value = fract(valueIn) * 4.0;
  if (value < 1.0) { return mix(u.colorA.rgb, u.colorB.rgb, value); }
  if (value < 2.0) { return mix(u.colorB.rgb, u.colorC.rgb, value - 1.0); }
  if (value < 3.0) { return mix(u.colorC.rgb, u.colorD.rgb, value - 2.0); }
  return mix(u.colorD.rgb, u.colorA.rgb, value - 3.0);
}

@vertex
fn ribbon_vs_main(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
) -> RibbonOut {
  var corners = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
  );
  let layerIndex = instanceIndex / PR_PARTICLES_PER_LAYER;
  let particleIndex = instanceIndex % PR_PARTICLES_PER_LAYER;
  let uIndex = particleIndex / PR_V_SEGMENTS;
  let vIndex = particleIndex % PR_V_SEGMENTS;
  let layer = f32(layerIndex);
  let random = prHash(f32(instanceIndex));
  let activeLayer = layer < floor(clamp(u.ribbonCount, 2.0, 6.0) + 0.5);

  let uCoord = (f32(uIndex) + prHash(f32(instanceIndex) + 11.0) * 0.56)
               / f32(PR_U_SEGMENTS);
  let vCoord = (f32(vIndex) + prHash(f32(instanceIndex) + 29.0) * 0.46)
               / f32(PR_V_SEGMENTS);
  let strip = vCoord * 2.0 - 1.0;
  let t = u.time * u.speed;
  let phase = t * 0.48;
  let arc = fract(uCoord + layer * 0.211 - phase * 0.019);
  let arcLength = 0.76 + 0.055 * sin(t * 0.23 + layer * 1.71);
  let arcPosition = arc / arcLength;
  let arcEnvelope = smoothstep(0.0, 0.075, arcPosition)
                    * (1.0 - smoothstep(0.88, 1.0, arcPosition));
  let particleVisible = activeLayer
                        && arc <= arcLength
                        && random <= clamp(u.particleDensity, 0.2, 1.0);
  let theta = uCoord * 6.28318530718;
  let center = prCurve(theta, layer, phase);
  let ahead = prCurve(theta + 0.006, layer, phase);
  let tangent = normalize(ahead - center);
  let radial = normalize(center + vec3<f32>(0.001, 0.013, 0.007));
  let side = normalize(cross(tangent, radial));
  let surfaceNormal = normalize(cross(side, tangent));
  let twist = theta * (0.72 + u.ribbonTwist * 0.58)
              + phase * 0.74 + layer * 1.17;
  let ribbonDirection = normalize(side * cos(twist) + surfaceNormal * sin(twist));
  let widthEnvelope = (0.72 + 0.28 * pow(sin(theta * 1.5 + phase + layer), 2.0))
                      * mix(0.42, 1.0, sqrt(max(arcEnvelope, 0.0)));
  var position = center + ribbonDirection * strip * u.ribbonWidth * 0.5 * widthEnvelope;

  let pulse = sin(t * 0.73 + layer * 1.71)
              + 0.44 * sin(t * 1.17 + layer * 0.83 + 1.2);
  position *= 1.0 + u.ribbonBreath * pulse * 0.16;
  let layerCenter = layer
                    - (floor(clamp(u.ribbonCount, 2.0, 6.0) + 0.5) - 1.0) * 0.5;
  position = prRotateY(
    position,
    layerCenter * 0.24 + sin(t * 0.19 + layer * 1.3) * 0.055,
  );
  position = prRotateX(
    position,
    layerCenter * 0.14 + cos(t * 0.17 + layer * 0.9) * 0.04,
  );
  position = prRotateY(prRotateX(position, u.shape.y), u.shape.z);
  position = prRotateY(position, t * 0.105 + sin(t * 0.21) * 0.11);
  position = prRotateX(position, -0.2 + sin(t * 0.16 + layer * 0.1) * 0.16);

  let minSize = glsRenderMinSize();
  let depthScale = 0.88 + position.z * 0.16;
  let orbPosition = position.xy * u.radius * 1.45 * depthScale;
  let clip = vec2<f32>(
    orbPosition.x * minSize / max(u.size.x, 1.0),
    orbPosition.y * minSize / max(u.size.y, 1.0),
  );
  let canvasParticleScale = clamp(minSize / 640.0, 0.22, 1.0);
  let pointPixels = max(0.6, u.particleSize)
                    * (1.5 + u.particleBloom * 2.5)
                    * (0.92 + position.z * 0.18)
                    * canvasParticleScale;
  let corner = corners[vertexIndex];
  let pointOffset = corner * pointPixels * 2.0 / max(u.size, vec2<f32>(1.0));

  let colorPhase = uCoord * 0.32 + layer * 0.19 + phase * 0.025
                   + position.z * 0.08;
  let stripEdge = smoothstep(0.58, 1.0, abs(strip));
  let front = clamp(0.78 + position.z * 0.54, 0.5, 1.24);
  let baseOpacity = mix(0.025, 0.009, clamp(u.shade / 1.5, 0.0, 1.0));
  var out: RibbonOut;
  out.pos = select(
    vec4<f32>(2.0, 2.0, 1.0, 1.0),
    vec4<f32>(clip + pointOffset, clamp(0.5 - position.z * 0.12, 0.05, 0.95), 1.0),
    particleVisible,
  );
  out.local = corner;
  out.color = pow(
    mix(prPalette(colorPhase), u.highlightColor.rgb, stripEdge * 0.56),
    vec3<f32>(0.72),
  ) * front;
  out.opacity = select(
    0.0,
    baseOpacity
      * (0.72 + stripEdge * 1.28)
      * arcEnvelope
      * pow(canvasParticleScale, 1.35),
    particleVisible,
  );
  return out;
}

@fragment
fn ribbon_fs_main(in: RibbonOut) -> @location(0) vec4<f32> {
  let distanceSquared = dot(in.local, in.local);
  if (distanceSquared > 1.0) { discard; }
  let core = exp(-distanceSquared * 4.8);
  let halo = exp(-distanceSquared * 1.35);
  let bloom = clamp(u.particleBloom, 0.0, 2.0);
  let intensity = in.opacity * (core * 1.9 + halo * bloom * 0.72)
                  * max(u.exposure, 0.0);
  let glowMix = clamp((halo - core * 0.45) * (0.18 + u.edgeGlow * 0.5), 0.0, 0.7);
  let color = mix(in.color, u.glowColor.rgb, glowMix);
  let alpha = clamp(intensity, 0.0, 1.0);
  return vec4<f32>(color * alpha, alpha);
}

@group(0) @binding(1) var ribbonTexture: texture_2d<f32>;
@group(0) @binding(2) var ribbonSampler: sampler;

fn prTextureUvFromOrb(p: vec2<f32>, contourRad: f32) -> vec2<f32> {
  let minSize = glsRenderMinSize();
  let fc = (p * contourRad * minSize + u.size) * 0.5;
  return clamp(
    vec2<f32>(fc.x / max(u.size.x, 1.0), 1.0 - fc.y / max(u.size.y, 1.0)),
    vec2<f32>(0.0),
    vec2<f32>(1.0),
  );
}

fn prSampleRibbon(p: vec2<f32>, contourRad: f32) -> vec4<f32> {
  return textureSampleLevel(
    ribbonTexture,
    ribbonSampler,
    prTextureUvFromOrb(p, contourRad),
    0.0,
  );
}

fn ribbonColor(in: VOut) -> vec4<f32> {
  let direct = textureSampleLevel(ribbonTexture, ribbonSampler, in.uv, 0.0);
  if (u.glassEnabled <= 0.5 && u.shape.x < 0.5) { return glsAuraBehind(direct, in.uv); }

  let fc = vec2<f32>(in.uv.x, 1.0 - in.uv.y) * u.size;
  let minSize = glsRenderMinSize();
  let uv = (2.0 * fc - u.size) / minSize;
  let rad = max(u.radius, 0.05);
  let t = u.time * u.speed;
  let contourRad = rad * glsContourScale(uv, t, u.contourDeform);
  if (u.glassEnabled <= 0.5) {
    return glsAuraBehind(direct * (1.0 - smoothstep(0.99, 1.01, glsShapeDistance(uv / contourRad))), in.uv);
  }
  let shell = orbGlassLiquidAnim(in.uv);
  if (glsShapeDistance(uv / contourRad) > (1.01 + mfEdgeD(u.edgeSoftness))) {
    return shell;
  }

  let p = uv / contourRad;
  let pd = glsShapeDistance(p);
  let clearFa = 1.0 - smoothstep(GL_CLEAR_EA, GL_CLEAR_EB, pd);
  let normal = glsContourNormal(uv, rad, t, u.contourDeform);
  let edgeDepth = max(1.0 - pd, 0.0);
  let refractionWidth = 0.015 + 0.95 * clamp(u.shellMidAlpha, 0.0, 1.0);
  let refractionT = edgeDepth / max(refractionWidth, 0.001);
  let refractionProfile = pow(glsRefractionProfile(refractionT), 0.68);
  let refractionAmount = select(0.42, 1.6, u.shape.x < 0.5) * clamp(u.glassOpacity, 0.0, 1.0)
                         * refractionProfile;
  let refractedP = p - normal * refractionAmount;
  let channelSplit = 0.14 * clamp(u.gloss, 0.0, 2.0)
                     * clamp(u.glassOpacity, 0.0, 1.0)
                     * refractionProfile;
  let redSample = prSampleRibbon(refractedP - normal * channelSplit, contourRad);
  let greenSample = prSampleRibbon(refractedP, contourRad);
  let blueSample = prSampleRibbon(refractedP + normal * channelSplit, contourRad);
  let refractedAlpha = max(redSample.a, max(greenSample.a, blueSample.a)) * clearFa;
  let refracted = vec4<f32>(
    vec3<f32>(redSample.r, greenSample.g, blueSample.b) * clearFa,
    refractedAlpha,
  );
  return vec4<f32>(
    shell.rgb + refracted.rgb * (1.0 - shell.a),
    shell.a + refracted.a * (1.0 - shell.a),
  );
}

// Rotate rays into object space, then intersect a solid version of the 2D shape.
fn viewToObject(p: vec3<f32>) -> vec3<f32> {
  return prRotateX(prRotateY(p, -u.shape.z), -u.shape.y);
}
fn solidDistance(p: vec3<f32>) -> f32 {
  if (u.shape.x < 0.5) { return length(p) - 1.0; }
  if (u.shape.x < 1.5) {
    let q = abs(p) - vec3<f32>(0.7);
    return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0) - 0.035;
  }
  let d = vec2<f32>((glsShapeDistance(p.xy) - 1.0) * 0.45, abs(p.z) - 0.28);
  return min(max(d.x, d.y), 0.0) + length(max(d, vec2<f32>(0.0))) - 0.025;
}
fn solidColor(in: VOut) -> vec4<f32> {
  let screen = (in.uv * 2.0 - 1.0) * u.size / glsRenderMinSize();
  let radius = max(u.radius, 0.05);
  let origin = viewToObject(vec3<f32>(0.0, 0.0, 4.0));
  let ray = viewToObject(normalize(vec3<f32>(screen.x / radius, -screen.y / radius, -4.0)));
  var travel = 0.0;
  var hit = false;
  for (var i = 0; i < 96; i++) {
    let distance = solidDistance(origin + ray * travel);
    if (distance < 0.002) { hit = true; break; }
    travel += max(distance * 0.65, 0.001);
    if (travel > 7.0) { break; }
  }
  if (!hit) { return glsAuraBehind(vec4<f32>(0.0), in.uv); }
  let p = origin + ray * travel;
  let e = 0.003;
  let normal = normalize(vec3<f32>(
    solidDistance(p + vec3<f32>(e, 0.0, 0.0)) - solidDistance(p - vec3<f32>(e, 0.0, 0.0)),
    solidDistance(p + vec3<f32>(0.0, e, 0.0)) - solidDistance(p - vec3<f32>(0.0, e, 0.0)),
    solidDistance(p + vec3<f32>(0.0, 0.0, e)) - solidDistance(p - vec3<f32>(0.0, 0.0, e))
  ));
  // Triplanar material sampling keeps the sides colored as the object turns.
  let t = u.time * u.speed;
  let style = i32(u.style + 0.5);
  let weights = pow(abs(normal), vec3<f32>(4.0));
  let w = weights / max(weights.x + weights.y + weights.z, 0.001);
  let color = glsPresetFluid(p.yz * 0.85, style, t) * w.x
            + glsPresetFluid(p.xz * 0.85, style, t) * w.y
            + glsPresetFluid(p.xy * 0.85, style, t) * w.z;
  let light = viewToObject(normalize(vec3<f32>(-0.5, 0.7, 1.0)));
  let diffuse = 0.32 + 0.68 * max(dot(normal, light), 0.0);
  let halfVector = normalize(light - ray);
  let specular = pow(max(dot(normal, halfVector), 0.0), 48.0) * u.gloss;
  let rim = pow(1.0 - max(dot(normal, -ray), 0.0), 3.0);
  let shaded = clamp(color * diffuse * u.exposure + u.specColor.rgb * specular * 0.5
                    + u.glowColor.rgb * rim * (0.12 + u.edgeGlow * 0.3), vec3<f32>(0.0), vec3<f32>(1.0));
  return glsAuraBehind(vec4<f32>(shaded, 1.0), in.uv);
}

@fragment
fn fs_main(in: VOut) -> @location(0) vec4<f32> {
  var sample = in;
  sample.uv = asciiUv(in.uv);
  if (u.shape.w > 0.5) { return asciiColor(solidColor(sample), in.uv); }
  return asciiColor(figureColor(sample), in.uv);
}
@fragment
fn ribbon_composite_fs_main(in: VOut) -> @location(0) vec4<f32> {
  var sample = in;
  sample.uv = asciiUv(in.uv);
  return asciiColor(ribbonColor(sample), in.uv);
}
`;

export const orbShaderSource = `${effectSource}\n${vertexAndFragment}`;
