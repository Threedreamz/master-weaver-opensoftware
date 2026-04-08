"use client";

import { useRef, useMemo, useCallback, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import * as THREE from "three";
import { useSlicerStore } from "../../stores/slicer-store";
import type { PaintMode } from "../../stores/slicer-store";

const PAINT_COLORS: Record<PaintMode, [number, number, number]> = {
  support_enforcer: [0.2, 0.9, 0.3], // green
  support_blocker: [0.9, 0.2, 0.2],  // red
  seam: [0.2, 0.4, 0.95],            // blue
};

const CURSOR_COLOR: [number, number, number] = [1, 1, 0]; // yellow cursor preview

// Custom shader that uses per-vertex RGBA (color.rgb + alpha attribute)
const paintVertexShader = /* glsl */ `
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = alpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const paintFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.01) discard;
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;

interface PaintToolProps {
  url: string;
  modelId: string;
}

/**
 * Raycaster-based face painting tool rendered inside the R3F Canvas.
 * Paints support enforcers (green), support blockers (red), or seam positions (blue)
 * onto model faces by dragging. Right-click erases.
 */
export function PaintTool({ url, modelId }: PaintToolProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const overlayRef = useRef<THREE.Mesh>(null);
  const isPainting = useRef(false);
  const isErasing = useRef(false);
  const [hoveredFace, setHoveredFace] = useState<number | null>(null);

  const {
    paintMode,
    paintBrushSize,
    modelPaintData,
    addPaintedFaces,
    removePaintedFaces,
  } = useSlicerStore();

  const geometry = useLoader(STLLoader, url);

  // Center geometry the same way as ModelLoader / FaceSelector
  const centeredGeometry = useMemo(() => {
    const geo = geometry.clone();
    geo.computeBoundingBox();
    if (geo.boundingBox) {
      const center = new THREE.Vector3();
      geo.boundingBox.getCenter(center);
      geo.translate(-center.x, -geo.boundingBox.min.y, -center.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, [geometry]);

  const vertexCount = centeredGeometry.getAttribute("position")?.count ?? 0;
  const faceCount = Math.floor(vertexCount / 3);

  // Build adjacency map: for each face, which faces share an edge or vertex
  const adjacencyMap = useMemo(() => {
    const posAttr = centeredGeometry.getAttribute("position");
    if (!posAttr || faceCount === 0) return new Map<number, number[]>();

    const vertToFaces = new Map<string, number[]>();
    const precision = 4;
    for (let fi = 0; fi < faceCount; fi++) {
      for (let v = 0; v < 3; v++) {
        const idx = fi * 3 + v;
        const key = `${posAttr.getX(idx).toFixed(precision)},${posAttr.getY(idx).toFixed(precision)},${posAttr.getZ(idx).toFixed(precision)}`;
        const arr = vertToFaces.get(key);
        if (arr) arr.push(fi);
        else vertToFaces.set(key, [fi]);
      }
    }

    const adj = new Map<number, number[]>();
    for (let fi = 0; fi < faceCount; fi++) {
      const neighbors = new Set<number>();
      for (let v = 0; v < 3; v++) {
        const idx = fi * 3 + v;
        const key = `${posAttr.getX(idx).toFixed(precision)},${posAttr.getY(idx).toFixed(precision)},${posAttr.getZ(idx).toFixed(precision)}`;
        const shared = vertToFaces.get(key);
        if (shared) {
          for (const nfi of shared) {
            if (nfi !== fi) neighbors.add(nfi);
          }
        }
      }
      adj.set(fi, Array.from(neighbors));
    }
    return adj;
  }, [centeredGeometry, faceCount]);

  // BFS to get faces within brush radius hops from a center face
  const getFacesInBrush = useCallback(
    (centerFace: number, radius: number): number[] => {
      if (radius <= 1) return [centerFace];
      const visited = new Set<number>([centerFace]);
      let frontier = [centerFace];
      for (let depth = 1; depth < radius; depth++) {
        const nextFrontier: number[] = [];
        for (const fi of frontier) {
          const neighbors = adjacencyMap.get(fi) ?? [];
          for (const nfi of neighbors) {
            if (!visited.has(nfi)) {
              visited.add(nfi);
              nextFrontier.push(nfi);
            }
          }
        }
        frontier = nextFrontier;
        if (frontier.length === 0) break;
      }
      return Array.from(visited);
    },
    [adjacencyMap]
  );

  // Build vertex colors (RGB) and alpha (separate attribute) for the overlay
  const { colorAttr, alphaAttr } = useMemo(() => {
    const colors = new Float32Array(vertexCount * 3);
    const alphas = new Float32Array(vertexCount);

    const paintData = modelPaintData[modelId];
    if (paintData) {
      const paintEntries: [PaintMode, number[]][] = [
        ["support_enforcer", paintData.supportEnforcers],
        ["support_blocker", paintData.supportBlockers],
        ["seam", paintData.seamPositions],
      ];
      for (const [mode, faces] of paintEntries) {
        const [r, g, b] = PAINT_COLORS[mode];
        for (const fi of faces) {
          const base = fi * 3;
          if (base + 2 < vertexCount) {
            for (let v = 0; v < 3; v++) {
              const vi = base + v;
              colors[vi * 3] = r;
              colors[vi * 3 + 1] = g;
              colors[vi * 3 + 2] = b;
              alphas[vi] = 0.45;
            }
          }
        }
      }
    }

    // Cursor preview highlight
    if (hoveredFace !== null && paintMode) {
      const brushFaces = getFacesInBrush(hoveredFace, paintBrushSize);
      for (const fi of brushFaces) {
        const base = fi * 3;
        if (base + 2 < vertexCount) {
          for (let v = 0; v < 3; v++) {
            const vi = base + v;
            if (alphas[vi] > 0) {
              // Already painted: brighten
              alphas[vi] = 0.7;
            } else {
              // Cursor preview
              colors[vi * 3] = CURSOR_COLOR[0];
              colors[vi * 3 + 1] = CURSOR_COLOR[1];
              colors[vi * 3 + 2] = CURSOR_COLOR[2];
              alphas[vi] = 0.25;
            }
          }
        }
      }
    }

    return {
      colorAttr: new THREE.Float32BufferAttribute(colors, 3),
      alphaAttr: new THREE.Float32BufferAttribute(alphas, 1),
    };
  }, [modelPaintData, modelId, hoveredFace, paintMode, paintBrushSize, getFacesInBrush, vertexCount]);

  // Overlay geometry with color + alpha attributes
  const overlayGeometry = useMemo(() => {
    const geo = centeredGeometry.clone();
    geo.setAttribute("color", colorAttr);
    geo.setAttribute("alpha", alphaAttr);
    return geo;
  }, [centeredGeometry, colorAttr, alphaAttr]);

  // Custom shader material for per-vertex alpha
  const overlayMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: paintVertexShader,
        fragmentShader: paintFragmentShader,
        vertexColors: true,
        transparent: true,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  const getFaceFromEvent = useCallback(
    (e: { face?: THREE.Face | null }): number | null => {
      if (!e.face) return null;
      return Math.floor(e.face.a / 3);
    },
    []
  );

  const paintAtFace = useCallback(
    (faceIndex: number, erase: boolean) => {
      if (!paintMode) return;
      const faces = getFacesInBrush(faceIndex, paintBrushSize);
      if (erase) {
        removePaintedFaces(modelId, paintMode, faces);
      } else {
        addPaintedFaces(modelId, paintMode, faces);
      }
    },
    [paintMode, paintBrushSize, modelId, getFacesInBrush, addPaintedFaces, removePaintedFaces]
  );

  const handlePointerDown = useCallback(
    (e: { stopPropagation: () => void; face?: THREE.Face | null; nativeEvent?: MouseEvent }) => {
      e.stopPropagation();
      const faceIndex = getFaceFromEvent(e);
      if (faceIndex === null) return;

      const isRightClick = e.nativeEvent?.button === 2;
      isPainting.current = !isRightClick;
      isErasing.current = isRightClick;
      paintAtFace(faceIndex, isRightClick);
    },
    [getFaceFromEvent, paintAtFace]
  );

  const handlePointerMove = useCallback(
    (e: { stopPropagation: () => void; face?: THREE.Face | null }) => {
      e.stopPropagation();
      const faceIndex = getFaceFromEvent(e);
      setHoveredFace(faceIndex);

      if (faceIndex !== null && (isPainting.current || isErasing.current)) {
        paintAtFace(faceIndex, isErasing.current);
      }
    },
    [getFaceFromEvent, paintAtFace]
  );

  const handlePointerUp = useCallback(() => {
    isPainting.current = false;
    isErasing.current = false;
  }, []);

  if (!paintMode) return null;

  return (
    <group>
      {/* Invisible raycast target */}
      <mesh
        ref={meshRef}
        geometry={centeredGeometry}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => e.stopPropagation()}
      >
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Painted faces overlay with per-vertex alpha */}
      <mesh
        ref={overlayRef}
        geometry={overlayGeometry}
        material={overlayMaterial}
      />
    </group>
  );
}
