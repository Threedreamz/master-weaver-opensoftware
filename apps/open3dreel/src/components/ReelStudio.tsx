"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Play, Download, Link2, Check, Loader2, Film } from "lucide-react";
import { ModelRenderer, type LightingPreset, type RotationType, type ZoomPreset } from "./ModelRenderer";

type Step = "upload" | "configure" | "generate" | "done";
type Aspect = "9:16" | "1:1" | "16:9";
type ModelFormat = "stl" | "obj" | "gltf" | "glb";

const MUSIC_TRACKS: { id: string; label: string; url: string }[] = [
  { id: "none", label: "No music", url: "" },
  // Mixkit free preview URLs — to be replaced with licensed tracks before launch.
  { id: "cinematic", label: "Cinematic", url: "https://assets.mixkit.co/music/preview/mixkit-cinematic-dramatic-trailer-music-3946-preview.mp3" },
  { id: "electronic", label: "Electronic", url: "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130-preview.mp3" },
  { id: "ambient", label: "Ambient", url: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443-preview.mp3" },
];

// Preview canvas pixel sizes per aspect — kept generous so the recording is
// crisp on social platforms.
const ASPECT_DIMS: Record<Aspect, { w: number; h: number }> = {
  "9:16": { w: 360, h: 640 },
  "1:1": { w: 480, h: 480 },
  "16:9": { w: 640, h: 360 },
};

export function ReelStudio() {
  const [step, setStep] = useState<Step>("upload");

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Config state
  const [duration, setDuration] = useState(15);
  const [rotation, setRotation] = useState<RotationType>("turntable");
  const [lighting, setLighting] = useState<LightingPreset>("product");
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [zoom, setZoom] = useState<ZoomPreset>("medium");
  const [bgColor, setBgColor] = useState("#0a0a0f");
  const [musicTrack, setMusicTrack] = useState("none");
  const [watermark, setWatermark] = useState(true);

  // Job + recording state
  const [jobId, setJobId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const modelFormat: ModelFormat | null = file
    ? (file.name.split(".").pop()?.toLowerCase() as ModelFormat)
    : null;

  // ── Upload — file stays in the browser ─────────────────────────────────
  const handleFile = useCallback((f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["stl", "obj", "gltf", "glb"].includes(ext)) {
      setUploadError("Only STL, OBJ, GLTF, GLB files are supported.");
      return;
    }
    if (f.size > 200 * 1024 * 1024) {
      setUploadError("File too large (max 200MB).");
      return;
    }
    setFile(f);
    setUploadError(null);
    setModelUrl(URL.createObjectURL(f));
    setStep("configure");
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  // ── Generate ───────────────────────────────────────────────────────────
  const startGenerate = useCallback(async () => {
    if (!file || !modelFormat || !canvasRef.current) return;
    setGenError(null);
    setStep("generate");
    setRecording(true);
    setProgress(0);

    let audioCtx: AudioContext | null = null;
    let audioEl: HTMLAudioElement | null = null;

    try {
      const trackUrl = MUSIC_TRACKS.find((t) => t.id === musicTrack)?.url || null;

      const jobRes = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          modelFilename: file.name,
          modelFormat,
          durationS: duration,
          rotation,
          lighting,
          aspect,
          bgColor,
          musicTrackUrl: trackUrl,
          watermarkEnabled: watermark,
          zoom,
        }),
      });
      if (!jobRes.ok) throw new Error("Failed to create job");
      const { job } = await jobRes.json();
      setJobId(job.id);

      await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start_rendering" }),
      });

      const canvas = canvasRef.current;
      const videoStream = canvas.captureStream(30);

      if (trackUrl) {
        try {
          audioCtx = new AudioContext();
          audioEl = new Audio(trackUrl);
          audioEl.crossOrigin = "anonymous";
          audioEl.loop = true;
          const source = audioCtx.createMediaElementSource(audioEl);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination);
          dest.stream.getAudioTracks().forEach((t) => videoStream.addTrack(t));
          await audioEl.play();
        } catch (audioErr) {
          console.warn("[reel] audio mix failed — recording without sound:", audioErr);
        }
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "video/mp4";

      const recorder = new MediaRecorder(videoStream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const startTs = Date.now();
      const durationMs = duration * 1000;
      const ticker = setInterval(() => {
        const pct = Math.min(100, Math.round(((Date.now() - startTs) / durationMs) * 100));
        setProgress(pct);
        if (pct >= 100) clearInterval(ticker);
      }, 200);

      await new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve();
        recorder.onerror = (e) => reject(new Error("Recorder error: " + String(e)));
        recorder.start(500);
        setTimeout(() => recorder.stop(), durationMs);
      });
      clearInterval(ticker);
      setProgress(100);

      audioEl?.pause();
      await audioCtx?.close();

      const outputBlob = new Blob(chunks, { type: mimeType });
      const uploadRes = await fetch(`/api/jobs/${job.id}/upload-output`, {
        method: "POST",
        headers: { "content-type": mimeType },
        body: outputBlob,
      });
      if (!uploadRes.ok) throw new Error("Failed to store reel");

      setOutputUrl(`/api/jobs/${job.id}/output`);
      setStep("done");
    } catch (err) {
      audioEl?.pause();
      await audioCtx?.close().catch(() => {});
      setGenError(err instanceof Error ? err.message : "Generation failed");
      setStep("configure");
    } finally {
      setRecording(false);
    }
  }, [file, modelFormat, duration, rotation, lighting, aspect, bgColor, musicTrack, watermark, zoom]);

  const copyShareLink = useCallback(() => {
    if (!jobId) return;
    const url = `${window.location.origin}/reel/${jobId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [jobId]);

  const dims = ASPECT_DIMS[aspect];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(240 8% 4%)" }}>
      <header className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "hsl(240 4% 16%)" }}>
        <Film className="w-6 h-6" style={{ color: "hsl(43 99% 62%)" }} />
        <span className="font-semibold text-lg tracking-tight">Open3DReel</span>
        <span className="text-sm ml-1" style={{ color: "hsl(240 5% 52%)" }}>
          — 3D Model to Product Video
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: live preview canvas */}
        <div className="flex-1 flex items-center justify-center p-6" style={{ background: "hsl(240 8% 5%)" }}>
          {modelUrl && modelFormat ? (
            <div className="relative rounded-xl overflow-hidden shadow-2xl" style={{ width: dims.w, height: dims.h }}>
              <ModelRenderer
                modelUrl={modelUrl}
                modelFormat={modelFormat}
                lighting={lighting}
                rotation={rotation}
                bgColor={bgColor}
                durationS={duration}
                watermarkEnabled={watermark}
                zoom={zoom}
                onCanvasReady={(c) => {
                  canvasRef.current = c;
                }}
              />
              {watermark && (
                <div
                  className="absolute bottom-3 right-3 text-xs font-medium px-2 py-0.5 rounded"
                  style={{
                    background: "rgba(254,200,62,0.15)",
                    color: "hsl(43 99% 62%)",
                    border: "1px solid rgba(254,200,62,0.3)",
                  }}
                >
                  3dreel.app
                </div>
              )}
              {recording && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${progress}%`, background: "hsl(43 99% 62%)" }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4" style={{ color: "hsl(240 5% 52%)" }}>
              <Film className="w-16 h-16 opacity-30" />
              <p className="text-sm">Upload a 3D model to preview</p>
            </div>
          )}
        </div>

        {/* Right: control panel */}
        <aside className="w-80 flex flex-col gap-6 p-6 border-l overflow-y-auto" style={{ borderColor: "hsl(240 4% 16%)" }}>
          <Section title="1 · Model">
            {file ? (
              <div className="flex items-center gap-2 text-sm p-3 rounded-lg" style={{ background: "hsl(240 6% 7%)", border: "1px solid hsl(240 4% 16%)" }}>
                <Check className="w-4 h-4 shrink-0" style={{ color: "hsl(43 99% 62%)" }} />
                <span className="truncate">{file.name}</span>
                <button
                  onClick={() => {
                    setFile(null);
                    setModelUrl(null);
                    setStep("upload");
                  }}
                  className="ml-auto text-xs shrink-0 hover:opacity-70"
                  style={{ color: "hsl(240 5% 52%)" }}
                >
                  Change
                </button>
              </div>
            ) : (
              <label
                className="flex flex-col items-center gap-3 p-6 rounded-xl cursor-pointer transition-colors"
                style={{
                  background: isDragOver ? "hsl(240 6% 10%)" : "hsl(240 6% 7%)",
                  border: `2px dashed ${isDragOver ? "hsl(43 99% 62%)" : "hsl(240 4% 20%)"}`,
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDrop}
              >
                <Upload className="w-8 h-8" style={{ color: "hsl(240 5% 52%)" }} />
                <span className="text-sm text-center whitespace-pre-line" style={{ color: "hsl(240 5% 52%)" }}>
                  {"Drop STL · GLB · OBJ · GLTF\nor click to browse"}
                </span>
                <input type="file" className="hidden" accept=".stl,.glb,.obj,.gltf" onChange={onFileChange} />
              </label>
            )}
            {uploadError && (
              <p className="text-xs mt-2" style={{ color: "#f87171" }}>
                {uploadError}
              </p>
            )}
          </Section>

          <Section title="2 · Configure" disabled={step === "upload"}>
            <FieldGroup label="Format (Aspect Ratio)">
              <div className="grid grid-cols-3 gap-2">
                {(["9:16", "1:1", "16:9"] as Aspect[]).map((a) => (
                  <Pill key={a} active={aspect === a} onClick={() => setAspect(a)}>
                    {a}
                  </Pill>
                ))}
              </div>
              <div className="text-[10px] mt-1" style={{ color: "hsl(240 5% 40%)" }}>
                {aspect === "9:16" && "Reels · TikTok · Shorts"}
                {aspect === "1:1" && "Instagram Feed · LinkedIn"}
                {aspect === "16:9" && "YouTube · Web"}
              </div>
            </FieldGroup>

            <FieldGroup label="Duration">
              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 20, 30].map((s) => (
                  <Pill key={s} active={duration === s} onClick={() => setDuration(s)}>
                    {s}s
                  </Pill>
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label="Rotation">
              <div className="grid grid-cols-3 gap-2">
                {(["turntable", "orbit", "oscillate"] as RotationType[]).map((r) => (
                  <Pill key={r} active={rotation === r} onClick={() => setRotation(r)} small>
                    {r}
                  </Pill>
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label="Lighting">
              <div className="grid grid-cols-2 gap-2">
                {(["product", "studio", "dramatic", "neon"] as LightingPreset[]).map((l) => (
                  <Pill key={l} active={lighting === l} onClick={() => setLighting(l)} small>
                    {l}
                  </Pill>
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label="Zoom">
              <div className="grid grid-cols-3 gap-2">
                {(["near", "medium", "far"] as ZoomPreset[]).map((z) => (
                  <Pill key={z} active={zoom === z} onClick={() => setZoom(z)} small>
                    {z}
                  </Pill>
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label="Background">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-10 h-8 rounded cursor-pointer border-0"
                  style={{ background: "none" }}
                />
                <span className="text-sm font-mono" style={{ color: "hsl(240 5% 52%)" }}>
                  {bgColor}
                </span>
                <div className="flex gap-1 ml-auto">
                  {["#0a0a0f", "#050508", "#0f0f0f", "#06060e", "#ffffff"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setBgColor(c)}
                      className="w-5 h-5 rounded-full border-2"
                      style={{ background: c, borderColor: bgColor === c ? "hsl(43 99% 62%)" : "transparent" }}
                      aria-label={`set bg ${c}`}
                    />
                  ))}
                </div>
              </div>
            </FieldGroup>

            <FieldGroup label="Music">
              <select
                value={musicTrack}
                onChange={(e) => setMusicTrack(e.target.value)}
                className="w-full py-2 px-3 rounded text-sm"
                style={{
                  background: "hsl(240 6% 7%)",
                  color: "hsl(0 0% 95%)",
                  border: "1px solid hsl(240 4% 16%)",
                }}
              >
                {MUSIC_TRACKS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FieldGroup>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={watermark}
                onChange={(e) => setWatermark(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm" style={{ color: "hsl(0 0% 95%)" }}>
                Watermark (3dreel.app)
              </span>
            </label>
          </Section>

          <Section title="3 · Generate" disabled={step === "upload"}>
            {genError && (
              <p className="text-xs mb-3" style={{ color: "#f87171" }}>
                {genError}
              </p>
            )}
            {step === "generate" && recording && (
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1" style={{ color: "hsl(240 5% 52%)" }}>
                  <span>Recording reel…</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(240 6% 7%)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, background: "hsl(43 99% 62%)" }}
                  />
                </div>
              </div>
            )}
            <button
              onClick={startGenerate}
              disabled={!file || recording || step === "generate"}
              className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
              style={{ background: "hsl(43 99% 62%)", color: "hsl(240 6% 5%)" }}
            >
              {recording ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Recording…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Generate Reel
                </>
              )}
            </button>
          </Section>

          {step === "done" && outputUrl && (
            <Section title="Done!" highlight>
              <div className="flex gap-2">
                <a
                  href={outputUrl}
                  download={`open3dreel-${jobId}.webm`}
                  className="flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:opacity-80"
                  style={{ background: "hsl(240 6% 7%)", color: "hsl(0 0% 95%)", border: "1px solid hsl(240 4% 16%)" }}
                >
                  <Download className="w-4 h-4" /> Download
                </a>
                <button
                  onClick={copyShareLink}
                  className="flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:opacity-80"
                  style={{ background: "hsl(240 6% 7%)", color: "hsl(0 0% 95%)", border: "1px solid hsl(240 4% 16%)" }}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" /> Share Link
                    </>
                  )}
                </button>
              </div>
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  disabled,
  highlight,
}: {
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <section className={disabled ? "opacity-40 pointer-events-none" : ""}>
      <h2
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: highlight ? "hsl(43 99% 62%)" : "hsl(240 5% 52%)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <label className="text-xs font-medium" style={{ color: "hsl(240 5% 52%)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
  small,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-1.5 rounded font-medium capitalize transition-colors ${small ? "text-xs" : "text-sm"}`}
      style={{
        background: active ? "hsl(43 99% 62%)" : "hsl(240 6% 7%)",
        color: active ? "hsl(240 6% 5%)" : "hsl(0 0% 95%)",
        border: "1px solid hsl(240 4% 16%)",
      }}
    >
      {children}
    </button>
  );
}
