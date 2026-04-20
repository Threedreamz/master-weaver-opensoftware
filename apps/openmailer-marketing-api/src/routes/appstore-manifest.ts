import { Hono } from "hono";

/**
 * AppStore Manifest — OpenMailer Marketing API.
 *
 * Protocol: see Grand-Master-Weaver/.claude/rules/bubble-conventions.md →
 * "OpenSoftware AppStore — Catalog + Manifest Protocol".
 */

const MANIFEST_VERSION = "1.0.0";

export const appstoreManifestRoutes = new Hono();

appstoreManifestRoutes.get("/", (c) => {
  return c.json({
    service: "openmailer",
    version: MANIFEST_VERSION,
    sidebar: [
      {
        label: "E-Mail Marketing",
        href: "/admin/mail",
        icon: "Mail",
        permission: "mail.view",
      },
    ],
    dashboards: [
      {
        id: "mail-overview",
        route: "/admin/mail",
        mode: "iframe",
        remoteUrl: "/admin/campaigns",
        title: "Kampagnen",
      },
    ],
    widgets: [
      {
        id: "recent-campaigns",
        mode: "local",
        dataFetch: "/api/campaigns?limit=5&orderBy=sentAt",
        size: "2x1",
        title: "Letzte Kampagnen",
      },
      {
        id: "contacts-kpi",
        mode: "local",
        dataFetch: "/api/contacts/stats",
        size: "1x1",
        title: "Kontakte (aktiv)",
      },
    ],
    injections: [
      {
        host: "etd",
        targetRoute: "/admin/customers",
        widgetId: "recent-campaigns",
        slot: "above-list",
      },
    ],
  });
});
