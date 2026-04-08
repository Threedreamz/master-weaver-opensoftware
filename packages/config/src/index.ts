/**
 * Shared environment configuration for all OpenSoftware apps.
 * Each app can override these defaults via its own .env file.
 */

export interface AppConfig {
  appName: string;
  port: number;
  dbName: string;
  locale: string;
  description?: string;
  brandColor?: string;
}

export const APP_CONFIGS = {
  openflow: { appName: "OpenFlow", port: 4168, dbName: "openflow.db", locale: "de", description: "Visual form flow builder", brandColor: "#6366f1" },
  openmailer: { appName: "OpenMailer", port: 4160, dbName: "openmailer.db", locale: "de" },
  openaccounting: { appName: "OpenAccounting", port: 4162, dbName: "openaccounting.db", locale: "de" },
  openlawyer: { appName: "OpenLawyer", port: 4164, dbName: "openlawyer.db", locale: "de" },
  opensem: { appName: "OpenSEM", port: 4166, dbName: "opensem.db", locale: "de", description: "Search Engine Marketing", brandColor: "#10b981" },
  openinventory: { appName: "OpenInventory", port: 4170, dbName: "openinventory.db", locale: "de" },
  openpayroll: { appName: "OpenPayroll", port: 4172, dbName: "openpayroll.db", locale: "de" },
  openfarm: { appName: "OpenFarm", port: 4174, dbName: "openfarm.db", locale: "de", description: "3D Print Farm Management", brandColor: "#f59e0b" },
  openslicer: { appName: "OpenSlicer", port: 4175, dbName: "openslicer.db", locale: "de", description: "3D Slicer + Litophane Generator", brandColor: "#3b82f6" },
  openbounty: { appName: "OpenBounty", port: 4670, dbName: "openbounty.db", locale: "de", description: "Zeit-, Leistungs- und Bonussystem", brandColor: "#f59e0b" },
} as const;

export type AppName = keyof typeof APP_CONFIGS;

export function getAppConfig(appName: AppName): AppConfig {
  return APP_CONFIGS[appName];
}

export const SUPPORTED_LOCALES = ["cs", "de", "en", "es", "fr", "it", "nl", "pl", "pt", "sv"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "de";

export function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value !== undefined) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing environment variable: ${key}`);
}
