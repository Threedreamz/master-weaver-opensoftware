/**
 * Seed: Master Weaver Inquiry Flow
 *
 * Multi-step inquiry flow with 3 tiers (DIY, Done For You, Private Account Manager),
 * conditional branching, and per-ecosystem sub-flows for the DFY path.
 *
 * Run: npx tsx apps/openflow/drizzle/seed-inquiry-flow.ts
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const dbPath = process.env.DATABASE_URL || "./data/openflow.db";
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uuid = () => crypto.randomUUID();

/** Shorthand for JSON.stringify */
const j = (v: unknown) => JSON.stringify(v);

/** Ordered ecosystem keys — determines the chain order for DFY sub-flows */
const ECO_ORDER = [
  "finder",
  "odyn",
  "crowds",
  "design",
  "etd",
  "admin",
  "opensoftware",
  "affiliate",
  "devtools",
] as const;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  console.log("Seeding Master Weaver Inquiry Flow...");

  // ------ Clean up previous run ------
  const existing = await db.query.flows.findFirst({
    where: eq(schema.flows.slug, "mw-inquiry"),
  });
  if (existing) {
    console.log("  Deleting existing mw-inquiry flow...");
    await db.delete(schema.flowEdges).where(eq(schema.flowEdges.flowId, existing.id));
    // stepComponents cascade from flowSteps
    await db.delete(schema.flowSteps).where(eq(schema.flowSteps.flowId, existing.id));
    await db.delete(schema.flowVersions).where(eq(schema.flowVersions.flowId, existing.id));
    await db.delete(schema.submissions).where(eq(schema.submissions.flowId, existing.id));
    await db.delete(schema.flows).where(eq(schema.flows.id, existing.id));
  }

  // ------ Flow ------
  const flowId = uuid();
  await db.insert(schema.flows).values({
    id: flowId,
    name: "Master Weaver Inquiry",
    slug: "mw-inquiry",
    description: "Multi-tier inquiry flow for the Master Weaver Hub landing page — DIY, Done For You, and Private Account Manager paths with per-ecosystem sub-flows.",
    status: "published",
    settings: j({
      theme: {
        primaryColor: "#3b82f6",
        backgroundColor: "#0f172a",
        textColor: "#e2e8f0",
        cardBackgroundColor: "#1e293b",
        borderRadius: "0.75rem",
        fontFamily: "system-ui",
      },
      showProgressBar: true,
      progressBarStyle: "dots",
      submitButtonText: "Submit Inquiry",
      successMessage: "Thank you! We'll be in touch within 24 hours.",
      successRedirectUrl: null,
    }),
  });

  // ------ Flow Version ------
  await db.insert(schema.flowVersions).values({
    id: uuid(),
    flowId,
    version: 1,
    snapshot: j({ note: "Initial seed — v1" }),
  });

  // ====================================================================
  // STEPS
  // ====================================================================

  // We collect all step IDs in a map for edge creation later.
  const stepIds: Record<string, string> = {};

  const createStep = async (
    key: string,
    type: "start" | "step" | "end",
    label: string,
    sortOrder: number,
    config: Record<string, unknown>,
    positionX = 250,
    positionY = sortOrder * 200,
  ) => {
    const id = uuid();
    stepIds[key] = id;
    await db.insert(schema.flowSteps).values({
      id,
      flowId,
      type,
      label,
      positionX,
      positionY,
      config: j(config),
      sortOrder,
    });
    return id;
  };

  // ---- Start ----
  await createStep("start", "start", "Start", 0, {
    title: "Master Weaver",
    subtitle: "Let's find the right plan for you",
    layout: "single-column",
    showProgress: true,
  });
  // Start step has no visible components — auto-advance via always edge

  // ---- Step 1: Tier Select ----
  const tierSelectId = await createStep("tier-select", "step", "Choose Your Path", 1, {
    title: "How would you like to work with Master Weaver?",
    layout: "single-column",
    showProgress: true,
  });

  await db.insert(schema.stepComponents).values({
    stepId: tierSelectId,
    componentType: "card-selector",
    fieldKey: "tier",
    label: "Choose your tier",
    config: j({
      selectionMode: "single",
      columns: 3,
      cards: [
        { key: "diy", title: "DIY Plan", subtitle: "Open Source self-hosting \u2014 build it yourself", icon: "wrench" },
        { key: "dfy", title: "Done For You", subtitle: "We build and configure your ecosystem", icon: "rocket" },
        { key: "pam", title: "Private Account Manager", subtitle: "Dedicated expert for your project", icon: "user-check" },
      ],
      style: "bordered",
    }),
    sortOrder: 0,
    required: true,
  });

  // ====================================================================
  // DIY PATH
  // ====================================================================

  const diyWaitlistId = await createStep("diy-waitlist", "end", "DIY Waitlist", 2, {
    title: "Open Source \u2014 Coming Q3 2026",
    layout: "single-column",
    showProgress: true,
  });

  await db.insert(schema.stepComponents).values([
    {
      stepId: diyWaitlistId,
      componentType: "paragraph",
      fieldKey: "_diy_intro",
      label: "",
      config: j({ text: "Master Weaver ecosystems will be available for self-hosting. Join the waitlist to get notified.", alignment: "left" }),
      sortOrder: 0,
      required: false,
    },
    {
      stepId: diyWaitlistId,
      componentType: "text-input",
      fieldKey: "waitlist_name",
      label: "Your Name",
      config: j({ placeholder: "Jane Doe", inputType: "text" }),
      sortOrder: 1,
      required: false,
    },
    {
      stepId: diyWaitlistId,
      componentType: "email-input",
      fieldKey: "waitlist_email",
      label: "Email",
      config: j({ placeholder: "you@company.com" }),
      sortOrder: 2,
      required: true,
    },
    {
      stepId: diyWaitlistId,
      componentType: "paragraph",
      fieldKey: "_diy_btc",
      label: "",
      config: j({ text: "Want to support open source? Visit our BTC support page after submitting.", alignment: "left" }),
      sortOrder: 3,
      required: false,
    },
  ]);

  // ====================================================================
  // DONE FOR YOU (DFY) PATH
  // ====================================================================

  // -- DFY Step 1: Hosting Model --
  const dfyHostingId = await createStep("dfy-hosting", "step", "Hosting Model", 3, {
    title: "Hosting Model",
    layout: "single-column",
    showProgress: true,
  });

  await db.insert(schema.stepComponents).values({
    stepId: dfyHostingId,
    componentType: "card-selector",
    fieldKey: "hosting_model",
    label: "Hosting Model",
    config: j({
      selectionMode: "single",
      columns: 2,
      cards: [
        { key: "self-hosted", title: "Self-hosted / Private", subtitle: "Deploy on your own infrastructure", icon: "server" },
        { key: "mw-hosted", title: "GDPR-Hosted", subtitle: "Hosted on our EU-compliant servers", icon: "shield-check" },
      ],
      style: "bordered",
    }),
    sortOrder: 0,
    required: true,
  });

  // -- DFY Step 2: Business Profile --
  const dfyProfileId = await createStep("dfy-profile", "step", "Business Profile", 4, {
    title: "Tell us about your business",
    layout: "single-column",
    showProgress: true,
  });

  await db.insert(schema.stepComponents).values([
    {
      stepId: dfyProfileId,
      componentType: "text-input",
      fieldKey: "company_name",
      label: "Company Name",
      config: j({ placeholder: "Acme GmbH", inputType: "text" }),
      sortOrder: 0,
      required: false,
    },
    {
      stepId: dfyProfileId,
      componentType: "dropdown",
      fieldKey: "industry",
      label: "Industry",
      config: j({
        placeholder: "Select your industry...",
        searchable: false,
        options: [
          { value: "ecommerce", label: "E-Commerce" },
          { value: "iot-hardware", label: "IoT / Hardware" },
          { value: "saas", label: "SaaS" },
          { value: "agency-creative", label: "Agency / Creative" },
          { value: "manufacturing", label: "Manufacturing" },
          { value: "education", label: "Education" },
          { value: "healthcare", label: "Healthcare" },
          { value: "marketplace", label: "Marketplace" },
          { value: "other", label: "Other" },
        ],
      }),
      sortOrder: 1,
      required: false,
    },
    {
      stepId: dfyProfileId,
      componentType: "radio-group",
      fieldKey: "team_size",
      label: "Team Size",
      config: j({
        layout: "horizontal",
        options: [
          { value: "1-5", label: "1-5" },
          { value: "6-20", label: "6-20" },
          { value: "21-50", label: "21-50" },
          { value: "51-200", label: "51-200" },
          { value: "200+", label: "200+" },
        ],
      }),
      sortOrder: 2,
      required: false,
    },
    {
      stepId: dfyProfileId,
      componentType: "card-selector",
      fieldKey: "audience_type",
      label: "Audience Type",
      config: j({
        selectionMode: "single",
        columns: 4,
        cards: [
          { key: "b2c", title: "B2C" },
          { key: "b2b", title: "B2B" },
          { key: "b2e", title: "B2E / Franchise" },
          { key: "b2g", title: "B2G / Government" },
        ],
        style: "bordered",
      }),
      sortOrder: 3,
      required: false,
    },
  ]);

  // -- DFY Step 3: Ecosystem Selection --
  const dfyEcosystemsId = await createStep("dfy-ecosystems", "step", "Ecosystem Selection", 5, {
    title: "Which ecosystems do you need?",
    subtitle: "Select all that apply",
    layout: "single-column",
    showProgress: true,
  });

  await db.insert(schema.stepComponents).values({
    stepId: dfyEcosystemsId,
    componentType: "card-selector",
    fieldKey: "selected_ecosystems",
    label: "Ecosystems",
    config: j({
      selectionMode: "multiple",
      columns: 3,
      cards: [
        { key: "finder", title: "Finder", subtitle: "Product comparison & search platform", icon: "search" },
        { key: "odyn", title: "ODYN", subtitle: "IoT device management & firmware", icon: "cpu" },
        { key: "crowds", title: "Crowds", subtitle: "Team collaboration & marketplace", icon: "users" },
        { key: "design", title: "Design Hub", subtitle: "Design system & component toolkit", icon: "palette" },
        { key: "etd", title: "ETD", subtitle: "3D-printed spare parts marketplace", icon: "printer" },
        { key: "admin", title: "Admin Panel", subtitle: "Multi-tenant admin dashboard", icon: "layout-dashboard" },
        { key: "opensoftware", title: "OpenSoftware", subtitle: "Business tools (mailer, accounting, legal)", icon: "package" },
        { key: "affiliate", title: "Affiliate Manager", subtitle: "Partner CRM & campaign management", icon: "handshake" },
        { key: "devtools", title: "DevTools", subtitle: "Browser automation & testing", icon: "terminal" },
      ],
      style: "bordered",
    }),
    sortOrder: 0,
    required: true,
  });

  // ====================================================================
  // ECOSYSTEM SUB-FLOWS (DFY path)
  // ====================================================================

  // --- eco-finder ---
  const ecoFinderId = await createStep("eco-finder", "step", "Finder Details", 6, {
    title: "Finder \u2014 Product Comparison",
    layout: "single-column",
    showProgress: true,
  }, 100, 1200);

  await db.insert(schema.stepComponents).values([
    {
      stepId: ecoFinderId,
      componentType: "heading",
      fieldKey: "_eco_finder_heading",
      label: "",
      config: j({ level: 2, text: "Finder \u2014 Product Comparison", alignment: "left" }),
      sortOrder: 0,
      required: false,
    },
    {
      stepId: ecoFinderId,
      componentType: "card-selector",
      fieldKey: "finder_product_types",
      label: "Product Types",
      config: j({
        selectionMode: "multiple",
        columns: 4,
        cards: [
          { key: "filament", title: "Filament" },
          { key: "resin", title: "Resin" },
          { key: "machines", title: "Machines" },
          { key: "custom", title: "Custom Products" },
        ],
        style: "bordered",
      }),
      sortOrder: 1,
      required: false,
    },
    {
      stepId: ecoFinderId,
      componentType: "checkbox-group",
      fieldKey: "finder_data_sources",
      label: "Data Sources",
      config: j({
        layout: "vertical",
        options: [
          { value: "manufacturer", label: "Manufacturer Data" },
          { value: "reviews", label: "User Reviews" },
          { value: "price-apis", label: "Price APIs" },
          { value: "own-db", label: "Own Database" },
        ],
      }),
      sortOrder: 2,
      required: false,
    },
    {
      stepId: ecoFinderId,
      componentType: "radio-group",
      fieldKey: "finder_scale",
      label: "Product Catalog Size",
      config: j({
        layout: "horizontal",
        options: [
          { value: "under-100", label: "<100 products" },
          { value: "100-1k", label: "100-1k" },
          { value: "1k-10k", label: "1k-10k" },
          { value: "10k+", label: "10k+" },
        ],
      }),
      sortOrder: 3,
      required: false,
    },
  ]);

  // --- eco-odyn ---
  const ecoOdynId = await createStep("eco-odyn", "step", "ODYN Details", 7, {
    title: "ODYN \u2014 IoT & Hardware",
    layout: "single-column",
    showProgress: true,
  }, 250, 1200);

  await db.insert(schema.stepComponents).values([
    {
      stepId: ecoOdynId,
      componentType: "heading",
      fieldKey: "_eco_odyn_heading",
      label: "",
      config: j({ level: 2, text: "ODYN \u2014 IoT & Hardware", alignment: "left" }),
      sortOrder: 0,
      required: false,
    },
    {
      stepId: ecoOdynId,
      componentType: "checkbox-group",
      fieldKey: "odyn_devices",
      label: "Device Types",
      config: j({
        layout: "vertical",
        options: [
          { value: "sensors", label: "Sensors" },
          { value: "controllers", label: "Controllers" },
          { value: "actuators", label: "Actuators" },
          { value: "custom-pcb", label: "Custom PCB" },
        ],
      }),
      sortOrder: 1,
      required: false,
    },
    {
      stepId: ecoOdynId,
      componentType: "radio-group",
      fieldKey: "odyn_cluster_size",
      label: "Cluster Size",
      config: j({
        layout: "horizontal",
        options: [
          { value: "1-10", label: "1-10 devices" },
          { value: "10-100", label: "10-100" },
          { value: "100-1k", label: "100-1k" },
          { value: "1k+", label: "1k+" },
        ],
      }),
      sortOrder: 2,
      required: false,
    },
    {
      stepId: ecoOdynId,
      componentType: "checkbox-group",
      fieldKey: "odyn_protocols",
      label: "Protocols",
      config: j({
        layout: "horizontal",
        options: [
          { value: "mqtt", label: "MQTT" },
          { value: "http", label: "HTTP" },
          { value: "websocket", label: "WebSocket" },
          { value: "custom", label: "Custom" },
        ],
      }),
      sortOrder: 3,
      required: false,
    },
  ]);

  // --- eco-crowds ---
  const ecoCrowdsId = await createStep("eco-crowds", "step", "Crowds Details", 8, {
    title: "Crowds \u2014 Collaboration",
    layout: "single-column",
    showProgress: true,
  }, 400, 1200);

  await db.insert(schema.stepComponents).values([
    {
      stepId: ecoCrowdsId,
      componentType: "heading",
      fieldKey: "_eco_crowds_heading",
      label: "",
      config: j({ level: 2, text: "Crowds \u2014 Collaboration", alignment: "left" }),
      sortOrder: 0,
      required: false,
    },
    {
      stepId: ecoCrowdsId,
      componentType: "radio-group",
      fieldKey: "crowds_scope",
      label: "Scope",
      config: j({
        layout: "horizontal",
        options: [
          { value: "small-team", label: "Small Team" },
          { value: "department", label: "Department" },
          { value: "company-wide", label: "Company-wide" },
          { value: "public", label: "Public Community" },
        ],
      }),
      sortOrder: 1,
      required: false,
    },
    {
      stepId: ecoCrowdsId,
      componentType: "checkbox-group",
      fieldKey: "crowds_features",
      label: "Features",
      config: j({
        layout: "vertical",
        options: [
          { value: "marketplace", label: "Marketplace" },
          { value: "forums", label: "Forums" },
          { value: "task-mgmt", label: "Task Management" },
          { value: "voting", label: "Voting" },
          { value: "content-sharing", label: "Content Sharing" },
        ],
      }),
      sortOrder: 2,
      required: false,
    },
  ]);

  // --- eco-design ---
  const ecoDesignId = await createStep("eco-design", "step", "Design Hub Details", 9, {
    title: "Design Hub",
    layout: "single-column",
    showProgress: true,
  }, 550, 1200);

  await db.insert(schema.stepComponents).values([
    {
      stepId: ecoDesignId,
      componentType: "heading",
      fieldKey: "_eco_design_heading",
      label: "",
      config: j({ level: 2, text: "Design Hub", alignment: "left" }),
      sortOrder: 0,
      required: false,
    },
    {
      stepId: ecoDesignId,
      componentType: "radio-group",
      fieldKey: "design_brand",
      label: "Brand Status",
      config: j({
        layout: "horizontal",
        options: [
          { value: "existing", label: "Existing Brand" },
          { value: "need-branding", label: "Need Branding" },
          { value: "rebrand", label: "Rebrand" },
        ],
      }),
      sortOrder: 1,
      required: false,
    },
    {
      stepId: ecoDesignId,
      componentType: "checkbox-group",
      fieldKey: "design_components",
      label: "Component Needs",
      config: j({
        layout: "vertical",
        options: [
          { value: "forms", label: "Forms" },
          { value: "data-viz", label: "Data Viz" },
          { value: "navigation", label: "Navigation" },
          { value: "marketing-pages", label: "Marketing Pages" },
          { value: "email-templates", label: "Email Templates" },
        ],
      }),
      sortOrder: 2,
      required: false,
    },
  ]);

  // --- eco-etd ---
  const ecoEtdId = await createStep("eco-etd", "step", "ETD Details", 10, {
    title: "ETD \u2014 Spare Parts",
    layout: "single-column",
    showProgress: true,
  }, 700, 1200);

  await db.insert(schema.stepComponents).values([
    {
      stepId: ecoEtdId,
      componentType: "heading",
      fieldKey: "_eco_etd_heading",
      label: "",
      config: j({ level: 2, text: "ETD \u2014 Spare Parts", alignment: "left" }),
      sortOrder: 0,
      required: false,
    },
    {
      stepId: ecoEtdId,
      componentType: "checkbox-group",
      fieldKey: "etd_parts",
      label: "Part Types",
      config: j({
        layout: "vertical",
        options: [
          { value: "mechanical", label: "Mechanical" },
          { value: "electronic-housings", label: "Electronic Housings" },
          { value: "custom-fittings", label: "Custom Fittings" },
          { value: "prototypes", label: "Prototypes" },
        ],
      }),
      sortOrder: 1,
      required: false,
    },
    {
      stepId: ecoEtdId,
      componentType: "radio-group",
      fieldKey: "etd_volume",
      label: "Monthly Volume",
      config: j({
        layout: "horizontal",
        options: [
          { value: "1-10", label: "1-10/mo" },
          { value: "10-100", label: "10-100/mo" },
          { value: "100-500", label: "100-500/mo" },
          { value: "500+", label: "500+/mo" },
        ],
      }),
      sortOrder: 2,
      required: false,
    },
    {
      stepId: ecoEtdId,
      componentType: "checkbox-group",
      fieldKey: "etd_materials",
      label: "Materials",
      config: j({
        layout: "horizontal",
        options: [
          { value: "pla", label: "PLA" },
          { value: "abs", label: "ABS" },
          { value: "petg", label: "PETG" },
          { value: "nylon", label: "Nylon" },
          { value: "resin", label: "Resin" },
          { value: "metal-sintering", label: "Metal Sintering" },
        ],
      }),
      sortOrder: 3,
      required: false,
    },
  ]);

  // --- eco-admin ---
  const ecoAdminId = await createStep("eco-admin", "step", "Admin Panel Details", 11, {
    title: "Admin Panel",
    layout: "single-column",
    showProgress: true,
  }, 100, 1400);

  await db.insert(schema.stepComponents).values([
    {
      stepId: ecoAdminId,
      componentType: "heading",
      fieldKey: "_eco_admin_heading",
      label: "",
      config: j({ level: 2, text: "Admin Panel", alignment: "left" }),
      sortOrder: 0,
      required: false,
    },
    {
      stepId: ecoAdminId,
      componentType: "checkbox-group",
      fieldKey: "admin_entities",
      label: "Entities to Manage",
      config: j({
        layout: "vertical",
        options: [
          { value: "users", label: "Users" },
          { value: "products", label: "Products" },
          { value: "orders", label: "Orders" },
          { value: "content", label: "Content" },
          { value: "analytics", label: "Analytics" },
          { value: "devices", label: "Devices" },
        ],
      }),
      sortOrder: 1,
      required: false,
    },
    {
      stepId: ecoAdminId,
      componentType: "radio-group",
      fieldKey: "admin_roles",
      label: "Role Complexity",
      config: j({
        layout: "horizontal",
        options: [
          { value: "simple", label: "Simple (Admin/User)" },
          { value: "multi-role", label: "Multi-Role" },
          { value: "custom-rbac", label: "Custom RBAC" },
        ],
      }),
      sortOrder: 2,
      required: false,
    },
  ]);

  // --- eco-opensoftware ---
  const ecoOpensoftwareId = await createStep("eco-opensoftware", "step", "OpenSoftware Details", 12, {
    title: "OpenSoftware \u2014 Business Tools",
    layout: "single-column",
    showProgress: true,
  }, 250, 1400);

  await db.insert(schema.stepComponents).values([
    {
      stepId: ecoOpensoftwareId,
      componentType: "heading",
      fieldKey: "_eco_os_heading",
      label: "",
      config: j({ level: 2, text: "OpenSoftware \u2014 Business Tools", alignment: "left" }),
      sortOrder: 0,
      required: false,
    },
    {
      stepId: ecoOpensoftwareId,
      componentType: "checkbox-group",
      fieldKey: "os_tools",
      label: "Tools Needed",
      config: j({
        layout: "vertical",
        options: [
          { value: "mailer", label: "Mailer" },
          { value: "accounting", label: "Accounting" },
          { value: "legal", label: "Legal" },
          { value: "seo", label: "SEO" },
          { value: "inventory", label: "Inventory" },
          { value: "payroll", label: "Payroll" },
          { value: "openflow", label: "Forms (OpenFlow)" },
        ],
      }),
      sortOrder: 1,
      required: false,
    },
  ]);

  // --- eco-affiliate ---
  const ecoAffiliateId = await createStep("eco-affiliate", "step", "Affiliate Manager Details", 13, {
    title: "Affiliate Manager",
    layout: "single-column",
    showProgress: true,
  }, 400, 1400);

  await db.insert(schema.stepComponents).values([
    {
      stepId: ecoAffiliateId,
      componentType: "heading",
      fieldKey: "_eco_aff_heading",
      label: "",
      config: j({ level: 2, text: "Affiliate Manager", alignment: "left" }),
      sortOrder: 0,
      required: false,
    },
    {
      stepId: ecoAffiliateId,
      componentType: "radio-group",
      fieldKey: "aff_partners",
      label: "Number of Partners",
      config: j({
        layout: "horizontal",
        options: [
          { value: "1-10", label: "1-10" },
          { value: "10-50", label: "10-50" },
          { value: "50-200", label: "50-200" },
          { value: "200+", label: "200+ partners" },
        ],
      }),
      sortOrder: 1,
      required: false,
    },
    {
      stepId: ecoAffiliateId,
      componentType: "checkbox-group",
      fieldKey: "aff_features",
      label: "Features",
      config: j({
        layout: "vertical",
        options: [
          { value: "tracking", label: "Tracking" },
          { value: "commissions", label: "Commissions" },
          { value: "campaigns", label: "Campaigns" },
          { value: "reporting", label: "Reporting" },
          { value: "mlm", label: "MLM" },
        ],
      }),
      sortOrder: 2,
      required: false,
    },
  ]);

  // --- eco-devtools ---
  const ecoDevtoolsId = await createStep("eco-devtools", "step", "DevTools Details", 14, {
    title: "DevTools",
    layout: "single-column",
    showProgress: true,
  }, 550, 1400);

  await db.insert(schema.stepComponents).values([
    {
      stepId: ecoDevtoolsId,
      componentType: "heading",
      fieldKey: "_eco_dt_heading",
      label: "",
      config: j({ level: 2, text: "DevTools", alignment: "left" }),
      sortOrder: 0,
      required: false,
    },
    {
      stepId: ecoDevtoolsId,
      componentType: "checkbox-group",
      fieldKey: "dt_use_cases",
      label: "Use Cases",
      config: j({
        layout: "vertical",
        options: [
          { value: "testing", label: "Testing" },
          { value: "scraping", label: "Scraping" },
          { value: "monitoring", label: "Monitoring" },
          { value: "screenshots", label: "Screenshots" },
          { value: "pdf-generation", label: "PDF Generation" },
        ],
      }),
      sortOrder: 1,
      required: false,
    },
    {
      stepId: ecoDevtoolsId,
      componentType: "radio-group",
      fieldKey: "dt_scale",
      label: "Scale",
      config: j({
        layout: "horizontal",
        options: [
          { value: "single", label: "Single Browser" },
          { value: "small-cluster", label: "Small Cluster" },
          { value: "large-farm", label: "Large Farm" },
        ],
      }),
      sortOrder: 2,
      required: false,
    },
  ]);

  // ====================================================================
  // DFY FINAL STEPS
  // ====================================================================

  // -- DFY Requirements --
  const dfyRequirementsId = await createStep("dfy-requirements", "step", "Requirements & Timeline", 15, {
    title: "Requirements & Timeline",
    layout: "single-column",
    showProgress: true,
  }, 250, 1600);

  await db.insert(schema.stepComponents).values([
    {
      stepId: dfyRequirementsId,
      componentType: "checkbox-group",
      fieldKey: "compliance",
      label: "Compliance Requirements",
      config: j({
        layout: "horizontal",
        options: [
          { value: "gdpr", label: "GDPR" },
          { value: "iso-27001", label: "ISO 27001" },
          { value: "hipaa", label: "HIPAA" },
          { value: "soc2", label: "SOC2" },
          { value: "none", label: "None" },
        ],
      }),
      sortOrder: 0,
      required: false,
    },
    {
      stepId: dfyRequirementsId,
      componentType: "radio-group",
      fieldKey: "timeline",
      label: "Timeline",
      config: j({
        layout: "horizontal",
        options: [
          { value: "asap", label: "ASAP" },
          { value: "1-3m", label: "1-3 Months" },
          { value: "3-6m", label: "3-6 Months" },
          { value: "6-12m", label: "6-12 Months" },
        ],
      }),
      sortOrder: 1,
      required: false,
    },
    {
      stepId: dfyRequirementsId,
      componentType: "radio-group",
      fieldKey: "budget_range",
      label: "Budget Range",
      config: j({
        layout: "horizontal",
        options: [
          { value: "under-5k", label: "Under \u20ac5k" },
          { value: "5k-15k", label: "\u20ac5k-15k" },
          { value: "15k-50k", label: "\u20ac15k-50k" },
          { value: "50k-100k", label: "\u20ac50k-100k" },
          { value: "100k+", label: "\u20ac100k+" },
        ],
      }),
      sortOrder: 2,
      required: false,
    },
  ]);

  // -- DFY Contact --
  const dfyContactId = await createStep("dfy-contact", "end", "Contact Information", 16, {
    title: "Contact Information",
    layout: "single-column",
    showProgress: true,
  }, 250, 1800);

  await db.insert(schema.stepComponents).values([
    {
      stepId: dfyContactId,
      componentType: "text-input",
      fieldKey: "contact_name",
      label: "Name",
      config: j({ placeholder: "Jane Doe", inputType: "text" }),
      sortOrder: 0,
      required: true,
    },
    {
      stepId: dfyContactId,
      componentType: "email-input",
      fieldKey: "contact_email",
      label: "Email",
      config: j({ placeholder: "you@company.com" }),
      sortOrder: 1,
      required: true,
    },
    {
      stepId: dfyContactId,
      componentType: "phone-input",
      fieldKey: "contact_phone",
      label: "Phone",
      config: j({ placeholder: "+49 ..." }),
      sortOrder: 2,
      required: false,
    },
    {
      stepId: dfyContactId,
      componentType: "text-area",
      fieldKey: "message",
      label: "Message",
      config: j({ placeholder: "Tell us more about your project...", rows: 4 }),
      sortOrder: 3,
      required: false,
    },
  ]);

  // ====================================================================
  // PRIVATE ACCOUNT MANAGER (PAM) PATH
  // ====================================================================

  // -- PAM Step 1: Company --
  const pamCompanyId = await createStep("pam-company", "step", "About Your Company", 17, {
    title: "About Your Company",
    layout: "single-column",
    showProgress: true,
  }, 500, 400);

  await db.insert(schema.stepComponents).values([
    {
      stepId: pamCompanyId,
      componentType: "text-input",
      fieldKey: "company_name",
      label: "Company Name",
      config: j({ placeholder: "Acme GmbH", inputType: "text" }),
      sortOrder: 0,
      required: true,
    },
    {
      stepId: pamCompanyId,
      componentType: "dropdown",
      fieldKey: "industry",
      label: "Industry",
      config: j({
        placeholder: "Select your industry...",
        searchable: false,
        options: [
          { value: "ecommerce", label: "E-Commerce" },
          { value: "iot-hardware", label: "IoT / Hardware" },
          { value: "saas", label: "SaaS" },
          { value: "agency-creative", label: "Agency / Creative" },
          { value: "manufacturing", label: "Manufacturing" },
          { value: "education", label: "Education" },
          { value: "healthcare", label: "Healthcare" },
          { value: "marketplace", label: "Marketplace" },
          { value: "other", label: "Other" },
        ],
      }),
      sortOrder: 1,
      required: false,
    },
    {
      stepId: pamCompanyId,
      componentType: "radio-group",
      fieldKey: "revenue_range",
      label: "Annual Revenue",
      config: j({
        layout: "horizontal",
        options: [
          { value: "under-500k", label: "<\u20ac500k" },
          { value: "500k-2m", label: "\u20ac500k-2M" },
          { value: "2m-10m", label: "\u20ac2M-10M" },
          { value: "10m+", label: "\u20ac10M+" },
        ],
      }),
      sortOrder: 2,
      required: false,
    },
    {
      stepId: pamCompanyId,
      componentType: "radio-group",
      fieldKey: "team_size",
      label: "Team Size",
      config: j({
        layout: "horizontal",
        options: [
          { value: "1-5", label: "1-5" },
          { value: "6-20", label: "6-20" },
          { value: "21-50", label: "21-50" },
          { value: "51-200", label: "51-200" },
          { value: "200+", label: "200+" },
        ],
      }),
      sortOrder: 3,
      required: false,
    },
  ]);

  // -- PAM Step 2: Needs --
  const pamNeedsId = await createStep("pam-needs", "step", "Your Needs", 18, {
    title: "Your Needs",
    layout: "single-column",
    showProgress: true,
  }, 500, 600);

  await db.insert(schema.stepComponents).values([
    {
      stepId: pamNeedsId,
      componentType: "card-selector",
      fieldKey: "selected_ecosystems",
      label: "Ecosystems",
      config: j({
        selectionMode: "multiple",
        columns: 3,
        cards: [
          { key: "finder", title: "Finder", subtitle: "Product comparison & search platform", icon: "search" },
          { key: "odyn", title: "ODYN", subtitle: "IoT device management & firmware", icon: "cpu" },
          { key: "crowds", title: "Crowds", subtitle: "Team collaboration & marketplace", icon: "users" },
          { key: "design", title: "Design Hub", subtitle: "Design system & component toolkit", icon: "palette" },
          { key: "etd", title: "ETD", subtitle: "3D-printed spare parts marketplace", icon: "printer" },
          { key: "admin", title: "Admin Panel", subtitle: "Multi-tenant admin dashboard", icon: "layout-dashboard" },
          { key: "opensoftware", title: "OpenSoftware", subtitle: "Business tools (mailer, accounting, legal)", icon: "package" },
          { key: "affiliate", title: "Affiliate Manager", subtitle: "Partner CRM & campaign management", icon: "handshake" },
          { key: "devtools", title: "DevTools", subtitle: "Browser automation & testing", icon: "terminal" },
        ],
        style: "bordered",
      }),
      sortOrder: 0,
      required: false,
    },
    {
      stepId: pamNeedsId,
      componentType: "text-area",
      fieldKey: "biggest_challenge",
      label: "What's your biggest challenge right now?",
      config: j({ placeholder: "Describe the main problem you're trying to solve...", rows: 4 }),
      sortOrder: 1,
      required: true,
    },
  ]);

  // -- PAM Step 3: Contact / Schedule --
  const pamContactId = await createStep("pam-contact", "end", "Schedule a Call", 19, {
    title: "Schedule a Call",
    layout: "single-column",
    showProgress: true,
  }, 500, 800);

  await db.insert(schema.stepComponents).values([
    {
      stepId: pamContactId,
      componentType: "text-input",
      fieldKey: "contact_name",
      label: "Name",
      config: j({ placeholder: "Jane Doe", inputType: "text" }),
      sortOrder: 0,
      required: true,
    },
    {
      stepId: pamContactId,
      componentType: "email-input",
      fieldKey: "contact_email",
      label: "Email",
      config: j({ placeholder: "you@company.com" }),
      sortOrder: 1,
      required: true,
    },
    {
      stepId: pamContactId,
      componentType: "phone-input",
      fieldKey: "contact_phone",
      label: "Phone",
      config: j({ placeholder: "+49 ..." }),
      sortOrder: 2,
      required: true,
    },
    {
      stepId: pamContactId,
      componentType: "radio-group",
      fieldKey: "callback_time",
      label: "Preferred Callback Time",
      config: j({
        layout: "horizontal",
        options: [
          { value: "morning", label: "Morning (9-12)" },
          { value: "afternoon", label: "Afternoon (12-17)" },
          { value: "evening", label: "Evening (17-20)" },
          { value: "anytime", label: "Anytime" },
        ],
      }),
      sortOrder: 3,
      required: false,
    },
  ]);

  // -- End node (shared terminal for DIY + DFY + PAM) --
  await createStep("end", "end", "End", 20, {
    title: "Thank you!",
    layout: "single-column",
    showProgress: false,
  }, 250, 2000);

  // ====================================================================
  // EDGES
  // ====================================================================

  // We build all edges in an array and batch-insert them.
  type EdgeDef = {
    flowId: string;
    sourceStepId: string;
    targetStepId: string;
    conditionType: "always" | "equals" | "contains";
    conditionFieldKey?: string;
    conditionValue?: string;
    label?: string;
    priority: number;
  };

  const edges: EdgeDef[] = [];

  const addEdge = (
    sourceKey: string,
    targetKey: string,
    conditionType: "always" | "equals" | "contains",
    fieldKey?: string,
    value?: string,
    priority = 0,
    label?: string,
  ) => {
    edges.push({
      flowId,
      sourceStepId: stepIds[sourceKey],
      targetStepId: stepIds[targetKey],
      conditionType,
      conditionFieldKey: fieldKey,
      conditionValue: value,
      label,
      priority,
    });
  };

  // 1. start -> tier-select (always)
  addEdge("start", "tier-select", "always", undefined, undefined, 0);

  // 2-4. tier-select -> three paths
  addEdge("tier-select", "diy-waitlist", "equals", "tier", "diy", 0, "DIY");
  addEdge("tier-select", "dfy-hosting", "equals", "tier", "dfy", 1, "Done For You");
  addEdge("tier-select", "pam-company", "equals", "tier", "pam", 2, "Account Manager");

  // 5. diy-waitlist -> end (always) — diy-waitlist is type "end" but we still add the edge
  addEdge("diy-waitlist", "end", "always", undefined, undefined, 0);

  // 6-7. DFY linear: hosting -> profile -> ecosystems
  addEdge("dfy-hosting", "dfy-profile", "always", undefined, undefined, 0);
  addEdge("dfy-profile", "dfy-ecosystems", "always", undefined, undefined, 0);

  // 8-16+fallback. DFY ecosystems branching chain.
  // From dfy-ecosystems and each eco step, add edges to all LATER eco steps
  // (conditional on selected_ecosystems contains that eco key) plus a final
  // fallback edge to dfy-requirements (always, lowest priority).

  const ecoStepKeys = ECO_ORDER.map((eco) => `eco-${eco}`);

  // Helper: from a given source step, add edges to all eco steps from startIdx onward, plus fallback
  const addEcoChain = (sourceKey: string, startIdx: number) => {
    let priority = 0;
    for (let i = startIdx; i < ECO_ORDER.length; i++) {
      addEdge(sourceKey, ecoStepKeys[i], "contains", "selected_ecosystems", ECO_ORDER[i], priority);
      priority++;
    }
    // Fallback: always -> dfy-requirements (lowest priority)
    addEdge(sourceKey, "dfy-requirements", "always", undefined, undefined, priority);
  };

  // From dfy-ecosystems -> first eco that matches, or fallback to dfy-requirements
  addEcoChain("dfy-ecosystems", 0);

  // From each eco step -> next matching eco step, or fallback to dfy-requirements
  for (let i = 0; i < ECO_ORDER.length; i++) {
    addEcoChain(ecoStepKeys[i], i + 1);
  }

  // DFY final: requirements -> contact -> end
  addEdge("dfy-requirements", "dfy-contact", "always", undefined, undefined, 0);
  addEdge("dfy-contact", "end", "always", undefined, undefined, 0);

  // PAM path: company -> needs -> contact -> end
  addEdge("pam-company", "pam-needs", "always", undefined, undefined, 0);
  addEdge("pam-needs", "pam-contact", "always", undefined, undefined, 0);
  addEdge("pam-contact", "end", "always", undefined, undefined, 0);

  // ------ Batch insert edges ------
  for (const edge of edges) {
    await db.insert(schema.flowEdges).values(edge);
  }

  // ====================================================================
  // Summary
  // ====================================================================

  const totalSteps = Object.keys(stepIds).length;
  const totalEdges = edges.length;

  // Count components (approximate from our inserts)
  console.log("\nSeed complete! Created:");
  console.log(`  Flow: "Master Weaver Inquiry" (mw-inquiry) [published]`);
  console.log(`  ${totalSteps} steps:`);
  console.log(`    - 1 start`);
  console.log(`    - 1 tier-select`);
  console.log(`    - 1 diy-waitlist (end)`);
  console.log(`    - 5 DFY steps (hosting, profile, ecosystems, requirements, contact)`);
  console.log(`    - 9 ecosystem sub-flows (finder, odyn, crowds, design, etd, admin, opensoftware, affiliate, devtools)`);
  console.log(`    - 3 PAM steps (company, needs, contact)`);
  console.log(`    - 1 end`);
  console.log(`  ${totalEdges} edges (including ${ECO_ORDER.length * (ECO_ORDER.length + 1) / 2 + ECO_ORDER.length + 1} ecosystem chain edges)`);
  console.log(`  1 flow version (v1)`);

  sqlite.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  sqlite.close();
  process.exit(1);
});
