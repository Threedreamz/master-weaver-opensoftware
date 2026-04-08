import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

async function readSettings() {
  try {
    const data = await fs.readFile(SETTINGS_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {
      prusaSlicerPath: "",
      orcaSlicerPath: "",
      spoolmanUrl: "",
      openSlicerUrl: "http://localhost:4175",
      defaultTechnology: "fdm",
      defaultLayerHeight: 0.2,
      autoAssignPrinters: false,
    };
  }
}

export async function GET() {
  const settings = await readSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  try {
    const settings = await request.json();
    await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
