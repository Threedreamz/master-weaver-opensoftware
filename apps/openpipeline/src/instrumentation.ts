export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.DOCKER_BUILD) {
    const { sqlite } = await import("./db");

    // Create all tables if they don't exist (idempotent)
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        image TEXT,
        email_verified INTEGER,
        username TEXT UNIQUE,
        display_name TEXT,
        role TEXT NOT NULL DEFAULT 'viewer',
        locale TEXT NOT NULL DEFAULT 'de',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at INTEGER,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_idx ON accounts(provider, provider_account_id);

      CREATE TABLE IF NOT EXISTS sessions (
        session_token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT NOT NULL,
        expires INTEGER NOT NULL
      );

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

      CREATE TABLE IF NOT EXISTS pip_mitglieder (
        id TEXT PRIMARY KEY,
        pipeline_id TEXT NOT NULL REFERENCES pip_pipelines(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        name TEXT,
        rolle TEXT NOT NULL DEFAULT 'zuarbeiter',
        vertrauens_level INTEGER NOT NULL DEFAULT 1,
        zugewiesene_stufen TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
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

      CREATE TABLE IF NOT EXISTS pip_berechtigungsgruppen (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        beschreibung TEXT,
        farbe TEXT NOT NULL DEFAULT '#6366f1',
        berechtigungen TEXT NOT NULL DEFAULT '[]',
        erlaubte_pipelines TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS pip_user_gruppen (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        gruppen_id TEXT NOT NULL REFERENCES pip_berechtigungsgruppen(id) ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS pip_user_gruppen_unique_idx ON pip_user_gruppen(user_id, gruppen_id);

      CREATE TABLE IF NOT EXISTS pip_checklisten_vorlagen (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        beschreibung TEXT,
        farbe TEXT NOT NULL DEFAULT '#10b981',
        zugeordnete_pipelines TEXT NOT NULL DEFAULT '[]',
        sichtbare_gruppen TEXT NOT NULL DEFAULT '[]',
        trigger_pipeline_id TEXT,
        trigger_stufe_id TEXT,
        trigger_bei TEXT DEFAULT 'abgeschlossen',
        aktiv INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS pip_checklisten_vorlagen_items (
        id TEXT PRIMARY KEY,
        vorlage_id TEXT NOT NULL REFERENCES pip_checklisten_vorlagen(id) ON DELETE CASCADE,
        titel TEXT NOT NULL,
        beschreibung TEXT,
        pflicht INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS pip_cv_items_vorlage_idx ON pip_checklisten_vorlagen_items(vorlage_id);

      CREATE TABLE IF NOT EXISTS pip_karten_checklisten_status (
        id TEXT PRIMARY KEY,
        karte_id TEXT NOT NULL REFERENCES pip_karten(id) ON DELETE CASCADE,
        vorlage_id TEXT NOT NULL REFERENCES pip_checklisten_vorlagen(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL REFERENCES pip_checklisten_vorlagen_items(id) ON DELETE CASCADE,
        erledigt INTEGER NOT NULL DEFAULT 0,
        erledigt_von TEXT,
        erledigt_am INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE UNIQUE INDEX IF NOT EXISTS pip_kcs_unique_idx ON pip_karten_checklisten_status(karte_id, item_id);

      -- Wave 3 C5: canonical event bus
      CREATE TABLE IF NOT EXISTS pip_canonical_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        workspace_id TEXT,
        correlation_id TEXT,
        occurred_at TEXT NOT NULL,
        received_at INTEGER NOT NULL DEFAULT (unixepoch()),
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'received',
        dispatch_results TEXT
      );
      CREATE INDEX IF NOT EXISTS pip_canon_events_type_idx         ON pip_canonical_events(type);
      CREATE INDEX IF NOT EXISTS pip_canon_events_source_idx       ON pip_canonical_events(source);
      CREATE INDEX IF NOT EXISTS pip_canon_events_workspace_idx    ON pip_canonical_events(workspace_id);
      CREATE INDEX IF NOT EXISTS pip_canon_events_received_at_idx  ON pip_canonical_events(received_at);

      CREATE TABLE IF NOT EXISTS pip_canonical_subscribers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        event_type TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        secret TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS pip_canon_subs_type_idx     ON pip_canonical_subscribers(event_type);
      CREATE INDEX IF NOT EXISTS pip_canon_subs_enabled_idx  ON pip_canonical_subscribers(enabled);
    `);

    console.log("[openpipeline] Database tables initialized");

    // Seed default canonical-event subscribers. Idempotent — re-run-safe.
    // Opt-in via env so CI / unit tests don't hit the seed path automatically.
    if (process.env.OPENPIPELINE_SEED_SUBSCRIBERS === "1") {
      try {
        const { seedDefaultSubscribers } = await import("./lib/seed-subscribers");
        const result = await seedDefaultSubscribers();
        console.log(
          `[openpipeline] Seeded canonical subscribers: ` +
          `inserted=${result.inserted.length} (${result.inserted.join(", ") || "-"}), ` +
          `existing=${result.existing.length}`,
        );
      } catch (err) {
        console.error("[openpipeline] subscriber seed failed:", err);
      }
    }
  }
}
