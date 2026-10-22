import { styleFlowIndexes, type StyleName } from "./presets";

export type AudioBands = { low: number; mid: number; high: number; all: number };
export const silentBands = (): AudioBands => ({ low: 0, mid: 0, high: 0, all: 0 });

// index, frequency band, additive amount, proportional amount, ceiling.
// Apply after the state transition, never back into saved preset parameters.
export const audioRules = [
  [3, "all", 0, 0.95, 5],
  [6, "mid", 1.15, 0, 7],
  [21, "low", 0.15, 0, 1],
  [10, "high", 0.22, 0, 2],
  [14, "all", 0, 0.12, 4],
] as const;

// Optional aura modulation uses the same bands on every material.
export const auraAudioRules = [
  [141, "mid", 0, 0.75, 1.5],
  [142, "low", 0, 0.45, 0.5],
  [143, "high", 0.8, 0, 2],
] as const;

export const audioStyleStrengths: Partial<Record<StyleName, number>> = {
  siri: 0.8, voiceWave: 1, aurora: 0.65,
  plasma: 0.65, spectrum: 0.75, violetEmber: 0.7,
  infiniteGaze: 0.7, visionaryFractal: 0.65,
};
export const audioFlowStrengths: Record<number, number> = Object.fromEntries(
  Object.entries(audioStyleStrengths).map(([style, strength]) => [styleFlowIndexes[style as StyleName], strength]),
);

export function applyAudioUniforms(values: Float32Array, bands: AudioBands): void {
  const strength = audioFlowStrengths[Math.round(values[15])] ?? 0;
  values.fill(0, 152, 156);
  if (values[140] > 0.5 && values[161] > 0.5) {
    for (const [index, band, additive, proportional, ceiling] of auraAudioRules) {
      const input = bands[band];
      const level = Number.isFinite(input) ? Math.max(0, Math.min(1, input)) : 0;
      if (!level) continue;
      values[index] = Math.min(Math.max(ceiling, values[index]), values[index] * (1 + proportional * level) + additive * level);
    }
  }
  if (!strength) return;
  const safeBand = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0) * strength;
  values.set([safeBand(bands.low), safeBand(bands.mid), safeBand(bands.high), safeBand(bands.all)], 152);
  for (const [index, band, additive, proportional, ceiling] of audioRules) {
    const input = bands[band];
    const level = (Number.isFinite(input) ? Math.max(0, Math.min(1, input)) : 0) * strength;
    if (!level) continue;
    values[index] = Math.min(Math.max(ceiling, values[index]), values[index] * (1 + proportional * level) + additive * level);
  }
}

/** Analyze linear spectral energy so band levels are independent of FFT bin count. */
export function analyzeAudioSpectrum(spectrum: Float32Array, waveform: Float32Array, sampleRate: number): AudioBands {
  const result = silentBands();
  if (!spectrum.length || !waveform.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return result;
  let sumSquares = 0;
  for (const sample of waveform) {
    if (Number.isFinite(sample)) sumSquares += sample * sample;
  }
  const rms = Math.sqrt(sumSquares / waveform.length);
  if (rms <= 0.004) return result;
  result.all = Math.min(1, (rms - 0.004) * 5.5);
  const energy = (from: number, to: number) => {
    const start = Math.max(1, Math.ceil(from / (sampleRate / 2) * spectrum.length));
    const end = Math.min(spectrum.length - 1, Math.floor(to / (sampleRate / 2) * spectrum.length));
    if (end < start) return 0;
    let power = 0;
    for (let index = start; index <= end; index++) {
      const db = spectrum[index];
      if (Number.isFinite(db)) power += 10 ** (Math.min(db, 0) / 10);
    }
    return Math.min(1, Math.sqrt(power) * 4);
  };
  result.low = energy(30, 200);
  result.mid = energy(200, 2000);
  result.high = energy(2000, 16000);
  return result;
}

/** Independent, local-only input. No microphone monitoring or network upload. */
export class OrbAudioInput {
  gain = 0.7;
  level = 0;
  smoothing = 0.45;
  bandGain = { low: 1, mid: 1, high: 1 };
  bands: AudioBands = silentBands();
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioNode | null = null;
  private stream: MediaStream | null = null;
  private player: HTMLAudioElement | null = null;
  private url: string | null = null;
  private generation = 0;
  private spectrum = new Float32Array(0);
  private waveform = new Float32Array(0);
  private smoothed = silentBands();

  stop(): void {
    this.generation++;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.source?.disconnect();
    if (this.player) {
      this.player.pause();
      this.player.removeAttribute("src");
      this.player.load();
    }
    if (this.url) URL.revokeObjectURL(this.url);
    void this.context?.close().catch(() => {});
    this.context = this.analyser = this.source = this.stream = this.player = this.url = null;
    this.smoothed = silentBands();
    this.level = 0;
    this.bands = silentBands();
  }

  private async setup(): Promise<number> {
    this.stop();
    const generation = this.generation;
    const context = new AudioContext();
    this.context = context;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.15;
    this.spectrum = new Float32Array(this.analyser.frequencyBinCount);
    this.waveform = new Float32Array(this.analyser.fftSize);
    await context.resume();
    return generation;
  }

  async microphone(onEnded: () => void): Promise<boolean> {
    const generation = await this.setup();
    if (generation !== this.generation) return false;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone unavailable");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (generation !== this.generation) {
      stream.getTracks().forEach((track) => track.stop());
      return false;
    }
    this.stream = stream;
    this.source = this.context!.createMediaStreamSource(stream);
    this.source.connect(this.analyser!);
    stream.getAudioTracks()[0].onended = () => {
      if (this.stream === stream) { this.stop(); onEnded(); }
    };
    return true;
  }

  async file(file: File, host: HTMLElement): Promise<boolean> {
    const generation = await this.setup();
    if (generation !== this.generation) return false;
    // A fresh media element avoids rebinding an element already attached to a closed context.
    const player = document.createElement("audio");
    player.controls = true;
    player.setAttribute("aria-label", file.name);
    host.replaceChildren(player);
    this.player = player;
    this.url = URL.createObjectURL(file);
    player.src = this.url;
    this.source = this.context!.createMediaElementSource(player);
    this.source.connect(this.analyser!);
    this.source.connect(this.context!.destination);
    await player.play();
    return generation === this.generation;
  }

  read(dt: number): AudioBands {
    let target = silentBands();
    const analyser = this.analyser;
    if (analyser && this.context?.state === "running" && (this.stream?.active || (this.player && !this.player.paused && !this.player.ended))) {
      analyser.getFloatFrequencyData(this.spectrum);
      analyser.getFloatTimeDomainData(this.waveform);
      target = analyzeAudioSpectrum(this.spectrum, this.waveform, this.context.sampleRate);
    }
    for (const band of ["low", "mid", "high", "all"] as const) {
      const smoothness = Math.max(0, Math.min(1, Number.isFinite(this.smoothing) ? this.smoothing : 0.45));
      const tau = target[band] > this.smoothed[band] ? 0.025 + smoothness * 0.1 : 0.09 + smoothness * 0.5;
      this.smoothed[band] += (target[band] - this.smoothed[band]) * (1 - Math.exp(-Math.max(0, Math.min(Number.isFinite(dt) ? dt : 0, 0.1)) / tau));
      if (this.smoothed[band] < 0.0001) this.smoothed[band] = 0;
    }
    this.level = this.smoothed.all;
    const gain = Number.isFinite(this.gain) ? Math.max(0, this.gain) / 0.7 : 0;
    const scale = (band: "low" | "mid" | "high") => Number.isFinite(this.bandGain[band]) ? Math.max(0, this.bandGain[band]) : 0;
    this.bands = {
      all: Math.min(1, this.smoothed.all * gain),
      low: Math.min(1, this.smoothed.low * gain * scale("low")),
      mid: Math.min(1, this.smoothed.mid * gain * scale("mid")),
      high: Math.min(1, this.smoothed.high * gain * scale("high")),
    };
    return { ...this.bands };
  }
}
