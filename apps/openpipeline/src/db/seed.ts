import Database from "better-sqlite3";

const dbPath = process.env.DB_PATH || "openpipeline.db";
const sqliteDb = new Database(dbPath);

// Create tables if not exist
sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS pip_pipelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    beschreibung TEXT,
    ecosystem_id TEXT,
    eltern_pipeline_id TEXT,
    template_id TEXT,
    typ TEXT NOT NULL DEFAULT 'projekt',
    status TEXT NOT NULL DEFAULT 'entwurf',
    farbe TEXT,
    icon TEXT,
    sortierung INTEGER DEFAULT 0,
    teams_channel_id TEXT,
    bounty_projekt_id TEXT,
    metadata TEXT,
    erstellt_von TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS pip_stufen (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL REFERENCES pip_pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    beschreibung TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    farbe TEXT,
    wip_limit INTEGER,
    sub_pipeline_id TEXT,
    auto_assign_user_id TEXT,
    auto_assign_arbeitsplatz_id TEXT,
    ist_end_stufe INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS pip_karten (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL REFERENCES pip_pipelines(id) ON DELETE CASCADE,
    stufe_id TEXT NOT NULL REFERENCES pip_stufen(id),
    titel TEXT NOT NULL,
    beschreibung TEXT,
    prioritaet TEXT NOT NULL DEFAULT 'mittel',
    status TEXT NOT NULL DEFAULT 'offen',
    position INTEGER NOT NULL DEFAULT 0,
    zugewiesen_an TEXT,
    arbeitsplatz_id TEXT,
    geschaetzt_stunden REAL,
    tatsaechlich_stunden REAL,
    faellig_am INTEGER,
    erledigt_am INTEGER,
    teams_ticket_id TEXT,
    bounty_aufgabe_id TEXT,
    action_item_id TEXT,
    quelle TEXT NOT NULL DEFAULT 'manuell',
    quelle_referenz TEXT,
    labels TEXT,
    ist_vorlage INTEGER NOT NULL DEFAULT 0,
    metadata TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS pip_karten_historie (
    id TEXT PRIMARY KEY,
    karte_id TEXT NOT NULL REFERENCES pip_karten(id) ON DELETE CASCADE,
    aktion TEXT NOT NULL,
    von_stufe_id TEXT,
    nach_stufe_id TEXT,
    von_status TEXT,
    nach_status TEXT,
    user_id TEXT,
    kommentar TEXT,
    metadata TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS pip_checklisten (
    id TEXT PRIMARY KEY,
    karte_id TEXT NOT NULL REFERENCES pip_karten(id) ON DELETE CASCADE,
    titel TEXT NOT NULL,
    erledigt INTEGER NOT NULL DEFAULT 0,
    position INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS pip_vorlagen (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    beschreibung TEXT,
    kategorie TEXT NOT NULL DEFAULT 'custom',
    ecosystem_id TEXT,
    stufen TEXT,
    standard_karten TEXT,
    ist_system INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS pip_sync_log (
    id TEXT PRIMARY KEY,
    richtung TEXT NOT NULL,
    quelle TEXT NOT NULL,
    entitaet_typ TEXT NOT NULL,
    entitaet_id TEXT NOT NULL,
    externe_id TEXT,
    aktion TEXT NOT NULL,
    payload TEXT,
    status TEXT NOT NULL DEFAULT 'ausstehend',
    fehler_details TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS pip_automatisierungen (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL REFERENCES pip_pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ausloeser TEXT NOT NULL,
    bedingungen TEXT,
    aktionen TEXT,
    aktiv INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS pip_listenbeschreibung (
    id TEXT PRIMARY KEY,
    stufe_id TEXT NOT NULL REFERENCES pip_stufen(id) ON DELETE CASCADE,
    was TEXT NOT NULL,
    warum TEXT,
    wie TEXT,
    video_url TEXT,
    video_titel TEXT,
    ist_engpass INTEGER NOT NULL DEFAULT 0,
    verantwortlicher_user_id TEXT,
    onboarding_checkliste TEXT,
    erstellt_von TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE UNIQUE INDEX IF NOT EXISTS pip_listenbeschreibung_stufe_idx ON pip_listenbeschreibung(stufe_id);

  CREATE TABLE IF NOT EXISTS pip_labels (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL REFERENCES pip_pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    farbe TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS pip_karten_labels (
    id TEXT PRIMARY KEY,
    karte_id TEXT NOT NULL REFERENCES pip_karten(id) ON DELETE CASCADE,
    label_id TEXT NOT NULL REFERENCES pip_labels(id) ON DELETE CASCADE
  );
  CREATE UNIQUE INDEX IF NOT EXISTS pip_karten_labels_unique_idx ON pip_karten_labels(karte_id, label_id);

  CREATE TABLE IF NOT EXISTS pip_karten_mitglieder (
    id TEXT PRIMARY KEY,
    karte_id TEXT NOT NULL REFERENCES pip_karten(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    rolle TEXT NOT NULL DEFAULT 'mitarbeiter',
    zugewiesen_am INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE UNIQUE INDEX IF NOT EXISTS pip_karten_mitglieder_unique_idx ON pip_karten_mitglieder(karte_id, user_id);

  CREATE TABLE IF NOT EXISTS pip_kommentare (
    id TEXT PRIMARY KEY,
    karte_id TEXT NOT NULL REFERENCES pip_karten(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    inhalt TEXT NOT NULL,
    erwaehnte_user TEXT,
    bearbeitet_am INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS pip_custom_field_definitionen (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL REFERENCES pip_pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    typ TEXT NOT NULL,
    optionen TEXT,
    ist_prio INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    pflichtfeld INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS pip_custom_field_werte (
    id TEXT PRIMARY KEY,
    karte_id TEXT NOT NULL REFERENCES pip_karten(id) ON DELETE CASCADE,
    feld_id TEXT NOT NULL REFERENCES pip_custom_field_definitionen(id) ON DELETE CASCADE,
    wert TEXT,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE UNIQUE INDEX IF NOT EXISTS pip_cf_werte_unique_idx ON pip_custom_field_werte(karte_id, feld_id);

  CREATE TABLE IF NOT EXISTS pip_anhaenge (
    id TEXT PRIMARY KEY,
    karte_id TEXT NOT NULL REFERENCES pip_karten(id) ON DELETE CASCADE,
    dateiname TEXT NOT NULL,
    originalname TEXT NOT NULL,
    groesse INTEGER NOT NULL,
    mimetype TEXT NOT NULL,
    pfad TEXT NOT NULL,
    hochgeladen_von TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS pip_benachrichtigungen (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    typ TEXT NOT NULL,
    karte_id TEXT REFERENCES pip_karten(id) ON DELETE CASCADE,
    pipeline_id TEXT REFERENCES pip_pipelines(id) ON DELETE CASCADE,
    titel TEXT NOT NULL,
    nachricht TEXT,
    gelesen INTEGER NOT NULL DEFAULT 0,
    link TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS pip_filter_presets (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL REFERENCES pip_pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    erstellt_von TEXT NOT NULL,
    ist_global INTEGER NOT NULL DEFAULT 0,
    filter TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS pip_automation_log (
    id TEXT PRIMARY KEY,
    automatisierung_id TEXT NOT NULL REFERENCES pip_automatisierungen(id) ON DELETE CASCADE,
    karte_id TEXT,
    ergebnis TEXT NOT NULL,
    details TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

// Seed system templates
const systemVorlagen = [
  {
    name: "Fischer Standard",
    beschreibung: "Alex Fischers Business-Pipeline: Anfragen bis QS",
    kategorie: "geschaeft",
    stufen: [
      { name: "Anfragen", position: 0, farbe: "#3b82f6" },
      { name: "Leads", position: 1, farbe: "#f59e0b" },
      { name: "Sales", position: 2, farbe: "#10b981" },
      { name: "Fulfillment", position: 3, farbe: "#8b5cf6" },
      { name: "QS", position: 4, farbe: "#ef4444", istEndStufe: true },
    ],
  },
  {
    name: "Software Projekt",
    beschreibung: "Standard Software-Entwicklungspipeline",
    kategorie: "projekt",
    stufen: [
      { name: "Planung", position: 0, farbe: "#6366f1" },
      { name: "Entwicklung", position: 1, farbe: "#3b82f6" },
      { name: "Testing", position: 2, farbe: "#f59e0b" },
      { name: "Deployment", position: 3, farbe: "#10b981" },
      { name: "Wartung", position: 4, farbe: "#64748b", istEndStufe: true },
    ],
  },
  {
    name: "Produktion",
    beschreibung: "Allgemeine Produktionspipeline",
    kategorie: "prozess",
    stufen: [
      { name: "Anfrage", position: 0, farbe: "#3b82f6" },
      { name: "Vorbereitung", position: 1, farbe: "#f59e0b" },
      { name: "Fertigung", position: 2, farbe: "#8b5cf6" },
      { name: "QS", position: 3, farbe: "#ef4444" },
      { name: "Auslieferung", position: 4, farbe: "#10b981", istEndStufe: true },
    ],
  },
  {
    name: "Leer",
    beschreibung: "Leere Pipeline — alle Stufen selbst definieren",
    kategorie: "custom",
    stufen: [],
  },
];

console.log("Seeding OpenPipeline templates...");

// Delete existing system templates
sqliteDb.prepare("DELETE FROM pip_vorlagen WHERE ist_system = 1").run();

const insert = sqliteDb.prepare(
  `INSERT INTO pip_vorlagen (id, name, beschreibung, kategorie, stufen, standard_karten, ist_system, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, '[]', 1, unixepoch(), unixepoch())`
);

for (const v of systemVorlagen) {
  const id = crypto.randomUUID();
  insert.run(id, v.name, v.beschreibung, v.kategorie, JSON.stringify(v.stufen));
  console.log(`  + ${v.name}`);
}

console.log(`Done. Seeded ${systemVorlagen.length} templates.`);
sqliteDb.close();
