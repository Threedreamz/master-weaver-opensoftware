import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { db } from "@opensoftware/openmailer-db";
import { emailTransports } from "@opensoftware/openmailer-db/schema";
import { eq, and } from "drizzle-orm";

// Cache nodemailer transports per workspace to avoid re-creating on every send
const transportCache = new Map<string, Transporter>();

/**
 * Retrieve (or create and cache) a nodemailer Transporter for the given workspace.
 * Uses the workspace's default email transport configuration from the database.
 */
export async function getTransport(
  workspaceId: string
): Promise<Transporter> {
  if (transportCache.has(workspaceId)) {
    return transportCache.get(workspaceId)!;
  }

  const transport = await db.query.emailTransports.findFirst({
    where: and(
      eq(emailTransports.workspaceId, workspaceId),
      eq(emailTransports.isDefault, true)
    ),
  });

  if (!transport) {
    throw new Error(
      `No default email transport configured for workspace ${workspaceId}`
    );
  }

  const config = transport.config as {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  transportCache.set(workspaceId, transporter);
  return transporter;
}

/**
 * Invalidate a cached transport (e.g. when SMTP credentials are updated).
 */
export function invalidateTransportCache(workspaceId: string): void {
  const existing = transportCache.get(workspaceId);
  if (existing) {
    existing.close();
    transportCache.delete(workspaceId);
  }
}

/**
 * Invalidate all cached transports.
 */
export function clearTransportCache(): void {
  for (const [, transporter] of transportCache) {
    transporter.close();
  }
  transportCache.clear();
}

export interface SendEmailOptions {
  workspaceId: string;
  to: string;
  subject: string;
  html: string;
  from: { name: string; email: string };
  replyTo?: string;
}

/**
 * Send a single email via the workspace's default SMTP transport.
 * Returns the nodemailer SentMessageInfo on success.
 */
export async function sendEmail(options: SendEmailOptions) {
  const transporter = await getTransport(options.workspaceId);

  return transporter.sendMail({
    from: `"${options.from.name}" <${options.from.email}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    replyTo: options.replyTo,
  });
}

/**
 * Verify that the SMTP connection for a workspace is working.
 * Returns true if the connection can be established.
 */
export async function verifyTransport(workspaceId: string): Promise<boolean> {
  try {
    const transporter = await getTransport(workspaceId);
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
