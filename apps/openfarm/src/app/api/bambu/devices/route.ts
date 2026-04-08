import { NextResponse } from "next/server";
import { bambuListDevices } from "@/lib/adapters/bambu-cloud-adapter";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "token query parameter required" }, { status: 400 });
    }

    const devices = await bambuListDevices(token);

    return NextResponse.json({
      devices: devices.map((d) => ({
        serialNumber: d.dev_id,
        name: d.name,
        model: d.dev_product_name,
        online: d.online ?? false,
        printStatus: d.print_status,
        hasAms: d.has_ams ?? false,
        accessCode: d.dev_access_code,
        nozzleDiameter: d.nozzle_diameter,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
