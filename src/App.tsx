import * as React from "react";
import { defaultOrbPreviewState, type OrbPreviewState } from "./preview-state";
import { LoadingLyrics } from "./LoadingLyrics";
import { Starfield, starfieldStyles } from "./starfield";
import { CodeIcon, CopySimpleIcon } from "@phosphor-icons/react";

import { Button } from "@/toolcraft/ui/components/primitives/button";
import { Input } from "@/toolcraft/ui/components/primitives/input";
import {
  TooltipProvider,
} from "@/toolcraft/ui/components/primitives/tooltip";
import { ControlFieldLabel } from "@/toolcraft/ui/components/control-layout";
import { SwitchControl as Switch } from "@/toolcraft/ui/components/controls/boolean/boolean-controls";
import { SegmentedControl } from "@/toolcraft/ui/components/controls/segmented/segmented-control";
import { SliderControl as Slider } from "@/toolcraft/ui/components/controls/slider/slider-control";
import { Panel } from "@/toolcraft/ui/components/panel/panel";
import { PanelSection } from "@/toolcraft/ui/components/panel/panel-section";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/toolcraft/ui/components/composites/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/toolcraft/ui/components/composites/tabs";

import posterUrl from "../poster.png";
import auroraPreviewUrl from "./assets/presets/aurora.png";
import blueDropPreviewUrl from "./assets/presets/blueDrop.png";
import chromePreviewUrl from "./assets/presets/chrome.png";
import chromaticMetalPreviewUrl from "./assets/presets/chromaticMetal.png";
import frostPreviewUrl from "./assets/presets/frost.png";
import opalPreviewUrl from "./assets/presets/opal.png";
import particleRibbonPreviewUrl from "./assets/presets/particleRibbon.png";
import plasmaPreviewUrl from "./assets/presets/plasma.png";
import refractiveBlobPreviewUrl from "./assets/presets/refractiveBlob.png";
import siriPreviewUrl from "./assets/presets/siri.png";
import spectrumPreviewUrl from "./assets/presets/spectrum.png";
import violetEmberPreviewUrl from "./assets/presets/violetEmber.png";
import voiceWavePreviewUrl from "./assets/presets/voiceWave.png";
type ExportModule = typeof import("./code-export");
import {
  colorLabels,
  numericLabels,
  styleLabels,
  uiCopy,
  type ColorKey,
  type Locale,
  type NumericKey,
} from "./editor-i18n";
import { createOrbRenderer } from "./orb-renderer";
import { OrbAudioInput } from "./orb-audio";
import { AudioControls } from "./AudioControls";
import {
  createOrbStateConfiguration,
  createPresetOrbStateConfiguration,
  defaultOrbActivationDuration,
  defaultOrbState,
  defaultOrbTransitionDuration,
  isOrbStateProfileKey,
  orbStateNames,
  orbStateProfileKeys,
  resolveOrbStateParams,
  updateOrbStateParam,
  type OrbStateConfiguration,
  type OrbStateName,
} from "./orb-states";
import {
  type ShapeName,
  shapeNames,
  type AuraEffect,
  auraEffectNames,
  effectDefaults,
  orbRadiusRange,
  type OrbParams,
  styleNames,
  stylePresets,
  type StyleName,
} from "./presets";

const Color = React.lazy(async () => {
  const module = await import("@/toolcraft/ui/components/controls/color/color-control");
  return { default: module.ColorControl };
});

import galaxyCorePreviewUrl from "./assets/presets/galaxyCore.svg";
import mysticMistPreviewUrl from "./assets/presets/mysticMist.svg";
import crystalLightPreviewUrl from "./assets/presets/crystalLight.svg";

import telekinesisHandUrl from "./assets/scenes/telekinesis-hand.png";
import spectralKaleidoscopePreviewUrl from "./assets/presets/spectralKaleidoscope.png";
import prismaticKaleidoscopePreviewUrl from "./assets/presets/prismaticKaleidoscope.png";
import mandelbrotBloomPreviewUrl from "./assets/presets/mandelbrotBloom.png";
import fibonacciGeometryPreviewUrl from "./assets/presets/fibonacciGeometry.svg";
import infiniteGazePreviewUrl from "./assets/presets/infiniteGaze.svg";
import visionaryFractalPreviewUrl from "./assets/presets/visionaryFractal.svg";

const stylePreviewUrls: Record<StyleName, string> = {
  siri: siriPreviewUrl,
  voiceWave: voiceWavePreviewUrl,
  spectrum: spectrumPreviewUrl,
  aurora: auroraPreviewUrl,
  frost: frostPreviewUrl,
  plasma: plasmaPreviewUrl,
  chrome: chromePreviewUrl,
  opal: opalPreviewUrl,
  blueDrop: blueDropPreviewUrl,
  violetEmber: violetEmberPreviewUrl,
  refractiveBlob: refractiveBlobPreviewUrl,
  particleRibbon: particleRibbonPreviewUrl,
  chromaticMetal: chromaticMetalPreviewUrl,
  galaxyCore: galaxyCorePreviewUrl,
  mysticMist: mysticMistPreviewUrl,
  crystalLight: crystalLightPreviewUrl,
  spectralKaleidoscope: spectralKaleidoscopePreviewUrl,
  prismaticKaleidoscope: prismaticKaleidoscopePreviewUrl,
  mandelbrotBloom: mandelbrotBloomPreviewUrl,
  fibonacciGeometry: fibonacciGeometryPreviewUrl,
  infiniteGaze: infiniteGazePreviewUrl,
  visionaryFractal: visionaryFractalPreviewUrl,
};
const compactPreviewStyles = new Set<StyleName>([
  "particleRibbon",
  "blueDrop",
  "violetEmber",
  "refractiveBlob",
  "chromaticMetal",
]);

type PreviewMode = "orb" | "scene";

const defaultSceneText = "Thinking...";
const maxSceneTextLength = 20;
const hashSyncDelayMs = 500;
const activationDurationRange = { min: 0.05, max: 0.8, step: 0.01 } as const;
const transitionDurationRange = { min: 0.1, max: 2, step: 0.05 } as const;

type OrbEditorState = {
  configuration: OrbStateConfiguration;
  activeState: OrbStateName;
};

type NumericSpec = {
  key: NumericKey;
  min: number;
  max: number;
  step: number;
  enabledStyles?: readonly StyleName[];
};

const ridgeStyles: readonly StyleName[] = [
  "spectralKaleidoscope", "prismaticKaleidoscope", "mandelbrotBloom", "fibonacciGeometry", "infiniteGaze", "visionaryFractal", "galaxyCore", "mysticMist", "crystalLight",
  "siri",
  "voiceWave",
  "spectrum",
  "aurora",
  "frost",
  "plasma",
  "blueDrop",
  "violetEmber",
  "refractiveBlob",
];
const sharpStyles: readonly StyleName[] = [
  "spectralKaleidoscope", "prismaticKaleidoscope", "mandelbrotBloom", "fibonacciGeometry", "infiniteGaze", "visionaryFractal",
  "crystalLight",
  "frost",
  "plasma",
  "chrome",
  "blueDrop",
  "violetEmber",
  "refractiveBlob",
];
const standardShapeStyles = styleNames.filter(
  (style) => style !== "chromaticMetal" && style !== "particleRibbon",
);
const chromaticMetalStyles: readonly StyleName[] = ["chromaticMetal"];
const particleRibbonStyles: readonly StyleName[] = ["particleRibbon"];

const numericSpecs: readonly NumericSpec[] = [
  { key: "rotationSpeed", min: 0.1, max: 2, step: 0.05 },
  { key: "orbitRingCount", min: 1, max: 3, step: 1 },
  { key: "orbitRingSpeed", min: 0, max: 1.5, step: 0.01 },
  { key: "orbitRingWidth", min: 0.03, max: 0.16, step: 0.005 },
  { key: "asciiSize", min: 5, max: 24, step: 1 },
  { key: "starsDensity", min: 20, max: 300, step: 1 },
  { key: "starsBrightness", min: 0, max: 1, step: 0.01 },
  { key: "auraIntensity", min: 0, max: 1.5, step: 0.01 },
  { key: "auraSize", min: 0.03, max: 0.5, step: 0.01 },
  { key: "auraSpeed", min: 0, max: 2, step: 0.01 },
  { key: "speed", min: 0, max: 3, step: 0.01 },
  { key: "radius", ...orbRadiusRange, step: 0.01 },
  {
    key: "contourDeform",
    min: 0,
    max: 1,
    step: 0.01,
    enabledStyles: standardShapeStyles,
  },
  {
    key: "zoom",
    min: 0.05,
    max: 1,
    step: 0.01,
    enabledStyles: standardShapeStyles,
  },
  {
    key: "warp",
    min: 0,
    max: 6,
    step: 0.05,
    enabledStyles: standardShapeStyles,
  },
  { key: "ridgeAmt", min: 0, max: 1, step: 0.01, enabledStyles: ridgeStyles },
  { key: "sharp", min: 0.5, max: 6, step: 0.05, enabledStyles: sharpStyles },
  {
    key: "bandDensity",
    min: 1,
    max: 6,
    step: 0.1,
    enabledStyles: chromaticMetalStyles,
  },
  {
    key: "metalDepth",
    min: 0,
    max: 1,
    step: 0.01,
    enabledStyles: chromaticMetalStyles,
  },
  {
    key: "metalRoughness",
    min: 0,
    max: 1,
    step: 0.01,
    enabledStyles: chromaticMetalStyles,
  },
  {
    key: "chromaticShift",
    min: 0,
    max: 1,
    step: 0.01,
    enabledStyles: chromaticMetalStyles,
  },
  {
    key: "metalScale",
    min: 0.2,
    max: 2,
    step: 0.01,
    enabledStyles: chromaticMetalStyles,
  },
  {
    key: "metalStretch",
    min: 0,
    max: 1,
    step: 0.01,
    enabledStyles: chromaticMetalStyles,
  },
  {
    key: "metalAngle",
    min: -180,
    max: 180,
    step: 1,
    enabledStyles: chromaticMetalStyles,
  },
  {
    key: "metalOffset",
    min: -1,
    max: 1,
    step: 0.01,
    enabledStyles: chromaticMetalStyles,
  },
  {
    key: "metalPhase",
    min: 0,
    max: 1,
    step: 0.01,
    enabledStyles: chromaticMetalStyles,
  },
  {
    key: "metalEvolution",
    min: 0,
    max: 2,
    step: 0.02,
    enabledStyles: chromaticMetalStyles,
  },
  {
    key: "particleDensity",
    min: 0.2,
    max: 1,
    step: 0.01,
    enabledStyles: particleRibbonStyles,
  },
  {
    key: "ribbonCount",
    min: 2,
    max: 6,
    step: 1,
    enabledStyles: particleRibbonStyles,
  },
  {
    key: "ribbonWidth",
    min: 0.1,
    max: 0.8,
    step: 0.01,
    enabledStyles: particleRibbonStyles,
  },
  {
    key: "ribbonTwist",
    min: 0.1,
    max: 3,
    step: 0.01,
    enabledStyles: particleRibbonStyles,
  },
  {
    key: "ribbonFold",
    min: 0,
    max: 1.2,
    step: 0.01,
    enabledStyles: particleRibbonStyles,
  },
  {
    key: "ribbonBreath",
    min: 0,
    max: 0.8,
    step: 0.01,
    enabledStyles: particleRibbonStyles,
  },
  {
    key: "particleSize",
    min: 0.6,
    max: 2.5,
    step: 0.01,
    enabledStyles: particleRibbonStyles,
  },
  {
    key: "particleBloom",
    min: 0,
    max: 2,
    step: 0.01,
    enabledStyles: particleRibbonStyles,
  },
  { key: "shade", min: 0, max: 1.5, step: 0.01 },
  { key: "exposure", min: 0.2, max: 3, step: 0.02 },
  { key: "sheen", min: 0, max: 2, step: 0.02 },
  { key: "gloss", min: 0, max: 2, step: 0.02 },
  { key: "glassOpacity", min: 0, max: 1, step: 0.01 },
  { key: "shellMidAlpha", min: 0, max: 1, step: 0.01 },
  { key: "shellEdgeAlpha", min: 0, max: 1, step: 0.01 },
  { key: "edgeSoftness", min: 0.005, max: 0.15, step: 0.005 },
  { key: "edgeGlow", min: 0, max: 1, step: 0.01 },
];

const numericSpecByKey = new Map(numericSpecs.map((spec) => [spec.key, spec]));
const colorKeys: readonly ColorKey[] = [
  "colorA",
  "colorB",
  "colorC",
  "colorD",
  "highlightColor",
  "shellInner",
  "shellMid",
  "shellEdge",
  "sheenColor",
  "specColor",
  "canvasColor",
  "glowColor",
  "auraColor",
  "auraColorB",
  "auraColorC",
  "orbitRingColorA",
  "orbitRingColorB",
  "orbitRingEdgeColor",
  "orbitRingEyeColor",
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeColor(value: string): string | null {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : null;
}

function limitSceneText(value: string): string {
  return Array.from(value).slice(0, maxSceneTextLength).join("");
}

function readPreviewModeFromHash(): PreviewMode {
  const mode = new URLSearchParams(window.location.hash.slice(1)).get("preview");
  return mode === "scene" ? "scene" : "orb";
}

function readHandBackgroundFromHash(): boolean {
  const search = new URLSearchParams(window.location.hash.slice(1));
  return search.get("background") === "hand" || search.get("preview") === "telekinesis";
}

function readSceneTextFromHash(): string {
  const text = new URLSearchParams(window.location.hash.slice(1)).get("text");
  return text === null ? defaultSceneText : limitSceneText(text);
}

function stateHashKey(state: OrbStateName, key: string): string {
  if (state === "thinking") return key;
  return `idle${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function readEditorStateFromHash(): OrbEditorState {
  const search = new URLSearchParams(window.location.hash.slice(1));
  const style = search.get("style");
  const selectedStyle = style && styleNames.includes(style as StyleName)
    ? style as StyleName
    : effectDefaults.style;
  const params: OrbParams = {
    style: selectedStyle,
    ...stylePresets[selectedStyle],
  };

  const shape = search.get("shape");
  if (shape && shapeNames.includes(shape as ShapeName)) params.shape = shape as ShapeName;

  params.autoRotate = search.get("autoRotate") === "1";
  if (search.get("audioResponse") === "impact") params.audioResponse = "impact";
  params.orbitRingsEnabled = search.get("orbitRings") === "1";
  params.asciiEnabled = search.get("ascii") === "1";
  const eyeBlink = search.get("eyeBlink");
  if (eyeBlink === "0" || eyeBlink === "1") params.eyeBlinkEnabled = eyeBlink === "1";
  params.starsEnabled = search.get("stars") === "1";
  params.auraEnabled = search.get("aura") === "1";
  params.auraAudioEnabled = search.get("auraAudio") === "1";
  const auraEffect = search.get("auraEffect");
  if (auraEffect && auraEffectNames.includes(auraEffect as AuraEffect)) params.auraEffect = auraEffect as AuraEffect;
  const glass = search.get("glass");
  if (glass === "1") params.glassEnabled = true;
  if (glass === "0") params.glassEnabled = false;

  for (const spec of numericSpecs) {
    const raw = search.get(spec.key);
    if (raw === null) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) {
      params[spec.key] = clamp(value, spec.min, spec.max);
    }
  }

  for (const key of colorKeys) {
    const raw = search.get(key);
    if (raw === null) continue;
    const value = normalizeColor(raw);
    if (value) params[key] = value;
  }

  const transitionRaw = search.get("transition");
  const transitionValue = transitionRaw === null ? null : Number(transitionRaw);
  const transitionDuration = transitionValue !== null && Number.isFinite(transitionValue)
    ? clamp(
      transitionValue,
      transitionDurationRange.min,
      transitionDurationRange.max,
    )
    : defaultOrbTransitionDuration;
  const activationRaw = search.get("activation");
  const activationValue = activationRaw === null ? null : Number(activationRaw);
  const activationDuration = activationValue !== null && Number.isFinite(activationValue)
    ? clamp(
      activationValue,
      activationDurationRange.min,
      activationDurationRange.max,
    )
    : defaultOrbActivationDuration;
  let configuration = createOrbStateConfiguration(
    params,
    transitionDuration,
    activationDuration,
  );

  for (const key of orbStateProfileKeys) {
    const raw = search.get(stateHashKey("idle", key));
    if (raw === null) continue;

    if (typeof configuration.profiles.idle[key] === "number") {
      const spec = numericSpecByKey.get(key as NumericKey);
      const value = Number(raw);
      if (spec && Number.isFinite(value)) {
        configuration = updateOrbStateParam(
          configuration,
          "idle",
          key,
          clamp(value, spec.min, spec.max),
        );
      }
    } else {
      const color = normalizeColor(raw);
      if (color) configuration = updateOrbStateParam(configuration, "idle", key, color);
    }
  }

  const state = search.get("state");
  const activeState = state && orbStateNames.includes(state as OrbStateName)
    ? state as OrbStateName
    : defaultOrbState;

  return { configuration, activeState };
}

function writeHash(
  editorState: OrbEditorState,
  previewMode: PreviewMode,
  sceneText: string,
  handBackground: boolean,
): void {
  const { configuration, activeState } = editorState;
  const params = resolveOrbStateParams(configuration, "thinking");
  const search = new URLSearchParams();
  search.set("effect", "orb-glass-liquid");
  search.set("style", params.style);
  search.set("shape", params.shape);
  search.set("autoRotate", params.autoRotate ? "1" : "0");
  search.set("audioResponse", params.audioResponse);
  search.set("orbitRings", params.orbitRingsEnabled ? "1" : "0");
  search.set("ascii", params.asciiEnabled ? "1" : "0");
  search.set("eyeBlink", params.eyeBlinkEnabled ? "1" : "0");
  search.set("stars", params.starsEnabled ? "1" : "0");
  search.set("aura", params.auraEnabled ? "1" : "0");
  search.set("auraAudio", params.auraAudioEnabled ? "1" : "0");
  search.set("auraEffect", params.auraEffect);
  search.set("glass", params.glassEnabled ? "1" : "0");
  search.set("state", activeState);
  search.set("activation", String(configuration.activationDuration));
  search.set("transition", String(configuration.transitionDuration));
  search.set("preview", previewMode);
  search.set("background", handBackground ? "hand" : "none");
  search.set("text", sceneText);
  for (const spec of numericSpecs) {
    search.set(spec.key, String(params[spec.key]));
    if (isOrbStateProfileKey(spec.key)) {
      search.set(
        stateHashKey("idle", spec.key),
        String(configuration.profiles.idle[spec.key]),
      );
    }
  }
  for (const key of colorKeys) {
    search.set(key, params[key]);
    if (isOrbStateProfileKey(key)) {
      search.set(stateHashKey("idle", key), configuration.profiles.idle[key]);
    }
  }
  window.history.replaceState(null, "", `#${search.toString()}`);
}

function useSectionState() {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({
    state: false,
    motion: false,
    colors: true,
    shape: true,
    glass: false,
    edge: false,
    scene: false,
  });

  return {
    isCollapsed: (key: string) => collapsed[key] ?? false,
    onCollapsedChange: (key: string) => (value: boolean) => {
      setCollapsed((current) => ({ ...current, [key]: value }));
    },
  };
}

function useStackedLayout(): boolean {
  const [stacked, setStacked] = React.useState(() =>
    window.matchMedia("(max-width: 900px)").matches,
  );

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => setStacked(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return stacked;
}

export function App(): React.JSX.Element {
  const audioInput = React.useMemo(() => new OrbAudioInput(), [OrbAudioInput]);
  const [audioResetKey, setAudioResetKey] = React.useState(0);
  const locale: Locale = "en";
  const [editorState, setEditorState] = React.useState<OrbEditorState>(readEditorStateFromHash);
  const [renderState, setRenderState] = React.useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [presetCollapsed, setPresetCollapsed] = React.useState(false);
  const [propertiesCollapsed, setPropertiesCollapsed] = React.useState(false);
  const [mobilePanel, setMobilePanel] = React.useState<"controls" | "presets" | null>("controls");
  const [previewScale, setPreviewScale] = React.useState(1);
  const [previewMode, setPreviewMode] = React.useState<PreviewMode>(readPreviewModeFromHash);
  const [handBackground, setHandBackground] = React.useState(readHandBackgroundFromHash);
  const [sceneText, setSceneText] = React.useState(readSceneTextFromHash);
  const [codeOpen, setCodeOpen] = React.useState(false);
  const [codePlatform, setCodePlatform] = React.useState<"web" | "swift">("web");
  const [copiedPlatform, setCopiedPlatform] = React.useState<"web" | "swift" | "error" | null>(null);
  const [exportModule, setExportModule] = React.useState<ExportModule | null>(null);
  const [exportError, setExportError] = React.useState("");
  const [codeState, setCodeState] = React.useState<OrbEditorState | null>(null);
  const previewStateRef = React.useRef(defaultOrbPreviewState);
  const [codePreview, setCodePreview] = React.useState<OrbPreviewState>(defaultOrbPreviewState);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const stageRef = React.useRef<HTMLElement | null>(null);
  const copyBufferRef = React.useRef<HTMLTextAreaElement | null>(null);
  const params = React.useMemo(
    () => resolveOrbStateParams(editorState.configuration, editorState.activeState),
    [editorState.configuration, editorState.activeState],
  );
  const presetStateParams = React.useMemo(
    () => resolveOrbStateParams(
      createPresetOrbStateConfiguration(params.style),
      editorState.activeState,
    ),
    [editorState.activeState, params.style],
  );
  const renderTargetRef = React.useRef({
    state: editorState.activeState,
    params,
    activationDuration: editorState.configuration.activationDuration,
    transitionDuration: editorState.configuration.transitionDuration,
  });
  const sectionState = useSectionState();
  const stackedLayout = useStackedLayout();
  const copy = uiCopy[locale];
  const previewModeOptions = React.useMemo(
    () => [
      { label: copy.orbMode, value: "orb" },
      { label: copy.sceneMode, value: "scene" },
    ],
    [copy.orbMode, copy.sceneMode],
  );
  const orbStateOptions = React.useMemo(
    () => [
      { label: copy.idleState, value: "idle" },
      { label: copy.thinkingState, value: "thinking" },
    ],
    [copy.idleState, copy.thinkingState],
  );

  const webCode = React.useMemo(
    () => (codeState && exportModule && codePlatform === "web"
      ? exportModule.createWebExport(codeState.configuration, codeState.activeState, codePreview)
      : ""),
    [codeState, exportModule, codePlatform, codePreview],
  );
  const swiftCode = React.useMemo(
    () => (codeState && exportModule && codePlatform === "swift"
      ? exportModule.createSwiftExport(codeState.configuration, codeState.activeState, codePreview)
      : ""),
    [codeState, exportModule, codePlatform, codePreview],
  );

  React.useEffect(() => {
    if (!codeOpen || exportModule) return;
    let cancelled = false;
    setExportError("");
    import("./code-export").then((module) => {
      if (!cancelled) setExportModule(module);
    }).catch(() => {
      if (!cancelled) setExportError("Unable to load export tools. Close and reopen to retry.");
    });
    return () => { cancelled = true; };
  }, [codeOpen, exportModule]);

  renderTargetRef.current = {
    state: editorState.activeState,
    params,
    activationDuration: editorState.configuration.activationDuration,
    transitionDuration: editorState.configuration.transitionDuration,
  };

  React.useEffect(() => {
    document.documentElement.lang = "en";
    document.title = uiCopy.en.documentTitle;
  }, []);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      writeHash(editorState, previewMode, sceneText, handBackground);
    }, hashSyncDelayMs);

    return () => window.clearTimeout(timeout);
  }, [editorState, previewMode, sceneText, handBackground]);

  React.useEffect(() => {
    const syncFromHash = () => {
      setEditorState(readEditorStateFromHash());
      setPreviewMode(readPreviewModeFromHash());
      setHandBackground(readHandBackgroundFromHash());
      setSceneText(readSceneTextFromHash());
      setPreviewScale(1);
    };

    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  React.useEffect(() => {
    document.documentElement.style.setProperty("--orb-canvas-color", params.canvasColor);
  }, [params.canvasColor]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    return createOrbRenderer({
      canvas,
      getTarget: () => renderTargetRef.current,
      getAudioBands: (dt) => audioInput.read(dt),
      onPreviewState: (state) => { previewStateRef.current = state; },
      onError: (error) => {
        console.error("Figure renderer failed:", error);
        setErrorMessage(error.message);
        setRenderState("error");
      },
      onReady: () => setRenderState((current) => (current === "ready" ? current : "ready")),
    });
  }, [audioInput]);

  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const handleWheel = (event: WheelEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-stage-controls]")
      ) {
        return;
      }

      event.preventDefault();
      const modeScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? stage.clientHeight
          : 1;
      const delta = clamp(-event.deltaY * modeScale * 0.001, -0.1, 0.1);
      setPreviewScale((current) =>
        Math.round(clamp(current + delta, 0.6, 1.6) * 100) / 100,
      );
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, []);

  const setParam = React.useCallback(
    <Key extends keyof OrbParams>(key: Key, value: OrbParams[Key]) => {
      setEditorState((current) => ({
        ...current,
        configuration: updateOrbStateParam(
          current.configuration,
          current.activeState,
          key,
          value,
        ),
      }));
    },
    [],
  );

  const applyStyle = React.useCallback((style: StyleName) => {
    setEditorState((current) => ({
      activeState: current.activeState,
      configuration: {
        ...createPresetOrbStateConfiguration(style),
        shared: {
          ...createPresetOrbStateConfiguration(style).shared,
          shape: current.configuration.shared.shape,
          audioResponse: current.configuration.shared.audioResponse,
          autoRotate: current.configuration.shared.autoRotate,
          rotationSpeed: current.configuration.shared.rotationSpeed,
          orbitRingsEnabled: current.configuration.shared.orbitRingsEnabled,
          orbitRingCount: current.configuration.shared.orbitRingCount,
          orbitRingSpeed: current.configuration.shared.orbitRingSpeed,
          orbitRingWidth: current.configuration.shared.orbitRingWidth,
          orbitRingColorA: current.configuration.shared.orbitRingColorA,
          orbitRingColorB: current.configuration.shared.orbitRingColorB,
          orbitRingEdgeColor: current.configuration.shared.orbitRingEdgeColor,
          orbitRingEyeColor: current.configuration.shared.orbitRingEyeColor,
          asciiEnabled: current.configuration.shared.asciiEnabled,
          asciiSize: current.configuration.shared.asciiSize,
          starsEnabled: current.configuration.shared.starsEnabled,
          starsDensity: current.configuration.shared.starsDensity,
          starsBrightness: current.configuration.shared.starsBrightness,
          auraEnabled: current.configuration.shared.auraEnabled,
          auraAudioEnabled: current.configuration.shared.auraAudioEnabled,
          auraIntensity: current.configuration.shared.auraIntensity,
          auraSize: current.configuration.shared.auraSize,
          auraSpeed: current.configuration.shared.auraSpeed,
          auraColor: current.configuration.shared.auraColor,
          auraColorB: current.configuration.shared.auraColorB,
          auraColorC: current.configuration.shared.auraColorC,
          auraEffect: current.configuration.shared.auraEffect,
        },
        activationDuration: current.configuration.activationDuration,
        transitionDuration: current.configuration.transitionDuration,
      },
    }));
  }, []);

  const resetAll = React.useCallback(() => {
    setAudioResetKey((value) => value + 1);
    setEditorState({
      activeState: defaultOrbState,
      configuration: createPresetOrbStateConfiguration(effectDefaults.style),
    });
    setSceneText(defaultSceneText);
    setPreviewScale(1);
  }, []);

  const updatePreviewMode = React.useCallback((value: string) => {
    if (value !== "orb" && value !== "scene") return;
    setPreviewMode(value);
    setPreviewScale(1);
  }, []);

  const updateOrbState = React.useCallback((value: string) => {
    if (!orbStateNames.includes(value as OrbStateName)) return;
    setEditorState((current) => ({
      ...current,
      activeState: value as OrbStateName,
    }));
  }, []);

  const updateTransitionDuration = React.useCallback((value: number) => {
    setEditorState((current) => ({
      ...current,
      configuration: {
        ...current.configuration,
        transitionDuration: value,
      },
    }));
  }, []);

  const updateActivationDuration = React.useCallback((value: number) => {
    setEditorState((current) => ({
      ...current,
      configuration: {
        ...current.configuration,
        activationDuration: value,
      },
    }));
  }, []);

  const openCode = React.useCallback(() => {
    setCodePreview({ ...previewStateRef.current, scale: previewScale });
    setCodeState({
      activeState: editorState.activeState,
      configuration: {
        ...editorState.configuration,
        shared: { ...editorState.configuration.shared },
        profiles: {
          idle: { ...editorState.configuration.profiles.idle },
          thinking: { ...editorState.configuration.profiles.thinking },
        },
      },
    });
    setCopiedPlatform(null);
    setCodeOpen(true);
  }, [editorState, previewScale]);

  const copyCode = React.useCallback(async () => {
    const code = codePlatform === "web" ? webCode : swiftCode;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedPlatform(codePlatform);
    } catch {
      const copyBuffer = copyBufferRef.current;
      const previousFocus = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

      if (!copyBuffer) {
        setCopiedPlatform("error");
        return;
      }

      copyBuffer.value = code;
      copyBuffer.focus();
      copyBuffer.select();
      const copied = document.execCommand("copy");
      previousFocus?.focus();
      setCopiedPlatform(copied ? codePlatform : "error");
    }
  }, [codePlatform, swiftCode, webCode]);

  function renderSlider(key: NumericKey, label = numericLabels[locale][key]): React.JSX.Element | null {
    const spec = numericSpecByKey.get(key);
    if (!spec) throw new Error(`Missing slider configuration: ${key}`);
    if (spec.enabledStyles && !spec.enabledStyles.includes(params.style)) return null;

    return (
      <Slider
        baseValue={presetStateParams[key]}
        editValueLabel={copy.editValue(label)}
        key={key}
        max={spec.max}
        min={spec.min}
        name={label}
        onValueChange={(value) => setParam(key, value)}
        showFill
        step={spec.step}
        value={params[key]}
      />
    );
  }

  function colorInput(key: ColorKey) {
    const name = colorLabels[locale][key];

    return {
      ariaLabels: {
        colorChannel: copy.colorChannel,
        colorSurface: copy.colorSurface,
        cssColorValue: copy.cssColorValue,
        hexColor: copy.hexColor,
        hexValue: copy.hexValue(name),
        hue: copy.hue,
        selectColor: copy.selectColor(name),
      },
      hex: params[key],
      name,
      onValueChange: ({ hex }: { hex: string }) => setParam(key, hex),
      showLabel: true,
    };
  }

  function colorControl(element: React.ReactNode): React.JSX.Element {
    return (
      <React.Suspense fallback={<div className="color-control-loading" aria-hidden="true" />}>
        {element}
      </React.Suspense>
    );
  }

  return (
    <TooltipProvider>
      <main
        className="orb-editor"
        data-preset-collapsed={String(!stackedLayout && presetCollapsed)}
        data-properties-collapsed={String(!stackedLayout && propertiesCollapsed)}
        data-mobile-panel={mobilePanel ?? "none"}
      >
        <nav className="mobile-panel-navigation" aria-label={copy.orbControls}>
          <Button type="button" aria-pressed={mobilePanel === "controls"}
            aria-controls="figure-controls-panel"
            aria-expanded={mobilePanel === "controls"}
            variant={mobilePanel === "controls" ? "default" : "outline"}
            onClick={() => setMobilePanel(current => current === "controls" ? null : "controls")}>
            {copy.orbControls}
            <span aria-hidden="true">{mobilePanel === "controls" ? "−" : "+"}</span>
          </Button>
          <Button type="button" aria-pressed={mobilePanel === "presets"}
            aria-controls="figure-presets-panel"
            aria-expanded={mobilePanel === "presets"}
            variant={mobilePanel === "presets" ? "default" : "outline"}
            onClick={() => setMobilePanel(current => current === "presets" ? null : "presets")}>
            {copy.presets}
            <span aria-hidden="true">{mobilePanel === "presets" ? "−" : "+"}</span>
          </Button>
        </nav>
        <aside id="figure-presets-panel" className="preset-dock" aria-label={copy.presets}>
          <Panel
            className="preset-panel h-full max-h-none w-full rounded-lg"
            collapsed={presetCollapsed}
            collapseDirection="left"
            collapseLabel={copy.collapsePresets}
            collapsible={!stackedLayout}
            expandLabel={copy.expandPresets}
            onCollapsedChange={setPresetCollapsed}
            title={copy.presets}
          >
            <PanelSection>
              <div className="preset-control">
                <div className="preset-grid" role="group" aria-label={copy.animatedPresets}>
                  {styleNames.map((style) => (
                    <Button
                      aria-pressed={params.style === style}
                      className="preset-button"
                      key={style}
                      onClick={() => applyStyle(style)}
                      type="button"
                      variant="outline"
                    >
                      <img
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width={240}
                        height={180}
                        aria-hidden="true"
                        className={`preset-preview${
                          compactPreviewStyles.has(style) ? " preset-preview--compact" : ""
                        }`}
                        src={stylePreviewUrls[style]}
                      />
                      <span title={styleLabels[locale][style]}>{styleLabels[locale][style]}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </PanelSection>
          </Panel>
        </aside>

        <section
          className="orb-stage"
          aria-label={previewMode === "scene" ? copy.scenePreview : copy.orbPreview}
          data-preview-mode={handBackground && previewMode === "orb" ? "telekinesis" : previewMode}
          data-aura-enabled={params.auraEnabled ? "true" : "false"}
          ref={stageRef}
          style={{ "--preview-scale": previewScale } as React.CSSProperties}
        >
          <style>{starfieldStyles}</style>
          {params.starsEnabled && <Starfield count={params.starsDensity} brightness={params.starsBrightness} />}
          <div className="stage-mode-control" data-stage-controls>
            <SegmentedControl
              ariaLabel={copy.switchPreviewMode}
              name={copy.previewMode}
              onValueChange={updatePreviewMode}
              options={previewModeOptions}
              value={previewMode}
            />
          </div>
          <div className="preview-surface">
            {handBackground && previewMode === "orb" && (
              <div className="telekinesis-backdrop" aria-hidden="true">
                <img className="telekinesis-hand" src={telekinesisHandUrl} alt="" draggable={false} />
              </div>
            )}
            <div className="orb-visual">
              {renderState === "error" ? (
                <img className="orb-poster" src={posterUrl} alt={copy.staticOrbPreview} />
              ) : null}
              <canvas
                aria-label={`${copy.animatedOrbPreview}. Drag to rotate in 3D. Arrow keys rotate; double-click or Escape resets the view.`}
                title="Drag to rotate in 3D · Double-click to reset"
                tabIndex={0}
                className="orb-canvas"
                data-ready={renderState === "ready" ? "true" : undefined}
                ref={canvasRef}
              />
              {renderState === "loading" ? (
                <LoadingLyrics label={copy.loadingOrb} />
              ) : null}
              {renderState === "error" ? (
                <p
                  className="orb-error"
                  title={errorMessage || copy.renderErrorTitle}
                >
                  {copy.renderFallback}
                  {errorMessage ? <span className="orb-error-detail">{errorMessage}</span> : null}
                </p>
              ) : null}
            </div>
            {previewMode === "scene" ? (
              <div className="scene-copy" aria-label={copy.sceneText(sceneText)}>
                <span className="scene-copy-text">{sceneText || "\u00a0"}</span>
              </div>
            ) : null}
          </div>
          <div className="stage-toolbar" data-stage-controls>
            <Button
              className="code-trigger"
              onClick={openCode}
              size="lg"
              type="button"
              variant="outline"
            >
              <CodeIcon data-icon="inline-start" />
              {copy.copyCode}
            </Button>

          </div>
        </section>

        <aside id="figure-controls-panel" className="panel-dock" aria-label={copy.orbControls}>
          <Panel
            className="orb-editor-panel h-full max-h-none w-full rounded-lg"
            collapsed={propertiesCollapsed}
            collapseDirection="right"
            collapseLabel={copy.collapseControls}
            collapsible={!stackedLayout}
            expandLabel={copy.expandControls}
            onCollapsedChange={setPropertiesCollapsed}
            onResetControls={resetAll}
            resetLabel={copy.resetControls}
            title={copy.orbControls}
          >
            <PanelSection title={"Shape"}>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label={"Shape"}>
                {shapeNames.map((shape, index) => (
                  <Button
                    key={shape}
                    aria-pressed={params.shape === shape}
                    variant={params.shape === shape ? "default" : "outline"}
                    onClick={() => setParam("shape", shape)}
                  >
                    {(["Orb", "Cube", "Rhomboid", "Trapezoid", "Triangle", "Pentagon", "Hexagon", "Octagon", "Flower of Life", "Seed of Life", "Vesica Piscis", "Metatron’s Cube", "Star", "7-Point Star"])[index]}
                  </Button>
                ))}
              </div>
            </PanelSection>
            <PanelSection title="3D Rotation">
              <Switch checked={params.autoRotate} name="Auto Rotate"
                onCheckedChange={checked => setParam("autoRotate", checked)} />
              {params.autoRotate && renderSlider("rotationSpeed")}
            </PanelSection>
            <PanelSection title="3D Orbit Rings">
              <Switch checked={params.orbitRingsEnabled} name="Psychedelic Rings"
                onCheckedChange={checked => setParam("orbitRingsEnabled", checked)} />
              {params.orbitRingsEnabled && <>
                {renderSlider("orbitRingCount")}
                {renderSlider("orbitRingSpeed")}
                {renderSlider("orbitRingWidth")}
                {colorControl(<Color inputs={[colorInput("orbitRingColorA"), colorInput("orbitRingColorB")]} />)}
                {colorControl(<Color inputs={[colorInput("orbitRingEdgeColor"), colorInput("orbitRingEyeColor")]} />)}
              </>}
            </PanelSection>
            {(params.style === "visionaryFractal" || params.style === "infiniteGaze") && (
              <PanelSection title="Fractal Eyes">
                <Switch checked={params.eyeBlinkEnabled} name="Random Blinking"
                  onCheckedChange={checked => setParam("eyeBlinkEnabled", checked)} />
              </PanelSection>
            )}
            <PanelSection title="ASCII">
              <Switch checked={params.asciiEnabled} name="Enable ASCII"
                onCheckedChange={checked => setParam("asciiEnabled", checked)} />
              {params.asciiEnabled && renderSlider("asciiSize")}
            </PanelSection>
            <PanelSection title="Background">
              <Switch checked={handBackground} name="Telekinesis Hand"
                onCheckedChange={checked => {
                  setHandBackground(checked);
                  if (checked) updatePreviewMode("orb");
                }} />
            </PanelSection>
            <PanelSection title={"Star Background"}>
              <Switch checked={params.starsEnabled} name={"Enable Stars"}
                onCheckedChange={checked => setParam("starsEnabled", checked)} />
              {params.starsEnabled && <>
                {renderSlider("starsDensity")}
                {renderSlider("starsBrightness")}
              </>}
            </PanelSection>
            <PanelSection title={"Aura"}>
              <Switch
                checked={params.auraEnabled}
                name={"Enable Aura"}
                onCheckedChange={(checked) => setParam("auraEnabled", checked)}
              />
              {params.auraEnabled ? (
                <>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label={"Aura Effect"}>
                    {auraEffectNames.map((effect, index) => (
                      <Button key={effect} aria-pressed={params.auraEffect === effect}
                        variant={params.auraEffect === effect ? "default" : "outline"}
                        onClick={() => {
                          setParam("auraEffect", effect);
                          if (effect === "eyeRing") {
                            setParam("auraColor", "#F4F4F0");
                            setParam("auraColorB", "#A3A3AA");
                            setParam("auraColorC", "#FFFFFF");
                          }
                        }}>
                        {(["Flow", "Pulse", "Waves", "Spiral", "Eye Ring"])[index]}
                      </Button>
                    ))}
                  </div>
                  <Switch checked={params.auraAudioEnabled}
                    name={"React to Audio"}
                    onCheckedChange={checked => setParam("auraAudioEnabled", checked)} />
                  {renderSlider("auraIntensity")}
                  {renderSlider("auraSize")}
                  {renderSlider("auraSpeed")}
                  {colorControl(<Color inputs={[colorInput("auraColor"), colorInput("auraColorB")]} />)}
                  {colorControl(<Color {...colorInput("auraColorC")} />)}
                </>
              ) : null}
            </PanelSection>
            <AudioControls key={audioResetKey} input={audioInput} style={params.style} response={params.audioResponse} onResponseChange={response => setParam("audioResponse", response)} auraResponsive={params.auraEnabled && params.auraAudioEnabled} />
            {previewMode === "scene" ? (
              <PanelSection
                collapsed={sectionState.isCollapsed("scene")}
                collapseLabel={copy.collapseSection(copy.sceneSection)}
                collapsible
                expandLabel={copy.expandSection(copy.sceneSection)}
                onCollapsedChange={sectionState.onCollapsedChange("scene")}
                title={copy.sceneSection}
              >
                <div className="scene-text-field">
                  <div className="scene-text-label-row">
                    <ControlFieldLabel htmlFor="scene-text-input">{copy.displayText}</ControlFieldLabel>
                    <span aria-live="polite" className="scene-text-count">
                      {Array.from(sceneText).length}/{maxSceneTextLength}
                    </span>
                  </div>
                  <Input
                    aria-describedby="scene-text-limit"
                    id="scene-text-input"
                    onChange={(event) => setSceneText(limitSceneText(event.target.value))}
                    value={sceneText}
                  />
                  <span className="sr-only" id="scene-text-limit">{copy.sceneTextLimit}</span>
                </div>
              </PanelSection>
            ) : null}
            <PanelSection
              collapsed={sectionState.isCollapsed("state")}
              collapseLabel={copy.collapseSection(copy.stateSection)}
              collapsible
              expandLabel={copy.expandSection(copy.stateSection)}
              onCollapsedChange={sectionState.onCollapsedChange("state")}
              title={copy.stateSection}
            >
              <div className="orb-state-control">
                <SegmentedControl
                  ariaLabel={copy.switchOrbState}
                  name={copy.orbState}
                  onValueChange={updateOrbState}
                  options={orbStateOptions}
                  value={editorState.activeState}
                />
              </div>
              <Slider
                baseValue={defaultOrbActivationDuration}
                editValueLabel={copy.editValue(copy.activationDuration)}
                max={activationDurationRange.max}
                min={activationDurationRange.min}
                name={copy.activationDuration}
                onValueChange={updateActivationDuration}
                showFill
                step={activationDurationRange.step}
                unit="s"
                value={editorState.configuration.activationDuration}
              />
              <Slider
                baseValue={defaultOrbTransitionDuration}
                editValueLabel={copy.editValue(copy.transitionDuration)}
                max={transitionDurationRange.max}
                min={transitionDurationRange.min}
                name={copy.transitionDuration}
                onValueChange={updateTransitionDuration}
                showFill
                step={transitionDurationRange.step}
                unit="s"
                value={editorState.configuration.transitionDuration}
              />
            </PanelSection>
            <PanelSection
              collapsed={sectionState.isCollapsed("motion")}
              collapseLabel={copy.collapseSection(copy.motionSection)}
              collapsible
              expandLabel={copy.expandSection(copy.motionSection)}
              onCollapsedChange={sectionState.onCollapsedChange("motion")}
              title={copy.motionSection}
            >
              {renderSlider("speed")}
            </PanelSection>
            {(params.style === "fibonacciGeometry" || params.style === "mandelbrotBloom" || params.style === "prismaticKaleidoscope" || params.style === "spectralKaleidoscope") && (
              <PanelSection title="Fractal">
                {renderSlider("zoom", "Fractal Zoom")}
              </PanelSection>
            )}

            <PanelSection
              collapsed={sectionState.isCollapsed("colors")}
              collapseLabel={copy.collapseSection(copy.colorsSection)}
              collapsible
              expandLabel={copy.expandSection(copy.colorsSection)}
              onCollapsedChange={sectionState.onCollapsedChange("colors")}
              title={copy.colorsSection}
            >
              {colorControl(<Color inputs={[colorInput("colorA"), colorInput("colorB")]} />)}
              {colorControl(<Color inputs={[colorInput("colorC"), colorInput("colorD")]} />)}
              {colorControl(<Color inputs={[colorInput("highlightColor"), colorInput("canvasColor")]} />)}
              {renderSlider("shade")}
              {renderSlider("exposure")}
            </PanelSection>

            <PanelSection
              collapsed={sectionState.isCollapsed("shape")}
              collapseLabel={copy.collapseSection(copy.shapeSection)}
              collapsible
              expandLabel={copy.expandSection(copy.shapeSection)}
              onCollapsedChange={sectionState.onCollapsedChange("shape")}
              title={copy.shapeSection}
            >
              {renderSlider("radius")}
              {renderSlider("contourDeform")}
              {params.style !== "fibonacciGeometry" && params.style !== "mandelbrotBloom" && params.style !== "prismaticKaleidoscope" && params.style !== "spectralKaleidoscope" && renderSlider("zoom")}
              {renderSlider("warp")}
              {renderSlider("ridgeAmt")}
              {renderSlider("sharp")}
              {renderSlider("metalDepth")}
              {renderSlider("metalRoughness")}
              {renderSlider("chromaticShift")}
              {renderSlider("metalScale")}
              {renderSlider("metalStretch")}
              {renderSlider("metalAngle")}
              {renderSlider("bandDensity")}
              {renderSlider("metalOffset")}
              {renderSlider("metalPhase")}
              {renderSlider("metalEvolution")}
              {renderSlider("particleDensity")}
              {renderSlider("ribbonCount")}
              {renderSlider("ribbonWidth")}
              {renderSlider("ribbonTwist")}
              {renderSlider("ribbonFold")}
              {renderSlider("ribbonBreath")}
              {renderSlider("particleSize")}
              {renderSlider("particleBloom")}
            </PanelSection>

            <PanelSection
              collapsed={sectionState.isCollapsed("glass")}
              collapseLabel={copy.collapseSection(copy.glassSection)}
              collapsible
              expandLabel={copy.expandSection(copy.glassSection)}
              onCollapsedChange={sectionState.onCollapsedChange("glass")}
              title={copy.glassSection}
            >
              <div className="glass-switch">
                <Switch
                  checked={params.glassEnabled}
                  name={copy.enableGlass}
                  onCheckedChange={(checked) => setParam("glassEnabled", checked)}
                />
              </div>
              {params.glassEnabled ? (
                <>
                  {renderSlider("glassOpacity")}
                  {renderSlider("sheen")}
                  {renderSlider("gloss")}
                  {renderSlider("shellMidAlpha")}
                  {renderSlider("shellEdgeAlpha")}
                  {colorControl(<Color inputs={[colorInput("shellInner"), colorInput("shellMid")]} />)}
                  {colorControl(<Color inputs={[colorInput("shellEdge"), colorInput("sheenColor")]} />)}
                  {colorControl(<Color {...colorInput("specColor")} />)}
                </>
              ) : null}
            </PanelSection>

            <PanelSection
              collapsed={sectionState.isCollapsed("edge")}
              collapseLabel={copy.collapseSection(copy.edgeSection)}
              collapsible
              expandLabel={copy.expandSection(copy.edgeSection)}
              onCollapsedChange={sectionState.onCollapsedChange("edge")}
              title={copy.edgeSection}
            >
              {renderSlider("edgeSoftness")}
              {renderSlider("edgeGlow")}
              {colorControl(<Color {...colorInput("glowColor")} />)}
            </PanelSection>

          </Panel>
        </aside>
      </main>

      <Sheet
        onOpenChange={(open) => {
          setCodeOpen(open);
          if (!open) setCopiedPlatform(null);
        }}
        open={codeOpen}
      >
        <SheetContent
          className="code-sheet"
          closeLabel={copy.close}
          side="bottom"
        >
          <textarea
            aria-hidden="true"
            className="code-copy-buffer"
            ref={copyBufferRef}
            tabIndex={-1}
          />
          <SheetHeader className="code-sheet-header">
            <SheetTitle>{copy.copyCode}</SheetTitle>
          </SheetHeader>
          <Tabs
            className="code-tabs"
            onValueChange={(value) => {
              if (value === "web" || value === "swift") {
                setCodePlatform(value);
                setCopiedPlatform(null);
              }
            }}
            value={codePlatform}
          >
            <div className="code-sheet-toolbar">
              <TabsList variant="control">
                <TabsTrigger value="web">Web</TabsTrigger>
                <TabsTrigger value="swift">SwiftUI</TabsTrigger>
              </TabsList>
              <Button disabled={!exportModule || !!exportError} onClick={copyCode} type="button" variant="outline">
                <CopySimpleIcon data-icon="inline-start" />
                {copiedPlatform === "error"
                  ? copy.copyFailed
                  : copiedPlatform === codePlatform
                    ? copy.copied
                    : copy.copyCode}
              </Button>
            </div>
            <TabsContent className="code-tab-content" value="web">
              <pre className="code-preview" aria-label={copy.webCode}><code>{exportError || (exportModule ? webCode : "Loading export tools…")}</code></pre>
            </TabsContent>
            <TabsContent className="code-tab-content" value="swift">
              <pre className="code-preview" aria-label={copy.swiftCode}><code>{exportError || (exportModule ? swiftCode : "Loading export tools…")}</code></pre>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
