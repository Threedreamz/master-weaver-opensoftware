'use client';
import { useState, useCallback } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { TabSelector } from '@/components/TabSelector';
import { InfoPanel } from '@/components/InfoPanel';

const METHODS = [
  { id: 'apple', label: 'Apple Object Capture' },
  { id: 'reality-composer', label: 'Reality Composer' },
  { id: 'photogrammetry', label: 'Photogrammetry (COLMAP)' },
  { id: 'nerf', label: 'NeRF' },
  { id: 'gaussian-splatting', label: 'Gaussian Splatting' },
];

const APPLE_QUALITIES = [
  { value: 'preview', label: 'Preview',  hint: 'Fastest — low poly, good for testing' },
  { value: 'reduced', label: 'Reduced',  hint: 'Fast — moderate detail' },
  { value: 'medium',  label: 'Medium',   hint: 'Balanced quality/speed (default)' },
  { value: 'full',    label: 'Full',     hint: 'High detail — slower' },
  { value: 'raw',     label: 'Raw',      hint: 'Maximum detail — slowest, Apple Silicon only' },
];

const APPLE_FORMATS = [
  { value: 'usdz', hint: 'AR Quick Look, Reality Composer' },
  { value: 'obj',  hint: 'Universal mesh format' },
  { value: 'ply',  hint: 'Point cloud / mesh' },
];

const REALITY_FORMATS = [
  { value: 'usdz',    hint: 'AR Quick Look, Reality Composer Pro' },
  { value: 'reality', hint: 'Reality Composer Pro project' },
];

// All PhotogrammetrySession.Configuration options from Xcode/RealityKit
const XCODE_QUALITIES = [
  { value: 'preview',  hint: 'Fastest — low-poly preview, good for iteration' },
  { value: 'reduced',  hint: 'Fast — reduced detail, good for mobile AR' },
  { value: 'medium',   hint: 'Balanced — default quality level' },
  { value: 'full',     hint: 'High detail — production quality' },
  { value: 'raw',      hint: 'Maximum — no post-processing, Apple Silicon only' },
];

const FEATURE_SENSITIVITY = [
  { value: 'normal', hint: 'Default — works for most objects' },
  { value: 'high',   hint: 'Better for low-texture / smooth objects (slower)' },
];

const SAMPLE_ORDERING = [
  { value: 'unordered',   hint: 'Default — images can be in any order' },
  { value: 'sequential',  hint: 'Images captured in sequence (video/turntable)' },
];

const GENERIC_QUALITIES = [
  { value: 'low',    label: 'Low (fast)' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High (slow)' },
];

const METHOD_INFO: Record<string, string> = {
  apple: 'Apple Object Capture — Upload 20–100 photos from iPhone/camera. Uses RealityKit PhotogrammetrySession (macOS + Apple Silicon).',
  'reality-composer': '.objcap bundles from iPhone Object Capture, or single scan files (.usdz, .obj, .ply, .glb, .fbx). Pass the local path directly or upload a file.',
  photogrammetry: 'COLMAP — Structure from Motion + Dense reconstruction. Works on any platform.',
  nerf: 'nerfstudio — Neural Radiance Fields. Best for complex scenes. Requires GPU.',
  'gaussian-splatting': '3D Gaussian Splatting — Fast, high quality. Best for real-time viewing. Requires GPU.',
};

function RadioGroup({ options, value, onChange, name }: {
  options: { value: string; hint?: string }[];
  value: string;
  onChange: (v: string) => void;
  name: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
      {options.map(opt => (
        <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="radio" name={name} value={opt.value} checked={value === opt.value}
            onChange={() => onChange(opt.value)} style={{ marginTop: '0.15rem' }} />
          <span>
            <span style={{ fontWeight: value === opt.value ? 600 : 400, fontSize: '0.85rem' }}>
              {opt.value.toUpperCase()}
            </span>
            {opt.hint && (
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opt.hint}</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

export default function ReconstructPage() {
  const [method, setMethod] = useState('reality-composer');
  const [files, setFiles] = useState<File[]>([]);
  const [localPath, setLocalPath] = useState('');
  const [quality, setQuality] = useState('medium');
  const [outputFormat, setOutputFormat] = useState('usdz');
  // Xcode PhotogrammetrySession.Configuration
  const [xcodeQuality, setXcodeQuality] = useState('medium');
  const [featureSensitivity, setFeatureSensitivity] = useState('normal');
  const [sampleOrdering, setSampleOrdering] = useState('unordered');
  const [objectMasking, setObjectMasking] = useState(true);
  const [reprocess, setReprocess] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isApple = method === 'apple';
  const isReality = method === 'reality-composer';
  const isAppleFamily = isApple || isReality;

  const handleMethodChange = useCallback((m: string) => {
    setMethod(m);
    setFiles([]);
    setLocalPath('');
    setResult(null);
    setError(null);
    setOutputFormat('usdz');
    setQuality('medium');
  }, []);

  const handleSubmit = useCallback(async () => {
    const hasInput = files.length > 0 || localPath.trim();
    if (!hasInput) return;
    setProcessing(true);
    setError(null);
    setOutputPath(null);
    setExportPath(null);

    try {
      const formData = new FormData();
      formData.append('method', method);

      if (isReality) {
        formData.append('outputFormat', outputFormat);
        if (localPath.trim()) {
          formData.append('localPath', localPath.trim());
        } else {
          formData.append('scanFile', files[0]);
        }
        // Xcode PhotogrammetrySession.Configuration
        formData.append('quality', xcodeQuality);
        formData.append('featureSensitivity', featureSensitivity);
        formData.append('sampleOrdering', sampleOrdering);
        formData.append('isObjectMaskingEnabled', String(objectMasking));
        formData.append('reprocess', String(reprocess));
        formData.append('optimize', 'true');
      } else if (isApple) {
        files.forEach((f, i) => formData.append(`image_${i}`, f));
        formData.append('quality', quality);
        formData.append('outputFormat', outputFormat);
      } else {
        files.forEach((f, i) => formData.append(`image_${i}`, f));
        formData.append('quality', quality);
      }

      const res = await fetch('/api/reconstruct', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      if (data.outputPath) setOutputPath(data.outputPath);

      if (isReality) {
        setResult({
          Status: data.success ? '✓ Complete' : '✗ Failed',
          Format: (data.format ?? outputFormat).toUpperCase(),
          'File Size': data.fileSize ? `${(data.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A',
          'Vertex Count': data.vertexCount ? data.vertexCount.toLocaleString() : 'N/A',
          Engine: data.method ?? 'N/A',
          ...(data.imageCount ? { Images: data.imageCount } : {}),
          'Output Path': data.outputPath ?? 'N/A',
          ...(data.warnings?.length ? { Warnings: data.warnings.join(', ') } : {}),
        });
      } else if (isApple) {
        setResult({
          Status: data.success ? '✓ Complete' : '✗ Failed',
          Format: (data.outputFormat ?? outputFormat).toUpperCase(),
          'Vertex Count': data.vertexCount ? data.vertexCount.toLocaleString() : 'N/A',
          Engine: data.method ?? 'apple-object-capture',
          'Output Path': data.outputPath ?? 'N/A',
          ...(data.warnings?.length ? { Warnings: data.warnings.join(', ') } : {}),
        });
      } else {
        setResult({
          Status: data.success ? '✓ Complete' : '✗ Failed',
          'Output Path': data.outputPath ?? 'N/A',
          'Point Count': data.pointCount ?? 'N/A',
          'Vertex Count': data.vertexCount ?? 'N/A',
          ...(data.warnings?.length ? { Warnings: data.warnings.join(', ') } : {}),
        });
      }
    } catch (err) {
      setError(String(err));
    }
    setProcessing(false);
  }, [files, localPath, method, quality, outputFormat, isApple, isReality]);

  const handleExport = useCallback(async (fmt: string) => {
    if (!outputPath) return;
    setExporting(fmt);
    setExportPath(null);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputPath: outputPath, outputFormat: fmt }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.outputPath || data.stepPath) {
        setExportPath(data.outputPath ?? data.stepPath);
      } else {
        throw new Error(data.error ?? 'Export failed — no output path returned');
      }
    } catch (err) {
      setError(String(err));
    }
    setExporting(null);
  }, [outputPath]);

  const canSubmit = (files.length > 0 || (isReality && localPath.trim())) && !processing;

  return (
    <div className="page">
      <h1>3D Reconstruction</h1>
      <div className="page-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <div className="card">
            <TabSelector tabs={METHODS} active={method} onChange={handleMethodChange} />
          </div>

          {/* Reality Composer: local path input for .objcap bundles */}
          {isReality && (
            <div className="card">
              <span className="label">Local Path (.objcap bundle)</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.4rem' }}>
                .objcap bundles are macOS directories — paste the full path from Finder (Right-click → Copy as Pathname).
              </p>
              <input
                className="input"
                type="text"
                placeholder="/Users/you/Downloads/Untitled Object 4.objcap"
                value={localPath}
                onChange={e => { setLocalPath(e.target.value); setFiles([]); }}
                style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              />
            </div>
          )}

          {/* File uploader — for single scan files or images */}
          {isReality && !localPath.trim() && (
            <FileUploader
              accept=".usdz,.obj,.ply,.glb,.fbx,.dae,.abc,.objcap"
              multiple={false}
              onFiles={f => { setFiles(f); setLocalPath(''); }}
              label="Or upload a scan file (.usdz, .obj, .ply, .glb, .fbx…)"
            />
          )}
          {!isReality && (
            <FileUploader
              accept={isApple ? '.jpg,.jpeg,.png,.webp,.heic' : '.jpg,.jpeg,.png,.webp'}
              multiple={true}
              onFiles={f => setFiles(f)}
              label={isApple
                ? 'Drop 20–100 photos from iPhone / camera (HEIC, JPG, PNG)'
                : `Drop ${method === 'photogrammetry' ? '10+' : '20+'} photos`}
            />
          )}

          {/* Selected files / path preview */}
          {(files.length > 0 || localPath.trim()) && (
            <div className="card">
              {localPath.trim() ? (
                <span className="label" style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                  {localPath.trim()}
                </span>
              ) : (
                <>
                  <span className="label">{files.length} {isReality ? 'file' : 'image(s)'} selected</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
                    {files.slice(0, 6).map((f, i) => (
                      <span key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '0.15rem 0.4rem', borderRadius: 3 }}>
                        {f.name}
                      </span>
                    ))}
                    {files.length > 6 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{files.length - 6} more</span>}
                  </div>
                </>
              )}
            </div>
          )}

          {processing && (
            <div className="card">
              <span className="label">Processing…</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {isApple && 'RealityKit PhotogrammetrySession running. 5–30 min depending on quality and image count.'}
                {isReality && 'Processing scan via Reality Composer pipeline…'}
                {!isAppleFamily && 'This can take several minutes.'}
              </p>
            </div>
          )}

          {error && (
            <div className="card" style={{ borderColor: 'var(--danger)' }}>
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>
            </div>
          )}
          {result && <InfoPanel data={result} title="Result" />}

          {outputPath && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <span className="label">Output</span>
              <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all', background: 'var(--bg)', padding: '0.4rem 0.6rem', borderRadius: 4 }}>
                {outputPath}
              </code>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <a
                  href={`/api/download?path=${encodeURIComponent(outputPath)}`}
                  download
                  className="btn btn-primary"
                  style={{ textDecoration: 'none', display: 'inline-block' }}
                >
                  Download {outputPath.split('.').pop()?.toUpperCase()}
                </a>
                {outputPath.endsWith('.usdz') && (
                  <a
                    href={`/api/download?path=${encodeURIComponent(outputPath)}`}
                    rel="ar"
                    className="btn"
                    style={{ textDecoration: 'none', display: 'inline-block' }}
                    title="Opens AR Quick Look on iPhone/iPad via Safari"
                  >
                    AR Quick Look
                  </a>
                )}
              </div>
            </div>
          )}

          {outputPath && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <span className="label">Export for CAD / 3D Printing</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Convert the scan output to engineering formats via the Python pipeline.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(['stl', 'obj', 'ply', 'step', 'iges'] as const).map(fmt => (
                  <button
                    key={fmt}
                    className="btn"
                    onClick={() => handleExport(fmt)}
                    disabled={!!exporting}
                    style={{ minWidth: '4.5rem' }}
                  >
                    {exporting === fmt ? '…' : fmt.toUpperCase()}
                  </button>
                ))}
              </div>
              {exporting && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  {exporting === 'step' || exporting === 'iges'
                    ? 'Running scan-to-step (primitive fitting + B-Rep) — may take 1–2 min…'
                    : `Converting to ${exporting.toUpperCase()} via trimesh…`}
                </p>
              )}
              {exportPath && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all', background: 'var(--bg)', padding: '0.4rem 0.6rem', borderRadius: 4 }}>
                    {exportPath}
                  </code>
                  <a
                    href={`/api/download?path=${encodeURIComponent(exportPath)}`}
                    download
                    className="btn btn-primary"
                    style={{ textDecoration: 'none', display: 'inline-block', alignSelf: 'flex-start' }}
                  >
                    Download {exportPath.split('.').pop()?.toUpperCase()}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          {isApple && (
            <>
              <div className="card">
                <span className="label">Quality</span>
                <RadioGroup options={APPLE_QUALITIES} value={quality} onChange={setQuality} name="quality" />
              </div>
              <div className="card">
                <span className="label">Output Format</span>
                <RadioGroup options={APPLE_FORMATS} value={outputFormat} onChange={setOutputFormat} name="outputFormat" />
              </div>
            </>
          )}

          {isReality && (
            <>
              {/* Output format */}
              <div className="card">
                <span className="label">Output Format</span>
                <RadioGroup options={REALITY_FORMATS} value={outputFormat} onChange={setOutputFormat} name="outputFormat" />
              </div>

              {/* PhotogrammetrySession.Request.Detail */}
              <div className="card">
                <span className="label">Detail Level</span>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.2rem 0 0.4rem' }}>
                  PhotogrammetrySession.Request.Detail
                </p>
                <RadioGroup options={XCODE_QUALITIES} value={xcodeQuality} onChange={setXcodeQuality} name="xcodeQuality" />
              </div>

              {/* PhotogrammetrySession.Configuration.featureSensitivity */}
              <div className="card">
                <span className="label">Feature Sensitivity</span>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.2rem 0 0.4rem' }}>
                  configuration.featureSensitivity
                </p>
                <RadioGroup options={FEATURE_SENSITIVITY} value={featureSensitivity} onChange={setFeatureSensitivity} name="featureSensitivity" />
              </div>

              {/* PhotogrammetrySession.Configuration.sampleOrdering */}
              <div className="card">
                <span className="label">Sample Ordering</span>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.2rem 0 0.4rem' }}>
                  configuration.sampleOrdering
                </p>
                <RadioGroup options={SAMPLE_ORDERING} value={sampleOrdering} onChange={setSampleOrdering} name="sampleOrdering" />
              </div>

              {/* Toggles */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <span className="label">Options</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={objectMasking} onChange={e => setObjectMasking(e.target.checked)} />
                  <span>
                    <span style={{ fontSize: '0.85rem', fontWeight: objectMasking ? 600 : 400 }}>Object Masking</span>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      isObjectMaskingEnabled — LiDAR depth mask
                    </span>
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={reprocess} onChange={e => setReprocess(e.target.checked)} />
                  <span>
                    <span style={{ fontSize: '0.85rem', fontWeight: reprocess ? 600 : 400 }}>Force Re-process</span>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Re-run PhotogrammetrySession from images instead of using prebuilt USDZ
                    </span>
                  </span>
                </label>
              </div>
            </>
          )}

          {!isAppleFamily && (
            <div className="card">
              <span className="label">Quality</span>
              <select value={quality} onChange={e => setQuality(e.target.value)} className="input" style={{ marginTop: '0.25rem' }}>
                {GENERIC_QUALITIES.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
              </select>
            </div>
          )}

          <div className="card">
            <span className="label">About</span>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: '1.5' }}>
              {METHOD_INFO[method]}
            </p>
          </div>

          <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
            {processing
              ? (isApple ? 'Capturing…' : isReality ? 'Processing…' : 'Reconstructing…')
              : (isApple ? 'Start Object Capture' : isReality ? 'Process Scan' : 'Start Reconstruction')}
          </button>
        </div>
      </div>
    </div>
  );
}
