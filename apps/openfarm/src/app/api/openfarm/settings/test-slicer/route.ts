import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { path: slicerPath } = await request.json();
    if (!slicerPath) {
      return NextResponse.json({
        success: false,
        message: "No path provided",
      });
    }

    const { stdout } = await execAsync(`"${slicerPath}" --version`);
    return NextResponse.json({
      success: true,
      message: `Found: ${stdout.trim()}`,
    });
  } catch {
    return NextResponse.json({
      success: false,
      message: "Slicer not found at this path",
    });
  }
}
