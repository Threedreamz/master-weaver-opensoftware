"use server";

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { revalidatePath } from "next/cache";

const SETTINGS_PATH = join(process.cwd(), "data", "settings.json");

export interface FarmSettings {
  slicerPaths: {
    prusaslicer: string;
    orcaslicer: string;
  };
  spoolman: {
    url: string;
    enabled: boolean;
  };
  defaults: {
    moonrakerPort: number;
    octoprintPort: number;
  };
}

const DEFAULT_SETTINGS: FarmSettings = {
  slicerPaths: {
    prusaslicer: "",
    orcaslicer: "",
  },
  spoolman: {
    url: "",
    enabled: false,
  },
  defaults: {
    moonrakerPort: 7125,
    octoprintPort: 5000,
  },
};

export async function getSettings(): Promise<FarmSettings> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(formData: FormData) {
  const settings: FarmSettings = {
    slicerPaths: {
      prusaslicer: (formData.get("prusaslicerPath") as string) || "",
      orcaslicer: (formData.get("orcaslicerPath") as string) || "",
    },
    spoolman: {
      url: (formData.get("spoolmanUrl") as string) || "",
      enabled: formData.get("spoolmanEnabled") === "1",
    },
    defaults: {
      moonrakerPort: Number(formData.get("moonrakerPort")) || 7125,
      octoprintPort: Number(formData.get("octoprintPort")) || 5000,
    },
  };

  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));

  const locale = formData.get("locale") as string || "de";
  revalidatePath(`/${locale}/admin/settings`);
}
