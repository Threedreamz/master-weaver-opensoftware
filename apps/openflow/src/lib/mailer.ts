/**
 * OpenFlow mailer — wraps nodemailer with env-based SMTP configuration.
 *
 * Required env vars (set in .env.local):
 *   SMTP_HOST     — e.g. smtp.gmail.com
 *   SMTP_PORT     — e.g. 587
 *   SMTP_USER     — SMTP login username / email
 *   SMTP_PASS     — SMTP login password / app password
 *   SMTP_FROM     — "From" address, e.g. "OpenFlow <noreply@example.com>"
 *
 * If SMTP_HOST is not configured, sendMail() logs to console instead of
 * throwing, so the submission flow never breaks due to a missing mail config.
 */

export interface MailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(options: MailOptions): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user ?? "OpenFlow <noreply@openflow.app>";

  if (!host || !user || !pass) {
    // SMTP not configured — log the mail so it can be debugged locally
    console.log(
      "[OpenFlow Mailer] SMTP not configured. Would have sent:",
      JSON.stringify({ from, to: options.to, subject: options.subject }, null, 2)
    );
    return;
  }

  try {
    // Dynamic import — nodemailer is optional at build/typecheck time
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodemailer = await import("nodemailer" as any) as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const transporter = (nodemailer.default ?? nodemailer).createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text.replace(/\n/g, "<br>"),
    });
  } catch (err) {
    console.error("[OpenFlow Mailer] Failed to send email:", err instanceof Error ? err.message : err);
    // Do not rethrow — a mail failure should never break the submission flow
  }
}
