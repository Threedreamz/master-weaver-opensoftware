/**
 * Seed: OpenMailer — email accounts, threads, and messages for Max Mustermann
 */
import type { DbClient } from "../create-db";
import { mustermannUser, mustermannMailAccount, MUSTERMANN_USER_ID } from "./mustermann";
import { users } from "../shared.schema";
import { emailAccounts, emailThreads, emailMessages } from "../openmailer.schema";

export async function seedOpenmailer(db: DbClient) {
  // 1. User
  await db.insert(users).values(mustermannUser).onConflictDoNothing();

  // 2. Email account
  const [account] = await db
    .insert(emailAccounts)
    .values(mustermannMailAccount)
    .onConflictDoNothing()
    .returning();

  const accountId = account?.id ?? 1;

  // 3. Three email threads with 2 messages each

  // --- Thread 1: Angebot Anfrage ---
  const [thread1] = await db
    .insert(emailThreads)
    .values({
      accountId,
      subject: "Angebot 3D-Druckteile — Anfrage Mustermann GmbH",
      messageCount: 2,
      snippet: "Vielen Dank für Ihre Anfrage zu den Druckteilen...",
    })
    .onConflictDoNothing()
    .returning();

  if (thread1) {
    await db.insert(emailMessages).values([
      {
        threadId: thread1.id,
        messageId: "<msg-001@mustermann.de>",
        direction: "inbound" as const,
        status: "received" as const,
        fromAddress: "einkauf@kundefirma.de",
        fromName: "Anna Weber",
        toAddresses: [{ email: "max@mustermann.de", name: "Max Mustermann" }],
        subject: "Angebot 3D-Druckteile — Anfrage Mustermann GmbH",
        bodyText:
          "Sehr geehrter Herr Mustermann,\n\nwir benötigen 50 Stück Ersatzteile (Referenz ET-4421) aus PA12 Nylon.\nKönnten Sie uns bitte ein Angebot mit Lieferzeit zusenden?\n\nMit freundlichen Grüßen\nAnna Weber\nEinkauf, KundeFirma GmbH",
        bodyHtml: null,
        sentAt: new Date("2024-11-10T09:15:00Z"),
      },
      {
        threadId: thread1.id,
        messageId: "<msg-002@mustermann.de>",
        inReplyTo: "<msg-001@mustermann.de>",
        direction: "outbound" as const,
        status: "sent" as const,
        fromAddress: "max@mustermann.de",
        fromName: "Max Mustermann",
        toAddresses: [{ email: "einkauf@kundefirma.de", name: "Anna Weber" }],
        subject: "Re: Angebot 3D-Druckteile — Anfrage Mustermann GmbH",
        bodyText:
          "Sehr geehrte Frau Weber,\n\nvielen Dank für Ihre Anfrage. Anbei unser Angebot:\n- 50x ET-4421, PA12 Nylon, SLS-Verfahren\n- Stückpreis: 18,90 EUR netto\n- Lieferzeit: 5 Werktage ab Auftragseingang\n\nDas Angebot ist 14 Tage gültig.\n\nMit freundlichen Grüßen\nMax Mustermann\nMustermann GmbH",
        bodyHtml: null,
        sentAt: new Date("2024-11-10T14:30:00Z"),
        sentByUserId: MUSTERMANN_USER_ID,
      },
    ]).onConflictDoNothing();
  }

  // --- Thread 2: Lieferverzögerung ---
  const [thread2] = await db
    .insert(emailThreads)
    .values({
      accountId,
      subject: "Lieferstatus Auftrag A-2024-089",
      messageCount: 2,
      snippet: "Der Versand erfolgt voraussichtlich am Freitag...",
    })
    .onConflictDoNothing()
    .returning();

  if (thread2) {
    await db.insert(emailMessages).values([
      {
        threadId: thread2.id,
        messageId: "<msg-003@mustermann.de>",
        direction: "inbound" as const,
        status: "received" as const,
        fromAddress: "logistik@partner-gmbh.de",
        fromName: "Thomas Braun",
        toAddresses: [{ email: "max@mustermann.de", name: "Max Mustermann" }],
        subject: "Lieferstatus Auftrag A-2024-089",
        bodyText:
          "Hallo Herr Mustermann,\n\nleider verzögert sich die Lieferung der Filament-Charge um 2 Tage.\nDer Versand erfolgt voraussichtlich am Freitag, 15.11.\n\nEntschuldigen Sie die Unannehmlichkeiten.\n\nMit freundlichen Grüßen\nThomas Braun\nPartner GmbH Logistik",
        bodyHtml: null,
        sentAt: new Date("2024-11-12T11:00:00Z"),
      },
      {
        threadId: thread2.id,
        messageId: "<msg-004@mustermann.de>",
        inReplyTo: "<msg-003@mustermann.de>",
        direction: "outbound" as const,
        status: "sent" as const,
        fromAddress: "max@mustermann.de",
        fromName: "Max Mustermann",
        toAddresses: [{ email: "logistik@partner-gmbh.de", name: "Thomas Braun" }],
        subject: "Re: Lieferstatus Auftrag A-2024-089",
        bodyText:
          "Hallo Herr Braun,\n\nvielen Dank für die Info. Freitag passt, bitte senden Sie die Tracking-Nummer sobald verfügbar.\n\nViele Grüße\nMax Mustermann",
        bodyHtml: null,
        sentAt: new Date("2024-11-12T13:45:00Z"),
        sentByUserId: MUSTERMANN_USER_ID,
      },
    ]).onConflictDoNothing();
  }

  // --- Thread 3: Steuerberater Jahresabschluss ---
  const [thread3] = await db
    .insert(emailThreads)
    .values({
      accountId,
      subject: "Unterlagen Jahresabschluss 2024 — Mustermann GmbH",
      messageCount: 2,
      snippet: "Bitte senden Sie uns die BWA und Summen-Salden-Liste...",
      isStarred: true,
    })
    .onConflictDoNothing()
    .returning();

  if (thread3) {
    await db.insert(emailMessages).values([
      {
        threadId: thread3.id,
        messageId: "<msg-005@mustermann.de>",
        direction: "inbound" as const,
        status: "received" as const,
        fromAddress: "kanzlei@steuerberater-schmidt.de",
        fromName: "Dr. Schmidt Steuerberatung",
        toAddresses: [{ email: "max@mustermann.de", name: "Max Mustermann" }],
        subject: "Unterlagen Jahresabschluss 2024 — Mustermann GmbH",
        bodyText:
          "Sehr geehrter Herr Mustermann,\n\nfür den Jahresabschluss 2024 benötigen wir bitte:\n- BWA November + Dezember 2024\n- Summen- und Saldenliste per 31.12.2024\n- Kontoauszüge Dezember 2024\n- Anlagenspiegel\n\nBitte übermitteln Sie die Unterlagen bis zum 15. Januar 2025.\n\nMit freundlichen Grüßen\nDr. Claudia Schmidt\nSteuerberatung Schmidt & Partner",
        bodyHtml: null,
        sentAt: new Date("2024-12-18T08:00:00Z"),
      },
      {
        threadId: thread3.id,
        messageId: "<msg-006@mustermann.de>",
        inReplyTo: "<msg-005@mustermann.de>",
        direction: "outbound" as const,
        status: "sent" as const,
        fromAddress: "max@mustermann.de",
        fromName: "Max Mustermann",
        toAddresses: [{ email: "kanzlei@steuerberater-schmidt.de", name: "Dr. Schmidt Steuerberatung" }],
        subject: "Re: Unterlagen Jahresabschluss 2024 — Mustermann GmbH",
        bodyText:
          "Sehr geehrte Frau Dr. Schmidt,\n\ndie BWA und Saldenliste sende ich Ihnen Anfang Januar zu.\nDie Kontoauszüge erhalten Sie direkt über das Bankportal.\n\nSchöne Feiertage wünscht\nMax Mustermann\nMustermann GmbH",
        bodyHtml: null,
        sentAt: new Date("2024-12-18T16:20:00Z"),
        sentByUserId: MUSTERMANN_USER_ID,
      },
    ]).onConflictDoNothing();
  }

  console.log("[seed-openmailer] Seeded 1 account, 3 threads, 6 messages");
}
