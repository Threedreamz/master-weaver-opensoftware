import { eq, desc } from "drizzle-orm";
import { db } from "../index";
import { farmSlicerProfiles } from "../schema";

export async function getProfiles() {
  return db.query.farmSlicerProfiles.findMany({
    orderBy: [desc(farmSlicerProfiles.createdAt)],
  });
}

export async function getProfileById(id: string) {
  return db.query.farmSlicerProfiles.findFirst({
    where: eq(farmSlicerProfiles.id, id),
  });
}

export async function createProfile(data: {
  name: string;
  slicerEngine: "prusaslicer" | "orcaslicer" | "bambu_studio" | "preform" | "chitubox" | "lychee" | "sls4all" | "custom";
  technology: "fdm" | "sla" | "sls";
  config: Record<string, unknown>;
  nozzleDiameter?: number;
  layerHeight?: number;
  infillDensity?: number;
  isDefault?: boolean;
  description?: string;
}) {
  const [profile] = await db.insert(farmSlicerProfiles).values(data).returning();
  return profile;
}

export async function deleteProfile(id: string) {
  await db.delete(farmSlicerProfiles).where(eq(farmSlicerProfiles.id, id));
}
