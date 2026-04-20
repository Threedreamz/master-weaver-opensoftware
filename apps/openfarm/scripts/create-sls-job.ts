/**
 * SLS Packjob Setup Script
 * Erstellt Formlabs Fuse 1 Drucker, lädt Modelle hoch und packt sie.
 *
 * Ausführen: pnpm --filter=@opensoftware/openfarm-app exec tsx scripts/create-sls-job.ts
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { createPrinter } from "../src/db/queries/printers";

const BASE_URL = "http://localhost:4174";

const FILES = [
  {
    path: "/Users/lisanne/Downloads/Batteriefachdeckel_V1.stl",
    name: "Batteriefachdeckel V1",
    quantity: 40,
    analyze: true,
  },
  {
    path: "/Users/lisanne/Downloads/2010087860.stp",
    name: "2010087860",
    quantity: 150,
    analyze: false,
  },
  {
    path: "/Users/lisanne/Downloads/roter_stecker_Final_100__DG.3mf",
    name: "Roter Stecker Final 100% DG",
    quantity: 400,
    analyze: false,
  },
  {
    path: "/Users/lisanne/Downloads/lila_stecker_V3_DG.3mf",
    name: "Lila Stecker V3 DG",
    quantity: 400,
    analyze: false,
  },
];

async function uploadModel(filePath: string, name: string): Promise<string> {
  const buffer = await readFile(filePath);
  const filename = filePath.split("/").pop()!;

  const formData = new FormData();
  formData.append("file", new Blob([buffer]), filename);
  formData.append("name", name);

  const res = await fetch(`${BASE_URL}/api/models/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Upload fehlgeschlagen für "${name}": ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.id as string;
}

async function analyzeModel(modelId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/models/${modelId}/analyze`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    console.warn(`  ⚠ Analyse fehlgeschlagen: ${JSON.stringify(err)}`);
  }
}

async function createPackingJob(
  printerId: string,
  name: string,
  buildVolume: { x: number; y: number; z: number },
  items: { modelId: string; quantity: number }[]
): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/packing/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      printerId,
      name,
      buildVolumeX: buildVolume.x,
      buildVolumeY: buildVolume.y,
      buildVolumeZ: buildVolume.z,
      items,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Packjob-Erstellung fehlgeschlagen: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.id as string;
}

async function runPacking(packingJobId: string) {
  const res = await fetch(`${BASE_URL}/api/packing/${packingJobId}/pack`, {
    method: "POST",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Packing fehlgeschlagen: ${JSON.stringify(err)}`);
  }

  return res.json();
}

async function main() {
  console.log("=== SLS Packjob Setup ===\n");

  // 1. Formlabs Fuse 1 anlegen
  console.log("1. Lege Formlabs Fuse 1 an...");
  const printer = await createPrinter({
    name: "Formlabs Fuse 1",
    technology: "sls",
    protocol: "sls4all",
    make: "Formlabs",
    model: "Fuse 1",
    buildVolumeX: 165,
    buildVolumeY: 165,
    buildVolumeZ: 300,
    ipAddress: "localhost",
    port: 44388,
  });
  console.log(`   ✓ Drucker ID: ${printer.id}`);

  // 2. Modelle hochladen
  console.log("\n2. Lade Modelle hoch...");
  const uploadedItems: { modelId: string; quantity: number }[] = [];

  for (const file of FILES) {
    process.stdout.write(`   Uploading "${file.name}"... `);
    try {
      const modelId = await uploadModel(file.path, file.name);
      console.log(`✓ (ID: ${modelId})`);

      if (file.analyze) {
        process.stdout.write(`   Analysiere Mesh (Bounding Box)... `);
        await analyzeModel(modelId);
        console.log("✓");
      }

      uploadedItems.push({ modelId, quantity: file.quantity });
    } catch (err) {
      console.error(`\n   ✗ ${err}`);
      process.exit(1);
    }
  }

  const totalParts = uploadedItems.reduce((sum, i) => sum + i.quantity, 0);
  console.log(`\n   Gesamt: ${uploadedItems.length} Modelle, ${totalParts} Teile`);

  // 3. Packjob erstellen
  const jobName = `SLS-Job Fuse1 ${new Date().toISOString().slice(0, 10)}`;
  console.log(`\n3. Erstelle Packjob "${jobName}"...`);

  const packingJobId = await createPackingJob(
    printer.id,
    jobName,
    { x: 165, y: 165, z: 300 },
    uploadedItems
  );
  console.log(`   ✓ Packjob ID: ${packingJobId}`);

  // 4. Packing ausführen
  console.log("\n4. Führe 3D-Bin-Packing aus...");
  const packResult = await runPacking(packingJobId);

  const { result, warning } = packResult;

  // 5. Ergebnis ausgeben
  console.log("\n=== Ergebnis ===");
  console.log(`Drucker:         Formlabs Fuse 1 (${printer.id})`);
  console.log(`Packjob:         ${jobName} (${packingJobId})`);
  console.log(`Gepackt:         ${result.packed} / ${totalParts} Teile`);
  if (result.unpacked?.length) {
    console.log(`Nicht gepackt:   ${result.unpacked.join(", ")}`);
  }
  console.log(`Packdichte:      ${result.utilization.toFixed(1)}%`);
  console.log(`Schichten:       ${result.layers}`);
  console.log(`Druckzeit (ca.): ${Math.round(result.estimatedTime / 60)} Minuten`);
  console.log(`Materialkosten:  ${result.estimatedCost?.toFixed(2) ?? "—"} €`);

  if (warning) {
    console.log(`\n⚠  ${warning}`);
  } else {
    console.log("\n✓ Packdichte ≥ 30% — OK");
  }

  console.log(`\n→ Im Browser öffnen: ${BASE_URL}/de/admin/packing/${packingJobId}`);
}

main().catch((err) => {
  console.error("\nFehler:", err);
  process.exit(1);
});
