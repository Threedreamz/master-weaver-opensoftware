/**
 * IES seed — concrete Maschinen-Park aus dem Ersatzteildrucken-Portfolio (Mai 2025).
 *
 * IES GmbH (Braaker Bogen 27, 22145 Braak bei Hamburg) ist die Mutter-Firma
 * der Brand `Ersatzteildrucken.de`. Dieser Seed erzeugt 1 Building, 6 Zonen
 * und 19 Workstations — eine pro Maschinen-Typ aus dem Portfolio:
 *
 *   Mess+Scan: Werth TomoScope CT, Keyence VL-800
 *   3D-Druck:  Formlabs Fuse SLS, Formlabs SLA, FDM, Concept Laser SLM
 *   Spritzguss: Arburg, Babyplast
 *   Metall:    CNC Fräsen, CNC Drehen, Schleifen, EDM, Laserschweißen, Lasergravur
 *   Support:   CAD-Platz, Messtechnik, Werkzeugbau-Platz, Versand, Office
 *
 * Mehrere Geräte gleichen Typs bekommen FDM-01, FDM-02 etc. Mehr Workstations
 * können später per Admin-UI dazugesteckt werden.
 */
import { deskBuildings, deskZones, deskWorkstations, deskEquipment } from "../opendesktop.schema";
import type { DbClient } from "../create-db";

// Stable deterministic IDs (matchen Plan-Seed in IES-Admin-DB)
const BUILDING_ID = "bld_ies_braak_001";

const ZONE_IDS = {
  scan_print: "zone_ies_scan_print",  // Halle 1 — Mess + 3D-Druck + Scan
  injection:  "zone_ies_injection",   // Halle 2 — Spritzguss
  metal:      "zone_ies_metal",       // Halle 3 — Metallbearbeitung
  toolmaking: "zone_ies_toolmaking",  // Werkzeugbau-Halle
  office:     "zone_ies_office",      // Büro (CAD + Verwaltung)
  shipping:   "zone_ies_shipping",    // Versand
} as const;

interface MachineSpec {
  id: string;
  zoneId: string;
  code: string;
  name: string;
  type: string;  // muss im erweiterten enum existieren
  description: string;
  equipment: Array<{
    id: string;
    name: string;
    category: "computer" | "monitor" | "scanner_3d" | "printer_3d" | "tool" | "measurement" | "safety" | "furniture" | "other";
    notes?: string;
  }>;
}

const MACHINES: MachineSpec[] = [
  // ============ Halle 1 — Mess + 3D-Druck + Scan ============
  {
    id: "ws_ies_ct_scan_001",
    zoneId: ZONE_IDS.scan_print,
    code: "CT-01",
    name: "Werth TomoScope XS Plus",
    type: "ct_scan",
    description: "Industrieller CT-Scan: Ø 289 mm / L 456 mm, ±4.5 µm Längenmessabweichung. Werkstücke + innenliegende Strukturen.",
    equipment: [
      { id: "eq_ies_ct_scanner", name: "Werth TomoScope XS Plus", category: "scanner_3d", notes: "Röntgentomographie, max ±4.5 µm" },
      { id: "eq_ies_ct_pc",      name: "Werth-Steuer-PC",          category: "computer",   notes: "WinWerth Software-Lizenz" },
    ],
  },
  {
    id: "ws_ies_keyence_001",
    zoneId: ZONE_IDS.scan_print,
    code: "SCAN-01",
    name: "Keyence VL-800 Koordinatenmessgerät",
    type: "scanning",
    description: "KI-gestütztes 3D-Scan-Messgerät: Ø 670 mm / H 250 mm, ±10 µm. Place-&-Click + Dual-Objektiv.",
    equipment: [
      { id: "eq_ies_keyence",    name: "Keyence VL-800",     category: "scanner_3d", notes: "All-in-One: Digitalisieren + Messen + CAD-Abgleich" },
      { id: "eq_ies_keyence_pc", name: "Keyence-Steuer-PC",  category: "computer",   notes: "Keyence-Software inkl. Messvorlagen" },
    ],
  },
  {
    id: "ws_ies_sls_001",
    zoneId: ZONE_IDS.scan_print,
    code: "SLS-01",
    name: "Formlabs Fuse SLS",
    type: "printing_sls",
    description: "Hochwertiger SLS-3D-Druck mit Nylon PA12. Schnelle Bemusterung + Kleinserie. Veredelung optional.",
    equipment: [
      { id: "eq_ies_sls",     name: "Formlabs Fuse",       category: "printer_3d", notes: "PA12, Build-Volume entsprechend Fuse-Spec" },
      { id: "eq_ies_sls_pc",  name: "Slicer-PC",           category: "computer",   notes: "PreForm + OpenSlicer" },
    ],
  },
  {
    id: "ws_ies_sla_001",
    zoneId: ZONE_IDS.scan_print,
    code: "SLA-01",
    name: "Formlabs SLA",
    type: "printing_sla",
    description: "SLA-3D-Druck mit Kunstharzen: transparente, toughe + hitzebeständige Teile. Nachbearbeitung inklusive.",
    equipment: [
      { id: "eq_ies_sla",      name: "Formlabs Form",       category: "printer_3d", notes: "Variabler Harz-Wechsel" },
      { id: "eq_ies_sla_wash", name: "Form Wash + Cure",    category: "tool",       notes: "Nachhärten unter UV" },
    ],
  },
  {
    id: "ws_ies_fdm_001",
    zoneId: ZONE_IDS.scan_print,
    code: "FDM-01",
    name: "FDM-3D-Drucker",
    type: "printing_fdm",
    description: "Filament-FDM: PLA, PETG, TPU, ABS, PEEK. Ein- oder Mehrfarbig. Bauraum bis 80×80×100 cm.",
    equipment: [
      { id: "eq_ies_fdm",      name: "FDM-Drucker",         category: "printer_3d", notes: "Multi-Material, große Bauraum-Variante" },
    ],
  },
  {
    id: "ws_ies_slm_001",
    zoneId: ZONE_IDS.scan_print,
    code: "SLM-01",
    name: "Concept Laser SLM",
    type: "printing_slm",
    description: "SLM-Metalldruck: Stahl (Werkzeugstahl, Edelstahl, Corrax) im Haus; Aluminium + Titan optional. Hochpreisig.",
    equipment: [
      { id: "eq_ies_slm",      name: "Concept Laser",       category: "printer_3d", notes: "Pulverbett-Verfahren" },
      { id: "eq_ies_slm_safety", name: "Inertgas + PSA",    category: "safety",     notes: "N2/Argon-Versorgung, Pulver-Handhabung" },
    ],
  },

  // ============ Halle 2 — Spritzguss ============
  {
    id: "ws_ies_arburg_001",
    zoneId: ZONE_IDS.injection,
    code: "INJ-ARB-01",
    name: "Arburg Spritzgussmaschine",
    type: "injection_molding",
    description: "Thermoplast-Spritzguss bis 132 g Werkstückgewicht, max 100 kN Schließkraft. Bemusterung Eigen+Fremdformen.",
    equipment: [
      { id: "eq_ies_arburg",   name: "Arburg",              category: "tool",       notes: "100 kN Schließkraft" },
      { id: "eq_ies_arburg_pc", name: "Arburg-Steuerung",   category: "computer",   notes: "Maschinen-PLC" },
    ],
  },
  {
    id: "ws_ies_babyplast_001",
    zoneId: ZONE_IDS.injection,
    code: "INJ-BABY-01",
    name: "Babyplast Spritzguss",
    type: "injection_molding",
    description: "Mikro-Spritzguss bis 30 g Werkstückgewicht — Kleinserie + Prototypen.",
    equipment: [
      { id: "eq_ies_babyplast", name: "Babyplast",          category: "tool",       notes: "Kompakt, ≤30 g" },
    ],
  },

  // ============ Halle 3 — Metallbearbeitung ============
  {
    id: "ws_ies_cnc_mill_001",
    zoneId: ZONE_IDS.metal,
    code: "CNC-MILL-01",
    name: "CNC Fräsmaschine",
    type: "cnc_milling",
    description: "CNC-Zerspanung Fräsen, auch basierend auf CT-Scan-Daten. Werkzeugbau für Spritzguss + CNC.",
    equipment: [
      { id: "eq_ies_cnc_mill", name: "CNC-Fräse",            category: "tool",       notes: "5-Achs-Bearbeitung möglich" },
      { id: "eq_ies_mill_cam", name: "CAM-Workstation",      category: "computer",   notes: "OpenCAM + G-Code-Generierung" },
    ],
  },
  {
    id: "ws_ies_cnc_turn_001",
    zoneId: ZONE_IDS.metal,
    code: "CNC-TURN-01",
    name: "CNC Drehmaschine",
    type: "cnc_turning",
    description: "CNC-Drehen für Rotations-Bauteile.",
    equipment: [
      { id: "eq_ies_cnc_turn", name: "CNC-Drehmaschine",     category: "tool",       notes: "" },
    ],
  },
  {
    id: "ws_ies_grinding_001",
    zoneId: ZONE_IDS.metal,
    code: "GRIND-01",
    name: "Schleifmaschine",
    type: "grinding",
    description: "Profil + Flachschleifen für Werkzeug + Bauteile.",
    equipment: [
      { id: "eq_ies_grind",    name: "Schleifmaschine",      category: "tool",       notes: "Profil + Flach" },
    ],
  },
  {
    id: "ws_ies_edm_001",
    zoneId: ZONE_IDS.metal,
    code: "EDM-01",
    name: "Funkenerosion",
    type: "edm",
    description: "Draht- und Senkerosion für Werkzeugbau-Konturen.",
    equipment: [
      { id: "eq_ies_edm",      name: "EDM-Maschine",         category: "tool",       notes: "Draht + Senk kombiniert" },
    ],
  },
  {
    id: "ws_ies_laser_weld_001",
    zoneId: ZONE_IDS.metal,
    code: "LASER-WELD-01",
    name: "Laserschweißanlage",
    type: "laser_weld",
    description: "Reparatur-Laserschweißen + Kleinserie.",
    equipment: [
      { id: "eq_ies_laser_weld", name: "Laserschweißanlage", category: "tool",       notes: "Reparatur + Kleinserie" },
    ],
  },
  {
    id: "ws_ies_laser_engrave_001",
    zoneId: ZONE_IDS.metal,
    code: "LASER-ENGR-01",
    name: "Lasergravur",
    type: "laser_engrave",
    description: "Markierung von Bauteilen + Werkzeugen via Laser.",
    equipment: [
      { id: "eq_ies_laser_engr", name: "Lasergravur-Anlage", category: "tool",       notes: "" },
    ],
  },

  // ============ Werkzeugbau-Halle ============
  {
    id: "ws_ies_tool_001",
    zoneId: ZONE_IDS.toolmaking,
    code: "TOOL-01",
    name: "Werkzeugbau-Platz",
    type: "tool_making",
    description: "Konventioneller Werkzeugbau: Stahl + Aluminium-Werkzeuge. Polieren + Montage.",
    equipment: [
      { id: "eq_ies_tool_bench", name: "Werkzeugmacher-Bank", category: "tool",      notes: "Polieren, Montage, Tests" },
    ],
  },

  // ============ Büro (CAD + Verwaltung) ============
  {
    id: "ws_ies_cad_001",
    zoneId: ZONE_IDS.office,
    code: "CAD-01",
    name: "CAD-Designplatz",
    type: "cad",
    description: "CAD-Konstruktion (für Timo Marquardt + Lisanne Kölzow): SolidWorks/Fusion, Reverse Engineering, technische Zeichnungen.",
    equipment: [
      { id: "eq_ies_cad_pc",   name: "CAD-Workstation",      category: "computer",   notes: "GPU-Workstation, SolidWorks/Fusion-Lizenz" },
      { id: "eq_ies_cad_mon",  name: "4K-Monitor",            category: "monitor",    notes: "Dual-Monitor-Setup" },
    ],
  },
  {
    id: "ws_ies_qa_001",
    zoneId: ZONE_IDS.office,
    code: "QA-01",
    name: "Messtechnik-Platz",
    type: "quality_check",
    description: "Allgemeine Messtechnik (außerhalb der CT/Keyence-Stationen): Höhenmesser, Mahr-Messmittel, Soll-Ist-Analyse.",
    equipment: [
      { id: "eq_ies_qa_tools", name: "Mess-Tools",           category: "measurement", notes: "Höhenmesser, Lehren, Mahr" },
    ],
  },
  {
    id: "ws_ies_office_001",
    zoneId: ZONE_IDS.office,
    code: "OFF-01",
    name: "Office",
    type: "office",
    description: "Büro-Schreibtische für Verwaltung, Marketing, SEO, Strategie (Niklas, Caro, Luca).",
    equipment: [
      { id: "eq_ies_office_pc", name: "Office-PC",           category: "computer",   notes: "Standard-Büroausstattung" },
    ],
  },

  // ============ Versand ============
  {
    id: "ws_ies_shipping_001",
    zoneId: ZONE_IDS.shipping,
    code: "SHIP-01",
    name: "Versand-Platz",
    type: "shipping",
    description: "Etiketten-Druck, Express + Kurier-Übergabe. PII-Passthrough (shipping_address) erlaubt.",
    equipment: [
      { id: "eq_ies_label",    name: "Etikettendrucker",     category: "tool",       notes: "PII-Routing — nur Versandadresse + Pseudonym" },
      { id: "eq_ies_ship_pc",  name: "Versand-PC",           category: "computer",   notes: "Kurier-Buchung + Tracking" },
    ],
  },
];

export async function seedIes(db: DbClient) {
  // 1. Building
  await db.insert(deskBuildings).values({
    id: BUILDING_ID,
    name: "IES GmbH Hauptsitz Braak",
    address: "Braaker Bogen 27, 22145 Braak",
    description: "IES GmbH (Mutter von Ersatzteildrucken.de) — Mess, 3D-Druck, Spritzguss, Metallbearbeitung.",
    isActive: true,
  }).onConflictDoNothing();

  // 2. Zones
  const zones: Array<{ id: string; name: string; type: "hall" | "room" | "cleanroom"; sortOrder: number; description: string; color: string }> = [
    { id: ZONE_IDS.scan_print, name: "Halle 1 — Mess + 3D-Druck", type: "hall",      sortOrder: 1, description: "CT-Scan, Keyence-Scan, SLS/SLA/FDM/SLM-Drucker", color: "#FF6B35" },
    { id: ZONE_IDS.injection,  name: "Halle 2 — Spritzguss",      type: "hall",      sortOrder: 2, description: "Arburg + Babyplast",                                color: "#F77F00" },
    { id: ZONE_IDS.metal,      name: "Halle 3 — Metall",          type: "hall",      sortOrder: 3, description: "CNC, Schleifen, EDM, Laser",                        color: "#4A90D9" },
    { id: ZONE_IDS.toolmaking, name: "Werkzeugbau-Halle",         type: "hall",      sortOrder: 4, description: "Konventioneller Werkzeugbau",                       color: "#8B5CF6" },
    { id: ZONE_IDS.office,     name: "Büro",                       type: "room",      sortOrder: 5, description: "CAD, QA, Verwaltung",                               color: "#10B981" },
    { id: ZONE_IDS.shipping,   name: "Versand",                    type: "room",      sortOrder: 6, description: "Etikettendruck + Kurier",                           color: "#EAB308" },
  ];

  for (const z of zones) {
    await db.insert(deskZones).values({
      ...z,
      buildingId: BUILDING_ID,
      // floor not set — IES has single floor (Werkstatt + Büro auf gleicher Ebene)
      capacity: 5,  // Default capacity per zone, kann pro Zone überschrieben werden
      isActive: true,
    }).onConflictDoNothing();
  }

  // 3. Workstations + Equipment
  for (const m of MACHINES) {
    await db.insert(deskWorkstations).values({
      id: m.id,
      zoneId: m.zoneId,
      code: m.code,
      name: m.name,
      type: m.type as "ct_scan" | "scanning" | "printing_sls" | "printing_sla" | "printing_fdm" | "printing_slm" | "injection_molding" | "cnc_milling" | "cnc_turning" | "grinding" | "edm" | "laser_weld" | "laser_engrave" | "tool_making" | "cad" | "quality_check" | "office" | "shipping",
      status: "active",
      description: m.description,
    }).onConflictDoNothing();

    if (m.equipment.length > 0) {
      await db.insert(deskEquipment).values(m.equipment.map((e) => ({
        id: e.id,
        workstationId: m.id,
        name: e.name,
        category: e.category,
        status: "operational" as const,
        notes: e.notes,
      }))).onConflictDoNothing();
    }
  }
}
