import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/db";

// GET /api/users — List all registered users
export async function GET() {
  const users = sqlite.prepare(
    "SELECT id, email, name, display_name, role, created_at FROM users ORDER BY created_at DESC"
  ).all() as { id: string; email: string; name: string | null; display_name: string | null; role: string; created_at: number }[];

  return NextResponse.json(users);
}

// POST /api/users — Create a new user account
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, name, role } = body;

  if (!email) {
    return NextResponse.json({ error: "Email ist erforderlich" }, { status: 400 });
  }

  // Check if email already exists
  const existing = sqlite.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return NextResponse.json({ error: "Email bereits vergeben" }, { status: 409 });
  }

  const id = crypto.randomUUID();
  sqlite.prepare(
    "INSERT INTO users (id, email, name, display_name, role) VALUES (?, ?, ?, ?, ?)"
  ).run(id, email, name || null, name || null, role || "viewer");

  const user = sqlite.prepare(
    "SELECT id, email, name, display_name, role, created_at FROM users WHERE id = ?"
  ).get(id);

  return NextResponse.json(user, { status: 201 });
}
