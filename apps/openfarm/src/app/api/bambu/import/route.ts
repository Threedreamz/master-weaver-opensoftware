import { NextResponse } from "next/server";
import { bambuListDevices } from "@/lib/adapters/bambu-cloud-adapter";
import { db } from "@/db";
import { farmPrinters } from "@/db/schema";
import { eq } from "drizzle-orm";

// Map Bambu model names to build volumes
const BAMBU_BUILD_VOLUMES: Record<string, { x: number; y: number; z: number }> = {
  "X1C":      { x: 256, y: 256, z: 256 },
  "X1":       { x: 256, y: 256, z: 256 },
  "X1E":      { x: 256, y: 256, z: 256 },
  "P1S":      { x: 256, y: 256, z: 256 },
  "P1P":      { x: 256, y: 256, z: 256 },
  "A1":       { x: 256, y: 256, z: 256 },
  "A1 Mini":  { x: 180, y: 180, z: 180 },
  "A1 mini":  { x: 180, y: 180, z: 180 },
  "H2D":      { x: 350, y: 320, z: 350 },
};

export async function POST(request: Request) {
  try {
    const { token, devices: selectedDevices } = await request.json() as {
      token: string;
      devices?: string[]; // optional list of serial numbers to import; if omitted imports all
    };

    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    const allDevices = await bambuListDevices(token);
    const toImport = selectedDevices
      ? allDevices.filter((d) => selectedDevices.includes(d.dev_id))
      : allDevices;

    const results = await Promise.all(
      toImport.map(async (device) => {
        // Skip if already exists (match by serial number)
        const existing = await db.query.farmPrinters.findFirst({
          where: eq(farmPrinters.serialNumber, device.dev_id),
        });

        if (existing) {
          // Update the access token to keep it fresh
          await db.update(farmPrinters)
            .set({ accessToken: token })
            .where(eq(farmPrinters.serialNumber, device.dev_id));

          return { serialNumber: device.dev_id, action: "updated", name: existing.name };
        }

        const vol = BAMBU_BUILD_VOLUMES[device.dev_product_name];

        const [printer] = await db.insert(farmPrinters).values({
          name: device.name || `Bambu ${device.dev_product_name}`,
          technology: "fdm",
          protocol: "bambu_cloud",
          make: "Bambu Lab",
          model: device.dev_product_name,
          serialNumber: device.dev_id,
          accessToken: token,
          nozzleDiameter: device.nozzle_diameter ?? 0.4,
          buildVolumeX: vol?.x,
          buildVolumeY: vol?.y,
          buildVolumeZ: vol?.z,
          hasEnclosure: ["X1C", "X1", "X1E", "P1S"].includes(device.dev_product_name),
          hasHeatedBed: true,
          status: device.online ? "online" : "offline",
          notes: device.has_ams ? "AMS unit detected" : undefined,
        }).returning();

        return { serialNumber: device.dev_id, action: "imported", name: printer.name };
      })
    );

    const imported = results.filter((r) => r.action === "imported").length;
    const updated = results.filter((r) => r.action === "updated").length;

    return NextResponse.json({ success: true, imported, updated, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
