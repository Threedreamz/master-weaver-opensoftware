'use client';
import { useState, useCallback } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { SliderInput } from '@/components/SliderInput';
import { TabSelector } from '@/components/TabSelector';
import { InfoPanel } from '@/components/InfoPanel';
import { DownloadButton } from '@/components/DownloadButton';

// These run client-side — pure math
import { SLASliceEngine, FDMSliceEngine, BUILTIN_PROFILES, listProfiles, getProfile, MeshFeasibility, generateGCode } from '@mw/open3d-slicer';
import { STLConverter } from '@mw/open3d-converter';
import type { SliceConfig, PrinterProfile, BoundingBox } from '@mw/open3d-types';

/**
 * /slicer — dual-mode page.
 *
 * - If NEXT_PUBLIC_OPENSLICER_URL is set (production / authenticated bubble
 *   deployments), render an iframe pointing at the canonical openslicer app
 *   (port 4175). openslicer handles persistence, printer profiles from the
 *   farm, and the full admin flow.
 * - Otherwise fall back to the built-in client-side PoC below — useful for
 *   guest demos, offline use, and marketing pages where openslicer isn't
 *   reachable. The PoC uses the same @mw/open3d-slicer engines and stays in
 *   sync with the canonical slicer's algorithms via that package.
 */
export default function SlicerPage() {
  const openslicerUrl = process.env.NEXT_PUBLIC_OPENSLICER_URL;
  if (openslicerUrl) {
    return (
      <div className="page" style={{ padding: 0, height: 'calc(100vh - 64px)' }}>
        <iframe
          src={openslicerUrl}
          title="OpenSlicer"
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="clipboard-read; clipboard-write"
        />
      </div>
    );
  }
  return <SlicerPoC />;
}

function SlicerPoC() {
  const [technology, setTechnology] = useState('fdm');
  const [selectedPrinter, setSelectedPrinter] = useState('bambu-x1c');
  const [layerHeight, setLayerHeight] = useState(0.2);
  const [infillDensity, setInfillDensity] = useState(0.2);
  const [wallCount, setWallCount] = useState(2);
  const [exposureTime, setExposureTime] = useState(2.5);
  const [bottomExposure, setBottomExposure] = useState(30);
  const [sliceResult, setSliceResult] = useState<Record<string, any> | null>(null);
  const [gcode, setGcode] = useState<string | null>(null);
  const [feasibility, setFeasibility] = useState<Record<string, any> | null>(null);
  const [meshLoaded, setMeshLoaded] = useState(false);
  const [meshVertices, setMeshVertices] = useState<Float32Array | null>(null);
  const [meshBBox, setMeshBBox] = useState<BoundingBox | null>(null);

  const profiles = listProfiles();
  const fdmProfiles = profiles.filter(p => p.profile.technology === 'fdm');
  const slaProfiles = profiles.filter(p => ['sla', 'msla', 'dlp'].includes(p.profile.technology));
  const currentProfiles = technology === 'fdm' ? fdmProfiles : slaProfiles;

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const converter = new STLConverter();
    try {
      const parsed = converter.parseSTL(Buffer.from(buffer));
      setMeshVertices(parsed.vertices);

      // Compute bounding box
      let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
      for (let i = 0; i < parsed.vertices.length; i += 3) {
        const x = parsed.vertices[i]!, y = parsed.vertices[i+1]!, z = parsed.vertices[i+2]!;
        if(x<minX)minX=x; if(y<minY)minY=y; if(z<minZ)minZ=z;
        if(x>maxX)maxX=x; if(y>maxY)maxY=y; if(z>maxZ)maxZ=z;
      }
      const bbox: BoundingBox = {
        min:{x:minX,y:minY,z:minZ}, max:{x:maxX,y:maxY,z:maxZ},
        center:{x:(minX+maxX)/2,y:(minY+maxY)/2,z:(minZ+maxZ)/2},
        size:{x:maxX-minX,y:maxY-minY,z:maxZ-minZ},
      };
      setMeshBBox(bbox);
      setMeshLoaded(true);

      // Feasibility check
      const printer = getProfile(selectedPrinter);
      if (printer) {
        const feas = new MeshFeasibility();
        const result = feas.suggestOrientation(bbox.size, printer);
        setFeasibility({
          Fits: result.fits ? 'Yes' : 'No',
          Orientation: result.suggestedOrientation ?? 'default',
          'Supports Needed': result.supportRequired ? 'Yes' : 'No',
          ...Object.fromEntries(result.warnings.map((w, i) => [`Warning ${i+1}`, w])),
        });
      }
    } catch { /* parse error */ }
  }, [selectedPrinter]);

  const handleSlice = useCallback(() => {
    if (!meshVertices || !meshBBox) return;
    const printer = getProfile(selectedPrinter);
    if (!printer) return;

    const config: SliceConfig = {
      printer,
      layerHeight,
      infillDensity: technology === 'fdm' ? infillDensity : undefined,
      wallCount: technology === 'fdm' ? wallCount : undefined,
      exposureTime: technology === 'sla' ? exposureTime : undefined,
      bottomExposureTime: technology === 'sla' ? bottomExposure : undefined,
    };

    const input = { vertices: meshVertices, boundingBox: meshBBox };

    if (technology === 'fdm') {
      const engine = new FDMSliceEngine();
      const result = engine.slice(input, config);
      setSliceResult({
        Layers: result.totalLayers,
        'Est. Time': `${Math.floor(result.estimatedTime / 60)}m ${Math.floor(result.estimatedTime % 60)}s`,
        'Material': `${result.estimatedMaterial.weight.toFixed(1)}g`,
      });
      // Generate G-code
      const gc = generateGCode(result.layers, {
        flavor: 'marlin', nozzleDiameter: 0.4, filamentDiameter: 1.75,
        bedTemp: 60, nozzleTemp: 210, printSpeed: 50, travelSpeed: 150,
        retractLength: 1, retractSpeed: 40,
      });
      setGcode(gc);
    } else {
      const engine = new SLASliceEngine();
      const result = engine.slice(input, config);
      setSliceResult({
        Layers: result.totalLayers,
        'Est. Time': `${Math.floor(result.estimatedTime / 60)}m`,
        'Material': `${result.estimatedMaterial.volume.toFixed(1)}ml`,
      });
    }
  }, [meshVertices, meshBBox, selectedPrinter, technology, layerHeight, infillDensity, wallCount, exposureTime, bottomExposure]);

  return (
    <div className="page">
      <h1>3D Print Slicer</h1>
      <div className="page-layout">
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          {!meshLoaded ? (
            <FileUploader accept=".stl,.obj" onFiles={handleFiles} label="Drop STL/OBJ to slice"/>
          ) : (
            <>
              {feasibility && <InfoPanel data={feasibility} title="Feasibility"/>}
              {sliceResult && <InfoPanel data={sliceResult} title="Slice Result"/>}
              {!sliceResult && <div className="card"><p style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>Configure settings and click Slice</p></div>}
            </>
          )}
        </div>
        <div className="sidebar">
          <div className="card">
            <TabSelector tabs={[{id:'fdm',label:'FDM'},{id:'sla',label:'SLA'}]} active={technology} onChange={(t)=>{setTechnology(t);setSliceResult(null);setGcode(null);}}/>
          </div>
          <div className="card">
            <span className="label">Printer</span>
            <select value={selectedPrinter} onChange={e=>setSelectedPrinter(e.target.value)} className="input" style={{marginTop:'0.25rem'}}>
              {currentProfiles.map(p=><option key={p.id} value={p.id}>{p.profile.name}</option>)}
            </select>
          </div>
          <div className="card">
            <span className="label">Settings</span>
            <SliderInput label="Layer Height" min={0.05} max={0.5} step={0.05} value={layerHeight} onChange={setLayerHeight} unit="mm"/>
            {technology === 'fdm' && (
              <>
                <SliderInput label="Infill" min={0} max={1} step={0.05} value={infillDensity} onChange={setInfillDensity} unit="%"/>
                <SliderInput label="Walls" min={1} max={5} step={1} value={wallCount} onChange={setWallCount}/>
              </>
            )}
            {technology === 'sla' && (
              <>
                <SliderInput label="Exposure" min={0.5} max={10} step={0.5} value={exposureTime} onChange={setExposureTime} unit="s"/>
                <SliderInput label="Bottom Exp." min={5} max={60} step={1} value={bottomExposure} onChange={setBottomExposure} unit="s"/>
              </>
            )}
          </div>
          <button className="btn btn-primary" onClick={handleSlice} disabled={!meshLoaded}>Slice</button>
          {technology === 'fdm' && gcode && <DownloadButton data={gcode} filename="output.gcode" label="Download G-code"/>}
          {meshLoaded && <button className="btn btn-secondary" onClick={()=>{setMeshLoaded(false);setSliceResult(null);setGcode(null);setFeasibility(null);}}>Load New</button>}
        </div>
      </div>
    </div>
  );
}
