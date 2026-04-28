export const runtime = "nodejs";
export const dynamic = "force-static";

import { NextResponse } from "next/server";
import { solveFeaStatic } from "@/lib/solvers/fea-static";
import { surfaceTrianglesOfTet } from "@/lib/sim/surface-extract";
import {
  cantileverBeamMesh,
  BEAM_FIXED_FACE_NODES,
  BEAM_LOADED_FACE_NODES,
} from "@/lib/sim/demo-mesh";
import type { BoundaryCondition } from "@/lib/kernel-types";

/**
 * Public demo endpoint — no auth.
 *
 * Runs the FEA static solver once on a canonical 8-vertex / 5-tet cantilever
 * beam, memoizes the result in module scope, and serves it to the landing
 * page so anonymous visitors see a real 3D simulation rendered in their
 * browser. The mesh + load case + material are deterministic so the response
 * is byte-stable and CDN-cacheable.
 */

interface DemoResult {
  vertices: number[];
  surfaceIndices: number[];
  vonMises: number[];
  displacements: number[];
  maxStressMPa: number;
  maxDisplacementMm: number;
  meta: {
    label: string;
    description: string;
    materialName: string;
    loadDescription: string;
  };
}

let cached: DemoResult | null = null;

function computeDemo(): DemoResult {
  const mesh = cantileverBeamMesh();
  const bcs: BoundaryCondition[] = [
    { kind: "fix", nodeIds: BEAM_FIXED_FACE_NODES },
    {
      kind: "load",
      nodeIds: BEAM_LOADED_FACE_NODES,
      // -Z load on the free face → classic cantilever droop.
      magnitude: { x: 0, y: 0, z: -2.5e5 },
    },
  ];
  const result = solveFeaStatic({
    mesh,
    material: { youngModulus: 2.0e11, poisson: 0.3 },
    boundaryConditions: bcs,
  });
  const surfaceIndices = surfaceTrianglesOfTet(mesh.tets);

  return {
    vertices: Array.from(mesh.vertices),
    surfaceIndices: Array.from(surfaceIndices),
    vonMises: Array.from(result.vonMises),
    displacements: Array.from(result.displacements),
    maxStressMPa: result.maxStressMpa,
    maxDisplacementMm: result.maxDisplacementMm,
    meta: {
      label: "Cantilever beam · linear-elastic FEA",
      description:
        "2 × 1 × 1 m steel beam clamped at the left face, 250 kN downward load distributed across the right face. Solved in-browser by the same TypeScript Cholesky kernel that backs production runs.",
      materialName: "Steel (E=200 GPa, ν=0.3)",
      loadDescription: "−Z load 1.0 MN total · 4 nodes · clamped left face",
    },
  };
}

export async function GET() {
  if (cached === null) {
    cached = computeDemo();
  }
  return NextResponse.json(cached, {
    headers: {
      // Edge-cache for an hour — the response is deterministic and tiny.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
