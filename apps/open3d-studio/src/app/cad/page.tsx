'use client';
import dynamic from 'next/dynamic';
import { useState, useMemo, useRef, useCallback } from 'react';
import { SliderInput } from '@/components/SliderInput';
import { DownloadButton } from '@/components/DownloadButton';
// Inline geometry — replaces @mw/open3d-cad (not installed)
type Mesh = { vertices: Float32Array; normals: Float32Array; indices: Uint32Array };

/** Parse binary STL file into unindexed mesh (no index buffer needed). */
function parseSTL(buffer: ArrayBuffer): Mesh {
  const view = new DataView(buffer);
  const triCount = view.getUint32(80, true);
  const verts = new Float32Array(triCount * 9);
  const norms = new Float32Array(triCount * 9);
  let off = 84;
  for (let i = 0; i < triCount; i++) {
    const nx = view.getFloat32(off, true), ny = view.getFloat32(off+4, true), nz = view.getFloat32(off+8, true);
    off += 12;
    for (let v = 0; v < 3; v++) {
      const vi = (i*3+v)*3;
      verts[vi] = view.getFloat32(off, true); verts[vi+1] = view.getFloat32(off+4, true); verts[vi+2] = view.getFloat32(off+8, true);
      norms[vi] = nx; norms[vi+1] = ny; norms[vi+2] = nz;
      off += 12;
    }
    off += 2; // attribute
  }
  return { vertices: verts, normals: norms, indices: new Uint32Array(0) };
}

function meshBounds(verts: Float32Array) {
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for (let i=0;i<verts.length;i+=3){
    if(verts[i]<minX)minX=verts[i]; if(verts[i]>maxX)maxX=verts[i];
    if(verts[i+1]<minY)minY=verts[i+1]; if(verts[i+1]>maxY)maxY=verts[i+1];
    if(verts[i+2]<minZ)minZ=verts[i+2]; if(verts[i+2]>maxZ)maxZ=verts[i+2];
  }
  return {minX,minY,minZ,maxX,maxY,maxZ,sizeX:maxX-minX,sizeY:maxY-minY,sizeZ:maxZ-minZ};
}

function createBox(w=1,h=1,d=1): Mesh {
  const hw=w/2,hh=h/2,hd=d/2;
  const v=[[-hw,-hh,-hd,hw,-hh,-hd,hw,hh,-hd,-hw,hh,-hd],[hw,-hh,-hd,hw,-hh,hd,hw,hh,hd,hw,hh,-hd],[hw,-hh,hd,-hw,-hh,hd,-hw,hh,hd,hw,hh,hd],[-hw,-hh,hd,-hw,-hh,-hd,-hw,hh,-hd,-hw,hh,hd],[-hw,hh,-hd,hw,hh,-hd,hw,hh,hd,-hw,hh,hd],[-hw,-hh,hd,hw,-hh,hd,hw,-hh,-hd,-hw,-hh,-hd]];
  const n=[[0,0,-1],[1,0,0],[0,0,1],[-1,0,0],[0,1,0],[0,-1,0]];
  const verts:number[]=[],norms:number[]=[],idx:number[]=[];
  v.forEach((face,fi)=>{const base=verts.length/3;face.forEach((_,i)=>{if(i%3===0){verts.push(face[i],face[i+1],face[i+2]);norms.push(...n[fi]);}});idx.push(base,base+1,base+2,base,base+2,base+3);});
  return {vertices:new Float32Array(verts),normals:new Float32Array(norms),indices:new Uint32Array(idx)};
}
function createSphere(r=1,seg=32): Mesh {
  const verts:number[]=[],norms:number[]=[],idx:number[]=[];
  for(let i=0;i<=seg;i++){const phi=Math.PI*i/seg;for(let j=0;j<=seg;j++){const theta=2*Math.PI*j/seg;const x=Math.sin(phi)*Math.cos(theta),y=Math.cos(phi),z=Math.sin(phi)*Math.sin(theta);verts.push(r*x,r*y,r*z);norms.push(x,y,z);}}
  for(let i=0;i<seg;i++)for(let j=0;j<seg;j++){const a=i*(seg+1)+j;idx.push(a,a+seg+1,a+1,a+1,a+seg+1,a+seg+2);}
  return {vertices:new Float32Array(verts),normals:new Float32Array(norms),indices:new Uint32Array(idx)};
}
function createCylinder(rt=1,rb=1,h=2,seg=32): Mesh {
  const verts:number[]=[],norms:number[]=[],idx:number[]=[];
  for(let i=0;i<=seg;i++){const a=2*Math.PI*i/seg,x=Math.cos(a),z=Math.sin(a);verts.push(rb*x,-h/2,rb*z);norms.push(x,0,z);verts.push(rt*x,h/2,rt*z);norms.push(x,0,z);}
  for(let i=0;i<seg;i++){const b=i*2;idx.push(b,b+2,b+1,b+1,b+2,b+3);}
  const top=verts.length/3;verts.push(0,h/2,0);norms.push(0,1,0);const bot=verts.length/3;verts.push(0,-h/2,0);norms.push(0,-1,0);
  for(let i=0;i<seg;i++){const a=2*Math.PI*i/seg,b=2*Math.PI*(i+1)/seg;const tv=top-1,bv=bot;const tx1=rt*Math.cos(a),tz1=rt*Math.sin(a),tx2=rt*Math.cos(b),tz2=rt*Math.sin(b);const ti=verts.length/3;verts.push(tx1,h/2,tz1);norms.push(0,1,0);verts.push(tx2,h/2,tz2);norms.push(0,1,0);idx.push(top,ti+1,ti);const bx1=rb*Math.cos(a),bz1=rb*Math.sin(a),bx2=rb*Math.cos(b),bz2=rb*Math.sin(b);const bi=verts.length/3;verts.push(bx1,-h/2,bz1);norms.push(0,-1,0);verts.push(bx2,-h/2,bz2);norms.push(0,-1,0);idx.push(bot,bi,bi+1);}
  return {vertices:new Float32Array(verts),normals:new Float32Array(norms),indices:new Uint32Array(idx)};
}
function createCone(r=1,h=2,seg=32): Mesh { return createCylinder(0,r,h,seg); }
function createTorus(R=1,r=0.3,seg=32,tube=16): Mesh {
  const verts:number[]=[],norms:number[]=[],idx:number[]=[];
  for(let i=0;i<=seg;i++){const u=2*Math.PI*i/seg,cu=Math.cos(u),su=Math.sin(u);for(let j=0;j<=tube;j++){const v=2*Math.PI*j/tube,cv=Math.cos(v),sv=Math.sin(v);verts.push((R+r*cv)*cu,(R+r*cv)*su,r*sv);norms.push(cv*cu,cv*su,sv);}}
  for(let i=0;i<seg;i++)for(let j=0;j<tube;j++){const a=i*(tube+1)+j;idx.push(a,a+tube+1,a+1,a+1,a+tube+1,a+tube+2);}
  return {vertices:new Float32Array(verts),normals:new Float32Array(norms),indices:new Uint32Array(idx)};
}
function createWedge(w=2,h=2,d=2): Mesh {
  const hw=w/2,hd=d/2;
  const verts=new Float32Array([-hw,0,-hd,hw,0,-hd,hw,0,hd,-hw,0,hd,-hw,h,-hd,hw,h,-hd]);
  const idx=new Uint32Array([0,1,2,0,2,3,0,4,1,1,4,5,0,3,4,4,3,5,3,2,5,2,1,5]);
  const norms=new Float32Array(verts.length);
  return {vertices:verts,normals:norms,indices:idx};
}
function createHemisphere(r=1,seg=32): Mesh {
  const verts:number[]=[],norms:number[]=[],idx:number[]=[];
  for(let i=0;i<=seg/2;i++){const phi=Math.PI*i/seg;for(let j=0;j<=seg;j++){const theta=2*Math.PI*j/seg;const x=Math.sin(phi)*Math.cos(theta),y=Math.cos(phi),z=Math.sin(phi)*Math.sin(theta);verts.push(r*x,r*y,r*z);norms.push(x,y,z);}}
  const rows=seg/2;for(let i=0;i<rows;i++)for(let j=0;j<seg;j++){const a=i*(seg+1)+j;idx.push(a,a+seg+1,a+1,a+1,a+seg+1,a+seg+2);}
  return {vertices:new Float32Array(verts),normals:new Float32Array(norms),indices:new Uint32Array(idx)};
}
function toSTL(m:Mesh): Uint8Array {
  const tris=m.indices.length/3,buf=new ArrayBuffer(84+tris*50),view=new DataView(buf);
  let off=80;view.setUint32(off,tris,true);off+=4;
  for(let i=0;i<m.indices.length;i+=3){for(let k=0;k<3;k++)view.setFloat32(off+k*4,0,true);off+=12;for(let v=0;v<3;v++){const vi=m.indices[i+v]*3;for(let k=0;k<3;k++)view.setFloat32(off+k*4,m.vertices[vi+k],true);off+=12;}view.setUint16(off,0,true);off+=2;}
  return new Uint8Array(buf);
}
function toOBJ(m:Mesh): string {
  const lines:string[]=[];
  for(let i=0;i<m.vertices.length;i+=3)lines.push(`v ${m.vertices[i].toFixed(4)} ${m.vertices[i+1].toFixed(4)} ${m.vertices[i+2].toFixed(4)}`);
  for(let i=0;i<m.normals.length;i+=3)lines.push(`vn ${m.normals[i].toFixed(4)} ${m.normals[i+1].toFixed(4)} ${m.normals[i+2].toFixed(4)}`);
  for(let i=0;i<m.indices.length;i+=3){const a=m.indices[i]+1,b=m.indices[i+1]+1,c=m.indices[i+2]+1;lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);}
  return lines.join('\n');
}

const CADPreview = dynamic(() => import('./CADPreview'), { ssr: false });

type ShapeType = 'box'|'sphere'|'cylinder'|'cone'|'torus'|'wedge'|'hemisphere';

const SHAPES: Array<{id: ShapeType; label: string}> = [
  {id:'box',label:'Box'},{id:'sphere',label:'Sphere'},{id:'cylinder',label:'Cylinder'},
  {id:'cone',label:'Cone'},{id:'torus',label:'Torus'},{id:'wedge',label:'Wedge'},
  {id:'hemisphere',label:'Hemisphere'},
];

type Mode = 'parametric' | 'import';

export default function CADPage() {
  const [mode, setMode] = useState<Mode>('parametric');
  const [shape, setShape] = useState<ShapeType>('box');
  const [width, setWidth] = useState(2);
  const [height, setHeight] = useState(2);
  const [depth, setDepth] = useState(2);
  const [radius, setRadius] = useState(1);
  const [segments, setSegments] = useState(32);
  const [importedMesh, setImportedMesh] = useState<Mesh|null>(null);
  const [importedName, setImportedName] = useState('');
  const [importStatus, setImportStatus] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);
  const vld4Ref = useRef<HTMLInputElement>(null);

  const parametricMesh = useMemo(() => {
    switch (shape) {
      case 'box': return createBox(width, height, depth);
      case 'sphere': return createSphere(radius, segments);
      case 'cylinder': return createCylinder(radius, radius, height, segments);
      case 'cone': return createCone(radius, height, segments);
      case 'torus': return createTorus(radius, radius * 0.3, segments, Math.floor(segments / 2));
      case 'wedge': return createWedge(width, height, depth);
      case 'hemisphere': return createHemisphere(radius, segments);
      default: return createBox(1, 1, 1);
    }
  }, [shape, width, height, depth, radius, segments]);

  const mesh = mode === 'import' && importedMesh ? importedMesh : parametricMesh;

  const stlData = useMemo(() => mode === 'parametric' ? toSTL(mesh) : null, [mesh, mode]);
  const objData = useMemo(() => mode === 'parametric' ? toOBJ(mesh) : null, [mesh, mode]);

  const triCount = mesh.indices.length > 0 ? mesh.indices.length / 3 : mesh.vertices.length / 9;
  const vertCount = mesh.indices.length > 0 ? mesh.vertices.length / 3 : mesh.vertices.length / 3;

  const bounds = useMemo(() => meshBounds(mesh.vertices), [mesh]);

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const buf = ev.target?.result as ArrayBuffer;
      if (!buf) return;
      const parsed = parseSTL(buf);
      setImportedMesh(parsed);
      setImportedName(file.name);
      setImportStatus('');
      setMode('import');
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const apiBase = process.env.NEXT_PUBLIC_OPEN3D_API_URL || 'http://localhost:4173';

  const handleVld4Import = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus(`Decoding ${file.name} — this can take 5–30s for large scans…`);
    setImportedName(file.name);
    try {
      const bytes = await file.arrayBuffer();
      const upload = await fetch(`${apiBase}/api/upload/vld4`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'X-Filename': file.name },
        body: bytes,
      });
      if (!upload.ok) {
        throw new Error(`upload failed (${upload.status}): ${await upload.text()}`);
      }
      const result = await upload.json() as {
        outputPath: string;
        vertexCount: number;
        faceCount: number;
        bbox: [number, number, number];
      };
      const stlResp = await fetch(`/api/download?path=${encodeURIComponent(result.outputPath)}`);
      if (!stlResp.ok) throw new Error(`download failed (${stlResp.status})`);
      const stlBuf = await stlResp.arrayBuffer();
      const parsed = parseSTL(stlBuf);
      setImportedMesh(parsed);
      setImportStatus(
        `${result.vertexCount.toLocaleString()} verts · ${result.faceCount.toLocaleString()} tris · ` +
        `${result.bbox.map(n => n.toFixed(1)).join(' × ')} mm`
      );
      setMode('import');
    } catch (err) {
      setImportStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (vld4Ref.current) vld4Ref.current.value = '';
    }
  }, [apiBase]);

  return (
    <div className="page">
      <h1>CAD</h1>
      <div className="page-layout">
        <div className="card viewer-container">
          <CADPreview vertices={mesh.vertices} normals={mesh.normals} indices={mesh.indices} />
        </div>
        <div className="sidebar">
          {/* Mode toggle */}
          <div className="card">
            <div style={{display:'flex',gap:'0.4rem'}}>
              <button className={`btn ${mode==='parametric'?'btn-primary':'btn-secondary'}`}
                style={{flex:1,fontSize:'0.8rem'}} onClick={()=>setMode('parametric')}>Parametric</button>
              <button className={`btn ${mode==='import'?'btn-primary':'btn-secondary'}`}
                style={{flex:1,fontSize:'0.8rem'}} onClick={()=>fileRef.current?.click()}>Import STL</button>
              <button className="btn btn-secondary"
                style={{flex:1,fontSize:'0.8rem'}} onClick={()=>vld4Ref.current?.click()}>Import VLD4</button>
              <input ref={fileRef} type="file" accept=".stl" style={{display:'none'}} onChange={handleFileImport}/>
              <input ref={vld4Ref} type="file" accept=".vld4" style={{display:'none'}} onChange={handleVld4Import}/>
            </div>
            {mode==='import' && importedName && (
              <div style={{marginTop:'0.5rem',fontSize:'0.75rem',color:'var(--muted)',wordBreak:'break-all'}}>{importedName}</div>
            )}
            {importStatus && (
              <div style={{marginTop:'0.35rem',fontSize:'0.72rem',color:'var(--muted)',wordBreak:'break-all'}}>{importStatus}</div>
            )}
          </div>

          {/* Parametric controls */}
          {mode === 'parametric' && (
            <>
              <div className="card">
                <span className="label">Shape</span>
                <div style={{display:'flex',flexWrap:'wrap',gap:'0.3rem',marginTop:'0.5rem'}}>
                  {SHAPES.map(s=>(
                    <button key={s.id} className={`btn ${shape===s.id?'btn-primary':'btn-secondary'}`}
                      style={{fontSize:'0.75rem',padding:'0.3rem 0.5rem'}} onClick={()=>setShape(s.id)}>{s.label}</button>
                  ))}
                </div>
              </div>
              <div className="card">
                <span className="label">Parameters</span>
                {(shape==='box'||shape==='wedge') && (
                  <>
                    <SliderInput label="Width" min={0.1} max={10} step={0.1} value={width} onChange={setWidth}/>
                    <SliderInput label="Height" min={0.1} max={10} step={0.1} value={height} onChange={setHeight}/>
                    <SliderInput label="Depth" min={0.1} max={10} step={0.1} value={depth} onChange={setDepth}/>
                  </>
                )}
                {(shape==='sphere'||shape==='hemisphere'||shape==='torus') && (
                  <SliderInput label="Radius" min={0.1} max={5} step={0.1} value={radius} onChange={setRadius}/>
                )}
                {(shape==='cylinder'||shape==='cone') && (
                  <>
                    <SliderInput label="Radius" min={0.1} max={5} step={0.1} value={radius} onChange={setRadius}/>
                    <SliderInput label="Height" min={0.1} max={10} step={0.1} value={height} onChange={setHeight}/>
                  </>
                )}
                <SliderInput label="Segments" min={6} max={64} step={2} value={segments} onChange={setSegments}/>
              </div>
            </>
          )}

          {/* Measurements (always visible) */}
          <div className="card">
            <span className="label">Measurements</span>
            <div className="info-grid">
              <div className="info-item"><span className="label">Width (X)</span><span className="value">{bounds.sizeX.toFixed(2)}{mode==='import'?' mm':''}</span></div>
              <div className="info-item"><span className="label">Depth (Y)</span><span className="value">{bounds.sizeY.toFixed(2)}{mode==='import'?' mm':''}</span></div>
              <div className="info-item"><span className="label">Height (Z)</span><span className="value">{bounds.sizeZ.toFixed(2)}{mode==='import'?' mm':''}</span></div>
            </div>
            {mode==='import' && (
              <div style={{marginTop:'0.5rem',fontSize:'0.72rem',color:'var(--muted)'}}>
                Center: ({((bounds.minX+bounds.maxX)/2).toFixed(1)}, {((bounds.minY+bounds.maxY)/2).toFixed(1)}, {((bounds.minZ+bounds.maxZ)/2).toFixed(1)}) mm
              </div>
            )}
          </div>

          {/* Mesh info */}
          <div className="card">
            <span className="label">Mesh Info</span>
            <div className="info-grid">
              <div className="info-item"><span className="label">Triangles</span><span className="value">{triCount.toLocaleString()}</span></div>
              <div className="info-item"><span className="label">Vertices</span><span className="value">{vertCount.toLocaleString()}</span></div>
            </div>
          </div>

          {mode === 'parametric' && stlData && objData && (
            <>
              <DownloadButton data={stlData} filename={`${shape}.stl`} label="Download STL"/>
              <DownloadButton data={objData} filename={`${shape}.obj`} label="Download OBJ"/>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
