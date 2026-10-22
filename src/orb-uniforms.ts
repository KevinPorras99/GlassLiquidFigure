import { type OrbParams, styleFlowIndexes, shapeIndexes, auraEffectIndexes } from "./presets";

export const orbUniformFloatCount = 168;
export const orbColorOffset = 40;
export const orbCanvasColorOffset = orbColorOffset + 10 * 4;

const paletteStops = [
  "#F7FBFF",
  "#EFF6FD",
  "#E0EEF9",
  "#D4E6F7",
  "#BBD5F3",
  "#A6C7F0",
  "#87B0EB",
  "#6F9EE8",
  "#6F9EE8",
  "#6F9EE8",
  "#6F9EE8",
  "#6F9EE8",
] as const;

function rgb(hex: string): [number, number, number, number] {
  const value = hex.slice(1);

  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
    1,
  ];
}

export function writeOrbUniforms(
  target: Float32Array,
  width: number,
  height: number,
  time: number,
  params: OrbParams,
  renderScale = 1,
): void {
  target.fill(0);
  target[0] = width;
  target[1] = height;
  target[2] = time;
  target[164] = Math.max(1, renderScale);
  target[165] = params.asciiEnabled ? 1 : 0;
  target[166] = params.asciiSize;
  target[167] = params.eyeBlinkEnabled ? 1 : 0;
  target[136] = shapeIndexes[params.shape] ?? 0;
  target.set([params.auraEnabled ? 1 : 0, params.auraIntensity, params.auraSize, params.auraSpeed], 140);
  target.set(rgb(params.auraColor), 144);
  target.set(rgb(params.auraColorB), 148);
  target.set(rgb(params.auraColorC), 156);
  target[160] = auraEffectIndexes[params.auraEffect] ?? 0;
  target[161] = params.auraAudioEnabled ? 1 : 0;

  target.set(
    [
      params.speed,
      params.radius,
      params.zoom,
      params.warp,
      params.ridgeAmt,
      params.sharp,
      params.shade,
      params.sheen,
      params.gloss,
      params.shellMidAlpha,
      params.shellEdgeAlpha,
      params.exposure,
      styleFlowIndexes[params.style],
      params.edgeSoftness,
      params.edgeGlow,
      0,
      params.glassEnabled ? 1 : 0,
      params.glassOpacity,
      params.contourDeform,
      params.bandDensity,
      params.chromaticShift,
      params.metalScale,
      params.metalStretch,
      params.metalAngle,
      params.metalOffset,
      params.metalPhase,
      params.metalEvolution,
      params.metalRoughness,
      params.metalDepth,
      params.particleDensity,
      params.ribbonCount,
      params.ribbonWidth,
      params.ribbonTwist,
      params.ribbonFold,
      params.ribbonBreath,
      params.particleSize,
      params.particleBloom,
    ],
    3,
  );

  const colors = [
    params.colorA,
    params.colorB,
    params.colorC,
    params.colorD,
    params.highlightColor,
    params.shellInner,
    params.shellMid,
    params.shellEdge,
    params.sheenColor,
    params.specColor,
    params.canvasColor,
    params.glowColor,
    ...paletteStops,
  ];
  colors.forEach((hex, index) => target.set(rgb(hex), orbColorOffset + index * 4));
}

export function createOrbUniformSnapshot(params: OrbParams): number[] {
  const values = new Float32Array(orbUniformFloatCount);
  writeOrbUniforms(values, 1, 1, 0, params);
  return Array.from(values);
}
