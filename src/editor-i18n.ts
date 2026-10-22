import type { OrbParams, StyleName } from "./presets";

export type Locale = "en";

export type NumericKey = {
  [Key in keyof OrbParams]: OrbParams[Key] extends number ? Key : never;
}[keyof OrbParams];

export type ColorKey =
  | "colorA"
  | "colorB"
  | "colorC"
  | "colorD"
  | "highlightColor"
  | "shellInner"
  | "shellMid"
  | "shellEdge"
  | "sheenColor"
  | "specColor"
  | "canvasColor"
  | "glowColor"
  | "auraColor"
  | "auraColorB"
  | "auraColorC";

export const styleLabels: Record<Locale, Record<StyleName, string>> = {
  en: {
    siri: "Siri Wave",
    voiceWave: "Voice Membrane",
    spectrum: "Prismatic Field",
    aurora: "Aurora Veil",
    frost: "Frost Flow",
    plasma: "Neural Plasma",
    chrome: "Liquid Chrome",
    opal: "Iridescent Opal",
    blueDrop: "Crystal Drop",
    violetEmber: "Violet Ember",
    refractiveBlob: "Refractive Gel",
    particleRibbon: "Particle Ribbons",
    chromaticMetal: "Chromatic Metal",
    galaxyCore: "Galaxy Core",
    mysticMist: "Mystic Mist",
    crystalLight: "Crystal Light",
    spectralKaleidoscope: "Spectral Kaleidoscope",
    prismaticKaleidoscope: "Prismatic Kaleidoscope",
    mandelbrotBloom: "Mandelbrot Bloom",
    fibonacciGeometry: "Fibonacci Geometry",
    infiniteGaze: "Infinite Gaze",
    visionaryFractal: "Visionary Fractal",
  },
};

export const numericLabels: Record<Locale, Record<NumericKey, string>> = {
  en: {
    auraIntensity: "Aura Intensity",
    auraSize: "Aura Size",
    auraSpeed: "Aura Motion",
    starsDensity: "Star Count",
    starsBrightness: "Star Brightness",
    asciiSize: "Character Size",
    rotationSpeed: "Rotation Speed",
    speed: "Speed",
    radius: "Radius",
    contourDeform: "Contour Motion",
    zoom: "Flow Scale",
    warp: "Flow Distortion",
    ridgeAmt: "Ridge Detail",
    sharp: "Sharpness",
    bandDensity: "Band Count",
    metalDepth: "Metallic Depth",
    metalRoughness: "Roughness",
    chromaticShift: "RGB Split",
    metalScale: "Pattern Scale",
    metalStretch: "Aspect Stretch",
    metalAngle: "Band Angle",
    metalOffset: "Pattern Offset",
    metalPhase: "Loop Phase",
    metalEvolution: "Flow Evolution",
    particleDensity: "Particle Density",
    ribbonCount: "Ribbon Layers",
    ribbonWidth: "Ribbon Width",
    ribbonTwist: "Twist",
    ribbonFold: "Folding",
    ribbonBreath: "Breathing",
    particleSize: "Particle Size",
    particleBloom: "Particle Bloom",
    shade: "Shading",
    exposure: "Exposure",
    sheen: "Rim Highlight",
    gloss: "Dispersion",
    glassOpacity: "Refraction Strength",
    shellMidAlpha: "Refraction Width",
    shellEdgeAlpha: "Edge Intensity",
    edgeSoftness: "Edge Softness",
    edgeGlow: "Outer Glow",
  },
};

export const colorLabels: Record<Locale, Record<ColorKey, string>> = {
  en: {
    colorA: "Color A",
    colorB: "Color B",
    colorC: "Color C",
    colorD: "Color D",
    highlightColor: "Highlight Tint",
    shellInner: "Refraction Base",
    shellMid: "Cool Dispersion",
    shellEdge: "Warm Dispersion",
    sheenColor: "Key Highlight",
    specColor: "Fill Highlight",
    canvasColor: "Background",
    glowColor: "Glow Color",
    auraColor: "Aura Color A",
    auraColorB: "Aura Color B",
    auraColorC: "Aura Color C",
  },
};

export const uiCopy = {
  en: {
    documentTitle: "Liquid Figure Editor",
    presets: "Presets",
    animatedPresets: "Animated presets",
    orbControls: "Figure Controls",
    collapsePresets: "Collapse presets",
    expandPresets: "Expand presets",
    collapseControls: "Collapse controls",
    expandControls: "Expand controls",
    resetControls: "Reset all controls",
    previewMode: "Preview",
    switchPreviewMode: "Switch preview mode",
    orbMode: "Figure",
    sceneMode: "Scene",
    orbPreview: "Liquid glass figure preview",
    scenePreview: "In-context preview",
    staticOrbPreview: "Static liquid glass figure preview",
    animatedOrbPreview: "Animated liquid glass figure",
    loadingOrb: "Loading figure",
    renderFallback: "Unable to start the animated preview. Showing the fallback preview.",
    renderErrorTitle: "WebGPU rendering failed",
    sceneText: (text: string) => `Scene text: ${text}`,
    copyCode: "Copy Code",
    sceneSection: "Scene Preview",
    displayText: "Display Text",
    sceneTextLimit: "Up to 20 characters",
    stateSection: "AI State",
    orbState: "Current State",
    switchOrbState: "Switch AI orb state",
    idleState: "Idle",
    thinkingState: "Thinking",
    activationDuration: "Activation Duration",
    transitionDuration: "Settle Duration",
    collapseSection: (title: string) => `Collapse ${title}`,
    expandSection: (title: string) => `Expand ${title}`,
    editValue: (name: string) => `Edit ${name} value`,
    selectColor: (name: string) => `Choose ${name}`,
    hexValue: (name: string) => `${name} hex value`,
    hexColor: "Hex color",
    colorSurface: "Color saturation and brightness",
    colorChannel: "channel",
    cssColorValue: "CSS color value",
    hue: "Hue",
    motionSection: "Motion",
    colorsSection: "Color",
    shapeSection: "Shape Motion",
    glassSection: "Glass Shell",
    enableGlass: "Enable Glass Shell",
    edgeSection: "Edge & Glow",
    copyFailed: "Copy Failed",
    copied: "Copied",
    close: "Close",
    webCode: "Web code",
    swiftCode: "SwiftUI code",
  },
} as const;
