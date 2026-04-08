'use client';
import { useState, useCallback } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { InfoPanel } from '@/components/InfoPanel';
import { SliderInput } from '@/components/SliderInput';
import { DownloadButton } from '@/components/DownloadButton';
import { MeshAnalyzer, MeshRepairer, MeshTransformer, decimateMesh, CSGEngine } from '@mw/open3d-mesh';
import { STLConverter } from '@mw/open3d-converter';

interface MeshData {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

export default function AnalyzePage() {
  const [mesh, setMesh] = useState<MeshData | null>(null);
  const [info, setInfo] = useState<Record<string, any>>({});
  const [decimateRatio, setDecimateRatio] = useState(0.5);
  const [stlOutput, setStlOutput] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState('');

  const analyzer = new MeshAnalyzer();
  const repairer = new MeshRepairer();
  const transformer = new MeshTransformer();

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const converter = new STLConverter();
    try {
      const parsed = converter.parseSTL(Buffer.from(buffer));
      const meshData: MeshData = {
        vertices: parsed.vertices,
        normals: parsed.normals,
        indices: new Uint32Array(Array.from({ length: parsed.vertices.length / 3 }, (_, i) => i)),
      };
      setMesh(meshData);
      const analysis = analyzer.analyze(meshData.vertices, meshData.indices, meshData.normals);
      setInfo({
        Triangles: analysis.triangleCount,
        Vertices: analysis.vertexCount,
        Volume: analysis.volume?.toFixed(2) ?? 'N/A',
        'Surface Area': analysis.surfaceArea?.toFixed(2) ?? 'N/A',
        'Has Normals': analysis.hasNormals,
        'Size X': analysis.boundingBox.size.x.toFixed(1),
        'Size Y': analysis.boundingBox.size.y.toFixed(1),
        'Size Z': analysis.boundingBox.size.z.toFixed(1),
      });
    } catch { /* ignore parse errors for now */ }
  }, []);

  const handleRepair = useCallback(() => {
    if (!mesh) return;
    const result = repairer.repair(mesh.vertices, mesh.indices);
    setMesh({ vertices: result.vertices, normals: result.normals, indices: result.indices });
    setInfo(prev => ({
      ...prev,
      Vertices: result.vertices.length / 3,
      'Degenerate Removed': result.report.degenerateTrianglesRemoved,
      'Vertices Merged': result.report.duplicateVerticesMerged,
    }));
  }, [mesh]);

  const handleCenter = useCallback(() => {
    if (!mesh) return;
    const centered = transformer.center(mesh.vertices);
    setMesh({ ...mesh, vertices: centered });
  }, [mesh]);

  const handleDecimate = useCallback(() => {
    if (!mesh) return;
    const result = decimateMesh(mesh.vertices, mesh.normals, mesh.indices, decimateRatio);
    setMesh({ vertices: result.vertices, normals: result.normals, indices: result.indices });
    setInfo(prev => ({
      ...prev,
      Vertices: result.finalVertexCount,
      'Reduction': `${result.reductionPercent.toFixed(1)}%`,
    }));
  }, [mesh, decimateRatio]);

  const handleExportSTL = useCallback(() => {
    if (!mesh) return;
    // Simple binary STL export
    const triCount = mesh.indices.length / 3;
    const buf = new ArrayBuffer(84 + triCount * 50);
    const view = new DataView(buf);
    view.setUint32(80, triCount, true);
    for (let t = 0; t < triCount; t++) {
      const off = 84 + t * 50;
      const i0 = mesh.indices[t * 3]! * 3;
      view.setFloat32(off, mesh.normals[i0]!, true);
      view.setFloat32(off + 4, mesh.normals[i0 + 1]!, true);
      view.setFloat32(off + 8, mesh.normals[i0 + 2]!, true);
      for (let v = 0; v < 3; v++) {
        const idx = mesh.indices[t * 3 + v]! * 3;
        view.setFloat32(off + 12 + v * 12, mesh.vertices[idx]!, true);
        view.setFloat32(off + 16 + v * 12, mesh.vertices[idx + 1]!, true);
        view.setFloat32(off + 20 + v * 12, mesh.vertices[idx + 2]!, true);
      }
    }
    setStlOutput(new Uint8Array(buf));
  }, [mesh]);

  return (
    <div className="page">
      <h1>Mesh Analysis & Processing</h1>
      {!mesh ? (
        <FileUploader accept=".stl" onFiles={handleFiles} label="Drop STL file to analyze" />
      ) : (
        <div className="page-layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <InfoPanel data={info} title="Mesh Info" />
            <div className="card">
              <span className="label">Actions</span>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={handleRepair}>Repair Mesh</button>
                <button className="btn btn-secondary" onClick={handleCenter}>Center</button>
                <button className="btn btn-secondary" onClick={handleExportSTL}>Prepare STL</button>
              </div>
            </div>
            <div className="card">
              <span className="label">Decimation</span>
              <SliderInput label="Target Ratio" min={0.1} max={1} step={0.05} value={decimateRatio} onChange={setDecimateRatio} />
              <button className="btn btn-primary" onClick={handleDecimate} style={{ marginTop: '0.5rem' }}>Decimate</button>
            </div>
          </div>
          <div className="sidebar">
            <DownloadButton data={stlOutput} filename={`${fileName.replace('.stl', '')}_processed.stl`} label="Download STL" />
            <button className="btn btn-secondary" onClick={() => { setMesh(null); setInfo({}); setStlOutput(null); }}>Load New File</button>
          </div>
        </div>
      )}
    </div>
  );
}
