import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { getAllUsers, updateUserRole } from "@/db/queries/collaboration";
import type { UserRole } from "@/db/schema";

export async function GET() {
  const authError = await requirePermission("users.manage");
  if (authError) return authError;

  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (err) {
    console.error("Failed to fetch users", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authError = await requirePermission("users.manage");
  if (authError) return authError;

  try {
    const body = await request.json();
    const { userId, role } = body as { userId: string; role: UserRole };

    if (!userId || !role) {
      return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
    }

    const validRoles: UserRole[] = ["user", "editor", "reviewer", "publisher", "admin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const user = await updateUserRole(userId, role);
    return NextResponse.json(user);
  } catch (err) {
    console.error("Failed to update user role", err);
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
  }
}
