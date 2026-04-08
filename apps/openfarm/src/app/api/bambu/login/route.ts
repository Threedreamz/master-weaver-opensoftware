import { NextResponse } from "next/server";
import { bambuLogin, bambuListDevices } from "@/lib/adapters/bambu-cloud-adapter";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json() as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const token = await bambuLogin(email, password);

    // Fetch device count to confirm the token works
    const devices = await bambuListDevices(token);

    return NextResponse.json({
      success: true,
      token,
      deviceCount: devices.length,
      devices: devices.map((d) => ({
        serialNumber: d.dev_id,
        name: d.name,
        model: d.dev_product_name,
        online: d.online ?? false,
        hasAms: d.has_ams ?? false,
        accessCode: d.dev_access_code,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
