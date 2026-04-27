"use client";

/**
 * opensimulation — FeaViewer
 *
 * Renders an FEA result as a colored triangle mesh. Vertex colors are
 * interpolated from a per-vertex scalar (von-Mises stress in Pa). When
 * per-vertex displacement is supplied, a warp-factor slider exposes the
 * classic "shape function x K" visualization.
 *
 * Scalar -> RGB uses a cheap turbo-like gradient (blue -> cyan -> yellow
 * -> red). Keep this deterministic and allocation-free on the hot path.
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export interface FeaViewerProps {
  /** Mesh vertices [x,y,z,...] in meters. */
  vertices: Float32Array;
  /** Mesh triangle indices [a,b,c,...] (surface of the tet mesh, or a triangulation). */
  indices: Uint32Array;
  /** Per-vertex scalar (von-Mises stress in Pa). Length = vertices.length / 3. */
  scalar: Float32Array;
  /** Optional per-vertex displacement [ux, uy, uz, ...]. Same order as vertices. Enables warp slider. */
  displacement?: Float32Array;
  /** Colorbar range override. Default: [min, max] of scalar. */
  range?: [number, number];
  style?: React.CSSProperties;
}

/** Cheap turbo-like colormap. t in [0,1] -> rgb in [0,1]. */
function turbo(t: number): [number, number, number] {
  const x = Math.min(Math.max(t, 0), 1);
  // 4-stop piecewise ramp: 0 blue, 0.33 cyan, 0.66 yellow, 1.0 red.
  if (x < 0.33) {
    const k = x / 0.33;
    return [0, k, 1];
  } else if (x < 0.66) {
    const k = (x - 0.33) / 0.33;
    return [k, 1, 1 - k];
  } else {
    const k = (x - 0.66) / 0.34;
    return [1, 1 - k, 0];
  }
}

/** Compute bbox + center + diagonal from packed Float32 vertices. */
function bboxFromVertices(v: Float32Array): {
  center: THREE.Vector3;
  diagonal: number;
} {
  if (v.length === 0) {
    return { center: new THREE.Vector3(0, 0, 0), diagonal: 1 };
  }
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (let i = 0; i < v.length; i += 3) {
    const x = v[i];
    const y = v[i + 1];
    const z = v[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  const dx = maxX - minX;
  const dy = maxY - minY;
  const dz = maxZ - minZ;
  return {
    center: new THREE.Vector3(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2,
    ),
    diagonal: Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 0.2),
  };
}

/** Write per-vertex colors from scalar into a packed Float32Array(3 * nVertices). */
function computeColors(
  scalar: Float32Array,
  lo: number,
  hi: number,
): Float32Array {
  const n = scalar.length;
  const out = new Float32Array(n * 3);
  const span = hi - lo;
  const inv = span > 1e-12 ? 1 / span : 0;
  for (let i = 0; i < n; i++) {
    const t = span > 1e-12 ? (scalar[i] - lo) * inv : 0.5;
    const [r, g, b] = turbo(t);
    out[i * 3] = r;
    out[i * 3 + 1] = g;
    out[i * 3 + 2] = b;
  }
  return out;
}

/** Compute scalar range, honoring an explicit override when given. */
function computeRange(
  scalar: Float32Array,
  override?: [number, number],
): [number, number] {
  if (override) return override;
  if (scalar.length === 0) return [0, 1];
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < scalar.length; i++) {
    const v = scalar[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (lo === hi) return [lo, lo + 1];
  return [lo, hi];
}

export default function FeaViewer(props: FeaViewerProps) {
  const { vertices, indices, scalar, displacement, range, style } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [warp, setWarp] = useState(0);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    mesh: THREE.Mesh | null;
    geometry: THREE.BufferGeometry | null;
    material: THREE.MeshBasicMaterial | null;
    rafId: number;
    resizeObserver: ResizeObserver | null;
  } | null>(null);

  // Init scene once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101418);

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 1000);
    camera.position.set(1.5, 1.5, 1.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const dir = new THREE.DirectionalLight(0xffffff, 0.35);
    dir.position.set(3, 5, 2);
    scene.add(ambient);
    scene.add(dir);

    const grid = new THREE.GridHelper(2, 20, 0x3a4450, 0x262c33);
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    if (resizeObserver) resizeObserver.observe(container);

    stateRef.current = {
      renderer,
      scene,
      camera,
      controls,
      mesh: null,
      geometry: null,
      material: null,
      rafId,
      resizeObserver,
    };

    return () => {
      const s = stateRef.current;
      if (!s) return;
      cancelAnimationFrame(s.rafId);
      if (s.resizeObserver) s.resizeObserver.disconnect();
      s.controls.dispose();
      if (s.mesh && s.scene) s.scene.remove(s.mesh);
      if (s.geometry) s.geometry.dispose();
      if (s.material) s.material.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      s.renderer.dispose();
      if (s.renderer.domElement.parentNode === container) {
        container.removeChild(s.renderer.domElement);
      }
      stateRef.current = null;
    };
  }, []);

  // (Re)build mesh when geometry/scalar/range changes.
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    // Drop previous mesh.
    if (s.mesh) {
      s.scene.remove(s.mesh);
      if (s.geometry) s.geometry.dispose();
      if (s.material) s.material.dispose();
      s.mesh = null;
      s.geometry = null;
      s.material = null;
    }

    if (vertices.length === 0 || indices.length === 0) return;

    const [lo, hi] = computeRange(scalar, range);

    // Position = vertices + warp * displacement.
    const positions = new Float32Array(vertices.length);
    positions.set(vertices);
    if (displacement && warp !== 0) {
      for (let i = 0; i < positions.length; i++) {
        positions[i] += warp * displacement[i];
      }
    }
    const colors = computeColors(scalar, lo, hi);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    s.scene.add(mesh);
    s.mesh = mesh;
    s.geometry = geometry;
    s.material = material;

    // Auto-frame.
    const b = bboxFromVertices(vertices);
    const distance = Math.max(2.5 * b.diagonal, 0.5);
    s.camera.position.set(
      b.center.x + distance * 0.6,
      b.center.y + distance * 0.6,
      b.center.z + distance * 0.6,
    );
    s.controls.target.copy(b.center);
    s.controls.update();
  }, [vertices, indices, scalar, displacement, range, warp]);

  const [lo, hi] = computeRange(scalar, range);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 320,
        position: "relative",
        ...style,
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {displacement ? (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "rgba(16, 20, 24, 0.75)",
            color: "#dfe7f0",
            padding: "8px 10px",
            borderRadius: 6,
            fontFamily: "system-ui, sans-serif",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <label htmlFor="fea-warp" style={{ whiteSpace: "nowrap" }}>
            Warp {warp.toFixed(1)}x
          </label>
          <input
            id="fea-warp"
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={warp}
            onChange={(e) => setWarp(parseFloat(e.target.value))}
            style={{ width: 140 }}
          />
        </div>
      ) : null}

      {/* Colorbar */}
      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          background: "rgba(16, 20, 24, 0.75)",
          color: "#dfe7f0",
          padding: "6px 8px",
          borderRadius: 6,
          fontFamily: "system-ui, sans-serif",
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>{lo.toExponential(2)}</span>
        <div
          style={{
            width: 160,
            height: 10,
            borderRadius: 2,
            background:
              "linear-gradient(to right, rgb(0,0,255) 0%, rgb(0,255,255) 33%, rgb(255,255,0) 66%, rgb(255,0,0) 100%)",
          }}
        />
        <span>{hi.toExponential(2)}</span>
        <span style={{ opacity: 0.7 }}>Pa</span>
      </div>
    </div>
  );
}
