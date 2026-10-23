import * as React from "react";
import { Button } from "@/toolcraft/ui/components/primitives/button";
import { PanelSection } from "@/toolcraft/ui/components/panel/panel-section";
import { audioStyleStrengths, type OrbAudioInput } from "./orb-audio";
import type { StyleName } from "./presets";

export function AudioControls({ input, style, response, onResponseChange, auraResponsive = false }: { input: OrbAudioInput; style: StyleName; response: "waves" | "impact"; onResponseChange: (response: "waves" | "impact") => void; auraResponsive?: boolean }) {
  const materialSupported = response === "impact" || audioStyleStrengths[style] !== undefined;
  const supported = materialSupported || auraResponsive;
  const [source, setSource] = React.useState<"off" | "pending" | "mic" | "file">("off");
  const [error, setError] = React.useState(false);
  const [gain, setGain] = React.useState(() => Math.round(input.gain * 100));
  const [smoothing, setSmoothing] = React.useState(() => Math.round(input.smoothing * 100));
  const [bandGain, setBandGain] = React.useState(() => ({ ...input.bandGain }));
  const bandMeters = React.useRef<Partial<Record<"low" | "mid" | "high", HTMLMeterElement>>>({});
  const fileRef = React.useRef<HTMLInputElement>(null);
  const playerRef = React.useRef<HTMLDivElement>(null);
  const meterRef = React.useRef<HTMLMeterElement>(null);
  const request = React.useRef(0);

  const stop = React.useCallback(() => {
    request.current++;
    input.stop();
    playerRef.current?.replaceChildren();
    setSource("off");
    setError(false);
  }, [input]);

  React.useEffect(() => {
    if (!supported) stop();
  }, [supported, stop]);
  React.useEffect(() => {
    const pagehide = () => stop();
    window.addEventListener("pagehide", pagehide);
    return () => {
      request.current++;
      input.stop();
      window.removeEventListener("pagehide", pagehide);
    };
  }, [input, stop]);

  React.useEffect(() => {
    let raf = 0;
    const active = source === "mic" || source === "file";
    const paint = () => {
      if (meterRef.current) meterRef.current.value = input.level;
      for (const band of ["low", "mid", "high"] as const) {
        const meter = bandMeters.current[band];
        if (meter) meter.value = input.bands[band];
      }
      if (active && !document.hidden) raf = requestAnimationFrame(paint);
    };
    const visibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) paint();
    };
    paint();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [input, source]);

  const start = async (file?: File) => {
    stop();
    const id = request.current;
    setSource("pending");
    try {
      const active = file
        ? await input.file(file, playerRef.current!)
        : await input.microphone(stop);
      if (id === request.current && active) setSource(file ? "file" : "mic");
    } catch {
      if (id !== request.current) return;
      input.stop();
      playerRef.current?.replaceChildren();
      setSource("off");
      setError(true);
    }
  };

  return <PanelSection title={"Audio response"}>
    <div className="orb-audio-controls">
      <div className="orb-audio-actions" role="group" aria-label="Audio reaction style">
        <Button variant={response === "waves" ? "default" : "outline"} aria-pressed={response === "waves"} onClick={() => onResponseChange("waves")}>Waves</Button>
        <Button variant={response === "impact" ? "default" : "outline"} aria-pressed={response === "impact"} onClick={() => onResponseChange("impact")}>Physical Impact</Button>
      </div>
      <p className="orb-audio-hint">{supported
        ? (response === "impact" ? "Bass hits compress and release the figure, mids add vibration, treble catches the light" : !materialSupported ? ("Sound drives aura size, brightness and motion") : ("Bass drives broad waves, mids drive pulses, treble adds fine vibration"))
        : ("Audio response is unavailable for this preset")}</p>
      {supported && <>
        <div className="orb-audio-actions">
          <Button variant="outline" aria-pressed={source === "mic"} disabled={source === "pending"} onClick={() => void start()}>{"Microphone"}</Button>
          <Button variant="outline" disabled={source === "pending"} onClick={() => fileRef.current?.click()}>{"Audio file"}</Button>
          {source !== "off" && <Button variant="outline" onClick={stop}>{"Stop"}</Button>}
        </div>
        <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" hidden onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void start(file);
        }} />
        <label className="orb-audio-gain">{"Sensitivity"}<output>{gain}%</output>
          <input aria-label={"Sensitivity"} type="range" min="0" max="200" value={gain} onChange={(event) => {
            const value = +event.target.value;
            setGain(value);
            input.gain = value / 100;
          }} />
        </label>
        <label className="orb-audio-gain">{"Smoothness"}<output>{smoothing}%</output>
          <input aria-label={"Smoothness"} type="range" min="0" max="100" value={smoothing} onChange={(event) => {
            const value = Number(event.target.value);
            setSmoothing(value);
            input.smoothing = value / 100;
          }} />
        </label>
        <div className="orb-audio-bands">
          {(["low", "mid", "high"] as const).map((band, index) => {
            const label = (["Bass", "Mids", "Treble"])[index];
            return <div key={band} className="orb-audio-band">
              <label className="orb-audio-gain">{label}<output>{Math.round(bandGain[band] * 100)}%</output>
                <input aria-label={`${label} response`} type="range" min="0" max="200" value={Math.round(bandGain[band] * 100)} onChange={(event) => {
                  const value = Number(event.target.value) / 100;
                  input.bandGain[band] = value;
                  setBandGain(current => ({ ...current, [band]: value }));
                }} />
              </label>
              <meter ref={element => { if (element) bandMeters.current[band] = element; else delete bandMeters.current[band]; }} min="0" max="1" value="0" aria-label={`${label} level`} />
            </div>;
          })}
        </div>
        <span className="orb-audio-hint">{"Input level"}</span>
        <meter ref={meterRef} min="0" max="1" value="0" aria-label={"Input level"} />
      </>}
      <div ref={playerRef} className="orb-audio-player" hidden={!supported || (source !== "file" && source !== "pending")} />
      <p className="orb-audio-hint" role="status">{error
        ? ("Unable to open audio. Check microphone permission or try another file.")
        : source === "pending" ? ("Opening audio…") : source === "mic" ? ("Microphone is active") : ""}</p>
    </div>
  </PanelSection>;
}
