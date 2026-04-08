import { NextResponse } from "next/server";

const MOCK_JOBS = [
  {
    id: "j1",
    name: "Griff_V1.gcode",
    printer: "Bambu X1C",
    status: "printing",
    progress: 67,
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "j2",
    name: "Phone Case.gcode",
    printer: "Bambu X1C",
    status: "completed",
    progress: 100,
    submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "j3",
    name: "Bracket v3.gcode",
    printer: "Voron 2.4",
    status: "queued",
    progress: 0,
    submittedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

export async function GET() {
  return NextResponse.json(MOCK_JOBS);
}

export async function POST(request: Request) {
  const body = await request.json();
  const newJob = {
    id: `j${Date.now()}`,
    ...body,
    status: "queued",
    progress: 0,
    submittedAt: new Date().toISOString(),
  };
  return NextResponse.json(newJob, { status: 201 });
}
