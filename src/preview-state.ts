import type { OrbParams } from "./presets";

export type OrbPreviewState = {
  pitch: number;
  yaw: number;
  view3d: boolean;
  motionPhase: number;
  ringTime?: number;
  scale: number;
  params?: OrbParams;
};

export const defaultOrbPreviewState: OrbPreviewState = {
  pitch: 0, yaw: 0, view3d: false, motionPhase: 0, scale: 1,
};
