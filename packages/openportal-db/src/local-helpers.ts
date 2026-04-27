import { randomBytes } from "node:crypto";

export function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

export function invitationExpiry(daysFromNow = 7): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}
