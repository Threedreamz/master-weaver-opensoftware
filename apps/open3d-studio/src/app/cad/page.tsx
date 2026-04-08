'use client';
import dynamic from 'next/dynamic';
import { useState, useMemo } from 'react';
import { SliderInput } from '@/components/SliderInput';
import { DownloadButton } from '@/components/DownloadButton';
import { createBox, createSphere, createCylinder, createCone, createTorus, createWedge, createHemisphere, toSTL, toOBJ } from '@mw/open3d-cad';

const CADPreview = dynamic(() => import('./CADPreview'), { ssr: false });

type ShapeType = 'box'|'sphere'|'cylinder'|'cone'|'torus'|'wedge'|'hemisphere';

const SHAPES: Array<{id: ShapeType; label: string}> = [
  {id:'box',label:'Box'},{id:'sphere',label:'Sphere'},{id:'cylinder',label:'Cylinder'},
  {id:'cone',label:'Cone'},{id:'torus',label:'Torus'},{id:'wedge',label:'Wedge'},
  {id:'hemisphere',label:'Hemisphere'},
];

export default function CADPage() {
  const [shape, setShape] = useState<ShapeType>('box');
  const [width, setWidth] = useState(2);
  const [height, setHeight] = useState(2);
  const [depth, setDepth] = useState(2);
  const [radius, setRadius] = useState(1);
  const [segments, setSegments] = useState(32);

  const mesh = useMemo(() => {
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

  const stlData = useMemo(() => toSTL(mesh), [mesh]);
  const objData = useMemo(() => toOBJ(mesh), [mesh]);

  const triCount = mesh.indices.length / 3;
  const vertCount = mesh.vertices.length / 3;

  return (
    <div className="page">
      <h1>Parametric CAD</h1>
      <div className="page-layout">
        <div className="card viewer-container">
          <CADPreview vertices={mesh.vertices} normals={mesh.normals} indices={mesh.indices} />
        </div>
        <div className="sidebar">
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
          <div className="card">
            <span className="label">Info</span>
            <div className="info-grid">
              <div className="info-item"><span className="label">Triangles</span><span className="value">{triCount}</span></div>
              <div className="info-item"><span className="label">Vertices</span><span className="value">{vertCount}</span></div>
            </div>
          </div>
          <DownloadButton data={stlData} filename={`${shape}.stl`} label="Download STL"/>
          <DownloadButton data={objData} filename={`${shape}.obj`} label="Download OBJ"/>
        </div>
      </div>
    </div>
  );
}
