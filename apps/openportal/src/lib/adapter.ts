import { db, createLocalAdapter } from "@opensoftware/openportal-db";
import type { PortalAdapter } from "@opensoftware/openportal-core";

export function getServerAdapter(
  workspaceId: string,
  actorUserId?: string,
): PortalAdapter {
  return createLocalAdapter({
    db: db as unknown as Parameters<typeof createLocalAdapter>[0]["db"],
    workspaceId,
    actorUserId,
  });
}
