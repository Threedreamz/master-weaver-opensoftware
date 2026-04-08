import { NextResponse } from "next/server";

const MOCK_PRINTERS = [
  {
    id: "p1",
    name: "Bambu X1C",
    vendor: "Bambu Lab",
    model: "X1 Carbon",
    protocol: "Bambu Cloud",
    host: "192.168.1.50",
    port: 8883,
    bedSize: { x: 256, y: 256, z: 256 },
    nozzleDiameter: 0.4,
    status: "printing",
  },
  {
    id: "p2",
    name: "Voron 2.4",
    vendor: "Voron",
    model: "2.4r2 350mm",
    protocol: "Moonraker",
    host: "192.168.1.51",
    port: 7125,
    bedSize: { x: 350, y: 350, z: 340 },
    nozzleDiameter: 0.4,
    status: "online",
  },
  {
    id: "p3",
    name: "Prusa MK4",
    vendor: "Prusa Research",
    model: "MK4",
    protocol: "PrusaLink",
    host: "192.168.1.52",
    port: 8080,
    bedSize: { x: 250, y: 210, z: 220 },
    nozzleDiameter: 0.4,
    status: "offline",
  },
];

export async function GET() {
  return NextResponse.json(MOCK_PRINTERS);
}

export async function POST(request: Request) {
  const body = await request.json();
  const newPrinter = {
    id: `p${Date.now()}`,
    ...body,
    status: "offline",
  };
  return NextResponse.json(newPrinter, { status: 201 });
}
