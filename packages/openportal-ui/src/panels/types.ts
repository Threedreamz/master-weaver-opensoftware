import type { PortalAdapter } from "@opensoftware/openportal-core/adapter";

export interface PanelProps {
  adapter: PortalAdapter;
  orgId?: string;
  locale?: string;
}
