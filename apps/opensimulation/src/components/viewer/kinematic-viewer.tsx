"use client";

/**
 * opensimulation — KinematicViewer
 *
 * THREE.js-based interactive viewer for kinematic chains.
 * - Serial arms (mode="arm"): connects j[i-1] -> j[i]
 * - Joint trees  (mode="tree"): uses parentIndices[i] -> i when >= 0
 *
 * Joints render as spheres, links as cylinders, optional target as a
 * wireframe cube. Auto-frames the camera to the joint bbox.
 *
 * This is a pure client component (WebGL needs DOM); every consumer must
 * either live under a "use client" ancestor or dynamic-import with ssr:false.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Vec3 } from "@/lib/kernel-types";

export interface KinematicViewerProps {
  /** World-space joint positions in DFS order. */
  jointPositions: Vec3[];
  /** Optional: parent index per joint (for drawing links). -1 means root. Same length as jointPositions. */
  parentIndices?: number[];
  /** World-space target point (for IK visualization). Drawn as wireframe cube. */
  target?: Vec3;
  /** Axis-aligned scene bounds, used for auto-framing. Default: compute from jointPositions. */
  bbox?: { min: Vec3; max: Vec3 };
  /** Visual style. "arm" = connects j[i] to j[i-1] as a serial chain. "tree" = uses parentIndices. */
  mode?: "arm" | "tree";
  style?: React.CSSProperties;
}

const JOINT_COLOR = 0x4ea3ff;
const LINK_COLOR = 0xbfcbd9;
const TARGET_COLOR = 0xff5a5a;
const JOINT_RADIUS = 0.03;
const LINK_RADIUS = 0.012;
const TARGET_SIZE = 0.05;

/** Compute bbox from a list of Vec3 joint positions. */
function bboxFromJoints(
  joints: Vec3[],
): { min: Vec3; max: Vec3; center: Vec3; diagonal: number } {
  if (joints.length === 0) {
    return {
      min: { x: -0.5, y: -0.5, z: -0.5 },
      max: { x: 0.5, y: 0.5, z: 0.5 },
      center: { x: 0, y: 0, z: 0 },
      diagonal: 1,
    };
  }
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (const j of joints) {
    if (j.x < minX) minX = j.x;
    if (j.y < minY) minY = j.y;
    if (j.z < minZ) minZ = j.z;
    if (j.x > maxX) maxX = j.x;
    if (j.y > maxY) maxY = j.y;
    if (j.z > maxZ) maxZ = j.z;
  }
  const dx = maxX - minX;
  const dy = maxY - minY;
  const dz = maxZ - minZ;
  const diagonal = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 0.2);
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
    diagonal,
  };
}

/** Build a cylinder that spans world-space points a -> b. */
function makeLink(a: Vec3, b: Vec3, material: THREE.Material): THREE.Mesh {
  const vA = new THREE.Vector3(a.x, a.y, a.z);
  const vB = new THREE.Vector3(b.x, b.y, b.z);
  const dir = new THREE.Vector3().subVectors(vB, vA);
  const length = dir.length();
  const geom = new THREE.CylinderGeometry(LINK_RADIUS, LINK_RADIUS, length || 0.001, 12);
  const mesh = new THREE.Mesh(geom, material);
  mesh.position.copy(vA).addScaledVector(dir, 0.5);
  if (length > 1e-8) {
    // Cylinder is built along +Y; rotate so +Y aligns with dir.
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      up,
      dir.clone().normalize(),
    );
    mesh.quaternion.copy(quat);
  }
  return mesh;
}

export default function KinematicViewer(
  props: KinematicViewerProps,
) {
  const { jointPositions, parentIndices, target, bbox, mode = "arm", style } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    group: THREE.Group;
    jointMaterial: THREE.MeshStandardMaterial;
    linkMaterial: THREE.MeshStandardMaterial;
    targetMaterial: THREE.LineBasicMaterial;
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

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const dir = new THREE.DirectionalLight(0xffffff, 0.75);
    dir.position.set(3, 5, 2);
    scene.add(ambient);
    scene.add(dir);

    const grid = new THREE.GridHelper(2, 20, 0x3a4450, 0x262c33);
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const group = new THREE.Group();
    scene.add(group);

    const jointMaterial = new THREE.MeshStandardMaterial({
      color: JOINT_COLOR,
      metalness: 0.1,
      roughness: 0.6,
    });
    const linkMaterial = new THREE.MeshStandardMaterial({
      color: LINK_COLOR,
      metalness: 0.2,
      roughness: 0.5,
    });
    const targetMaterial = new THREE.LineBasicMaterial({ color: TARGET_COLOR });

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
      group,
      jointMaterial,
      linkMaterial,
      targetMaterial,
      rafId,
      resizeObserver,
    };

    return () => {
      const s = stateRef.current;
      if (!s) return;
      cancelAnimationFrame(s.rafId);
      if (s.resizeObserver) s.resizeObserver.disconnect();
      s.controls.dispose();
      // Dispose all geometries and materials we created.
      s.group.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
      });
      s.jointMaterial.dispose();
      s.linkMaterial.dispose();
      s.targetMaterial.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      s.renderer.dispose();
      if (s.renderer.domElement.parentNode === container) {
        container.removeChild(s.renderer.domElement);
      }
      stateRef.current = null;
    };
  }, []);

  // Rebuild kinematic content whenever inputs change.
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;

    // Clear previous content.
    for (let i = s.group.children.length - 1; i >= 0; i--) {
      const child = s.group.children[i];
      s.group.remove(child);
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    }

    // Joints.
    for (const j of jointPositions) {
      const geom = new THREE.SphereGeometry(JOINT_RADIUS, 16, 12);
      const mesh = new THREE.Mesh(geom, s.jointMaterial);
      mesh.position.set(j.x, j.y, j.z);
      s.group.add(mesh);
    }

    // Links.
    if (mode === "arm") {
      for (let i = 1; i < jointPositions.length; i++) {
        s.group.add(makeLink(jointPositions[i - 1], jointPositions[i], s.linkMaterial));
      }
    } else if (mode === "tree" && parentIndices) {
      for (let i = 0; i < jointPositions.length; i++) {
        const p = parentIndices[i];
        if (p !== undefined && p >= 0 && p < jointPositions.length) {
          s.group.add(makeLink(jointPositions[p], jointPositions[i], s.linkMaterial));
        }
      }
    }

    // Target cube (wireframe).
    if (target) {
      const half = TARGET_SIZE / 2;
      const boxGeom = new THREE.BoxGeometry(TARGET_SIZE, TARGET_SIZE, TARGET_SIZE);
      const edges = new THREE.EdgesGeometry(boxGeom);
      const line = new THREE.LineSegments(edges, s.targetMaterial);
      line.position.set(target.x, target.y, target.z);
      s.group.add(line);
      // BoxGeometry + EdgesGeometry both stay attached to `line` — traverse disposes them above.
      // Discard the BoxGeometry immediately since edges already captured its topology.
      boxGeom.dispose();
      // Guard unused var in case TS strict noUnusedLocals complains.
      void half;
    }

    // Auto-frame.
    const b = bbox
      ? {
          min: bbox.min,
          max: bbox.max,
          center: {
            x: (bbox.min.x + bbox.max.x) / 2,
            y: (bbox.min.y + bbox.max.y) / 2,
            z: (bbox.min.z + bbox.max.z) / 2,
          },
          diagonal: Math.max(
            Math.sqrt(
              (bbox.max.x - bbox.min.x) ** 2 +
                (bbox.max.y - bbox.min.y) ** 2 +
                (bbox.max.z - bbox.min.z) ** 2,
            ),
            0.2,
          ),
        }
      : bboxFromJoints(jointPositions);

    const distance = Math.max(2.5 * b.diagonal, 0.5);
    s.camera.position.set(
      b.center.x + distance * 0.6,
      b.center.y + distance * 0.6,
      b.center.z + distance * 0.6,
    );
    s.controls.target.set(b.center.x, b.center.y, b.center.z);
    s.controls.update();
  }, [jointPositions, parentIndices, target, bbox, mode]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 320,
        position: "relative",
        ...style,
      }}
    />
  );
}
