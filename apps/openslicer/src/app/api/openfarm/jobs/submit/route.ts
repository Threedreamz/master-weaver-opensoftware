import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gcodeId, printerId, jobName } = body;

    if (!gcodeId || !printerId) {
      return NextResponse.json(
        { error: "gcodeId and printerId are required" },
        { status: 400 }
      );
    }

    // In a real implementation, this would:
    // 1. Read the G-code file from the gcode record (by gcodeId)
    // 2. Look up the printer connection details
    // 3. Stream the G-code to the printer via its protocol (Moonraker, Bambu Cloud, OctoPrint, etc.)
    // 4. Persist the job in a database

    // For now, return a mock job submission response
    const jobId = `j${Date.now()}`;
    const estimatedTime = Math.floor(Math.random() * 7200) + 1800; // 30min to 2.5h

    return NextResponse.json({
      jobId,
      status: "queued",
      printer: {
        id: printerId,
      },
      jobName: jobName ?? `Job-${jobId}`,
      gcodeId,
      estimatedTime,
      submittedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
