export async function GET() {
  return Response.json({
    status: "ok",
    service: "openportal",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
