/**
 * Seed: OpenLawyer — legal project, risk analyses, and documents for Max Mustermann
 */
import type { DbClient } from "../create-db";
import { mustermannUser, mustermannLegalProject, MUSTERMANN_USER_ID } from "./mustermann";
import { users } from "../shared.schema";
import { legalProjects, legalRiskAnalyses, legalDocuments } from "../openlawyer.schema";

export async function seedOpenlawyer(db: DbClient) {
  // 1. User
  await db.insert(users).values(mustermannUser).onConflictDoNothing();

  // 2. Legal project
  const [project] = await db
    .insert(legalProjects)
    .values({
      ...mustermannLegalProject,
      createdBy: MUSTERMANN_USER_ID,
    })
    .onConflictDoNothing()
    .returning();

  const projectId = project?.id ?? 1;

  // 3. Risk analyses
  await db.insert(legalRiskAnalyses).values([
    {
      projectId,
      category: "Datenschutz (DSGVO)",
      riskLevel: "high",
      description:
        "Die Website verarbeitet personenbezogene Daten (Kontaktformular, Newsletter) ohne vollständige Datenschutzerklärung. Cookie-Consent-Banner fehlt. Auftragsverarbeitungsverträge mit Drittanbietern sind nicht dokumentiert.",
      recommendations: [
        "Datenschutzerklärung gem. Art. 13/14 DSGVO erstellen",
        "Cookie-Consent-Lösung implementieren (z.B. Cookiebot, Usercentrics)",
        "AVV mit Hosting-Provider und Analytics-Dienst abschließen",
        "Verarbeitungsverzeichnis gem. Art. 30 DSGVO anlegen",
      ],
      requiredDocuments: ["privacy", "cookies"],
    },
    {
      projectId,
      category: "Impressumspflicht (TMG/DDG)",
      riskLevel: "medium",
      description:
        "Das Impressum ist unvollständig. Es fehlen die Handelsregisternummer und die USt-IdNr. Der vertretungsberechtigte Geschäftsführer ist nicht namentlich genannt.",
      recommendations: [
        "Impressum um HRB-Nummer und USt-IdNr. ergänzen",
        "Geschäftsführer namentlich benennen",
        "Impressum von jeder Unterseite mit max. 2 Klicks erreichbar machen",
      ],
      requiredDocuments: ["impressum"],
    },
  ]).onConflictDoNothing();

  // 4. Legal documents
  await db.insert(legalDocuments).values([
    {
      projectId,
      documentType: "impressum",
      title: "Impressum — Mustermann GmbH",
      content:
        "Mustermann GmbH\nMusterstraße 1\n40210 Düsseldorf\n\nVertreten durch: Max Mustermann (Geschäftsführer)\n\nKontakt:\nTelefon: +49 211 98765432\nE-Mail: info@mustermann.de\n\nRegistergericht: Amtsgericht Düsseldorf\nRegisternummer: HRB 12345\n\nUmsatzsteuer-Identifikationsnummer gem. § 27a UStG:\nDE123456789\n\nVerantwortlich für den Inhalt gem. § 18 Abs. 2 MStV:\nMax Mustermann, Musterstraße 1, 40210 Düsseldorf",
      locale: "de",
      status: "draft",
      createdBy: MUSTERMANN_USER_ID,
    },
    {
      projectId,
      documentType: "privacy",
      title: "Datenschutzerklärung — Mustermann GmbH",
      content:
        "1. Verantwortlicher\nMustermann GmbH, Musterstraße 1, 40210 Düsseldorf\nE-Mail: info@mustermann.de\n\n2. Erhobene Daten\nBeim Besuch unserer Website werden automatisch folgende Daten erfasst:\n- IP-Adresse (anonymisiert)\n- Datum und Uhrzeit des Zugriffs\n- Aufgerufene Seiten\n\n3. Kontaktformular\nWenn Sie unser Kontaktformular nutzen, werden Ihr Name, Ihre E-Mail-Adresse und Ihre Nachricht gespeichert. Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.\n\n4. Ihre Rechte\nSie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch.",
      locale: "de",
      status: "draft",
      createdBy: MUSTERMANN_USER_ID,
    },
  ]).onConflictDoNothing();

  console.log("[seed-openlawyer] Seeded 1 project, 2 risk analyses, 2 documents");
}
