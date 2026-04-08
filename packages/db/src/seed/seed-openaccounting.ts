/**
 * Seed: OpenAccounting — customer, invoices, payment, and journal entry for Max Mustermann
 */
import type { DbClient } from "../create-db";
import { mustermannUser, mustermannCustomer } from "./mustermann";
import { users } from "../shared.schema";
import { acctCustomers, acctInvoices, acctPayments, acctBookingEntries } from "../openaccounting.schema";

export async function seedOpenaccounting(db: DbClient) {
  // 1. User
  await db.insert(users).values(mustermannUser).onConflictDoNothing();

  // 2. Customer (Mustermann GmbH)
  const [customer] = await db
    .insert(acctCustomers)
    .values(mustermannCustomer)
    .onConflictDoNothing()
    .returning();

  const customerId = customer?.id ?? 1;

  // 3. Invoice 1: R-2024-001 — 3D-Druckteile (1.000 EUR netto + 19% = 1.190 EUR)
  const [invoice1] = await db
    .insert(acctInvoices)
    .values({
      invoiceNumber: "R-2024-001",
      customerId,
      customerName: "Max Mustermann",
      customerEmail: "max@mustermann.de",
      customerCompany: "Mustermann GmbH",
      billingStreet: "Musterstraße 1",
      billingZip: "40210",
      billingCity: "Düsseldorf",
      billingCountry: "DE",
      items: [
        { beschreibung: "3D-Druckteile PA12 Nylon (ET-4421)", menge: 50, einheit: "Stück", einzelpreis: 18.9, gesamtpreis: 945.0 },
        { beschreibung: "Nachbearbeitung / Glättung", menge: 1, einheit: "Pauschal", einzelpreis: 55.0, gesamtpreis: 55.0 },
      ],
      netAmount: 1000.0,
      taxRate: 19.0,
      taxAmount: 190.0,
      grossAmount: 1190.0,
      issueDate: "2024-11-15",
      dueDate: "2024-11-29",
      paidAt: "2024-11-25",
      status: "bezahlt",
      customerType: "B2B",
      notes: "Auftrag aus Anfrage A-2024-089",
    })
    .onConflictDoNothing()
    .returning();

  // 4. Invoice 2: R-2024-002 — CT-Scanner Wartung (500 EUR netto + 19% = 595 EUR)
  await db
    .insert(acctInvoices)
    .values({
      invoiceNumber: "R-2024-002",
      customerId,
      customerName: "Max Mustermann",
      customerEmail: "max@mustermann.de",
      customerCompany: "Mustermann GmbH",
      billingStreet: "Musterstraße 1",
      billingZip: "40210",
      billingCity: "Düsseldorf",
      billingCountry: "DE",
      items: [
        { beschreibung: "CT-Scanner Wartung Q4/2024", menge: 1, einheit: "Pauschal", einzelpreis: 420.0, gesamtpreis: 420.0 },
        { beschreibung: "Verschleißteile Röntgenröhre", menge: 2, einheit: "Stück", einzelpreis: 40.0, gesamtpreis: 80.0 },
      ],
      netAmount: 500.0,
      taxRate: 19.0,
      taxAmount: 95.0,
      grossAmount: 595.0,
      issueDate: "2024-12-01",
      dueDate: "2024-12-15",
      status: "gesendet",
      customerType: "B2B",
      notes: "Wartungsvertrag WV-2024-M",
    })
    .onConflictDoNothing();

  // 5. Payment matching invoice 1
  if (invoice1) {
    await db
      .insert(acctPayments)
      .values({
        invoiceId: invoice1.id,
        method: "ueberweisung",
        amount: 1190.0,
        currency: "EUR",
        reference: "R-2024-001 / Mustermann GmbH",
        payerName: "Mustermann GmbH",
        payerEmail: "max@mustermann.de",
        payerIban: "DE89370400440532013000",
        status: "zugeordnet",
        type: "eingang",
        paidAt: "2024-11-25",
      })
      .onConflictDoNothing();

    // 6. Journal entry (Buchungssatz) for the payment
    await db
      .insert(acctBookingEntries)
      .values({
        datum: "2024-11-25",
        betrag: 1190.0,
        sollHaben: "S",
        konto: "1200",       // Bank (SKR03)
        gegenkonto: "8400",  // Erlöse 19% USt (SKR03)
        buchungstext: "Zahlungseingang R-2024-001 Mustermann GmbH — 3D-Druckteile",
        belegnummer: "R-2024-001",
        steuerschluessel: "USt19",
        taxRate: 19.0,
        status: "geprueft",
      })
      .onConflictDoNothing();
  }

  console.log("[seed-openaccounting] Seeded 1 customer, 2 invoices, 1 payment, 1 journal entry");
}
