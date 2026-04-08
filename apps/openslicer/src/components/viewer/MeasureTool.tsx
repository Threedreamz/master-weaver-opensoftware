"use client";

import { useState, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";

interface MeasureToolProps {
  active: boolean;
}

export function MeasureTool({ active }: MeasureToolProps) {
  const [points, setPoints] = useState<THREE.Vector3[]>([]);
  const { scene, camera, raycaster, gl } = useThree();

  // Clear points when deactivated or on Escape
  useEffect(() => {
    if (!active) {
      setPoints([]);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPoints([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active]);

  // Click handler for placing measurement points
  useEffect(() => {
    if (!active) return;

    const canvas = gl.domElement;
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Intersect with all meshes in the scene
      const intersects = raycaster.intersectObjects(scene.children, true);

      // Filter out gizmo helpers etc, only hit real meshes
      const hit = intersects.find(
        (i) =>
          i.object instanceof THREE.Mesh &&
          i.object.visible &&
          !(i.object.userData?.isMeasurePoint)
      );

      if (hit) {
        setPoints((prev) => {
          const next = [...prev, hit.point.clone()];
          // Max 3 points, then cycle (reset to just this new point)
          if (next.length > 3) {
            return [hit.point.clone()];
          }
          return next;
        });
      }
    };

    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [active, scene, camera, raycaster, gl]);

  // Compute distance between first two points
  const distance = useMemo(() => {
    if (points.length >= 2) {
      return points[0].distanceTo(points[1]);
    }
    return null;
  }, [points]);

  // Compute angle between three points (angle at point[1])
  const angle = useMemo(() => {
    if (points.length >= 3) {
      const v1 = new THREE.Vector3().subVectors(points[0], points[1]).normalize();
      const v2 = new THREE.Vector3().subVectors(points[2], points[1]).normalize();
      const rad = Math.acos(THREE.MathUtils.clamp(v1.dot(v2), -1, 1));
      return THREE.MathUtils.radToDeg(rad);
    }
    return null;
  }, [points]);

  // Midpoint for the distance label
  const midpoint = useMemo(() => {
    if (points.length >= 2) {
      return new THREE.Vector3().addVectors(points[0], points[1]).multiplyScalar(0.5);
    }
    return null;
  }, [points]);

  // Convert points to flat array for drei Line
  const linePoints = useMemo(() => {
    if (points.length < 2) return null;
    return points.map((p) => [p.x, p.y, p.z] as [number, number, number]);
  }, [points]);

  if (!active) return null;

  return (
    <group>
      {/* Measurement point spheres */}
      {points.map((pt, i) => (
        <mesh key={i} position={pt} userData={{ isMeasurePoint: true }}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      ))}

      {/* Dashed line between points */}
      {linePoints && (
        <Line
          points={linePoints}
          color="#f59e0b"
          lineWidth={1.5}
          dashed
          dashSize={2}
          gapSize={1}
        />
      )}

      {/* Distance label */}
      {midpoint && distance !== null && (
        <Html position={midpoint} center style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-md bg-zinc-900/90 border border-zinc-700 px-2 py-1 text-xs text-zinc-200 shadow-lg backdrop-blur-sm">
            <span className="font-medium text-amber-400">
              {distance.toFixed(2)} mm
            </span>
          </div>
        </Html>
      )}

      {/* Angle label at the middle point (point[1]) */}
      {points.length >= 3 && angle !== null && (
        <Html position={points[1]} center style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-md bg-zinc-900/90 border border-zinc-700 px-2 py-1 text-xs text-zinc-200 shadow-lg backdrop-blur-sm mt-6">
            <span className="font-medium text-amber-400">
              {angle.toFixed(1)}&deg;
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
