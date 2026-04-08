import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({
        success: false,
        message: "No URL provided",
      });
    }

    const healthUrl = url.replace(/\/$/, "") + "/api/health";
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        success: true,
        message: `Connected — ${data.app || "service"} is running`,
      });
    }

    return NextResponse.json({
      success: false,
      message: `Service responded with status ${res.status}`,
    });
  } catch {
    return NextResponse.json({
      success: false,
      message: "Connection failed — service unreachable",
    });
  }
}
