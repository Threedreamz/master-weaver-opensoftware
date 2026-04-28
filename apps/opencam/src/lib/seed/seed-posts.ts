/**
 * Idempotent seeder for built-in post-processors.
 *
 * Runs at instrumentation-boot; inserts one row per dialect if missing. Stable
 * IDs (`{dialect}-builtin`) mean the admin UI and API consumers can reference
 * a known post without first round-tripping through a list query.
 */

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { templateGcode as grblTpl } from "../post-processors/grbl";
import { templateGcode as marlinTpl } from "../post-processors/marlin";
import { templateGcode as fanucTpl } from "../post-processors/fanuc";
import { templateGcode as linuxcncTpl } from "../post-processors/linuxcnc";
import { templateGcode as haasTpl } from "../post-processors/haas";
import { templateGcode as mach3Tpl } from "../post-processors/mach3";

interface PostSeed {
  id: string;
  name: string;
  dialect: "grbl" | "marlin" | "fanuc" | "linuxcnc" | "haas" | "mach3";
  templateGcode: string;
}

const BUILTIN_POSTS: PostSeed[] = [
  { id: "grbl-builtin",     name: "GRBL 1.1 (built-in)",       dialect: "grbl",     templateGcode: grblTpl },
  { id: "marlin-builtin",   name: "Marlin CNC (built-in)",     dialect: "marlin",   templateGcode: marlinTpl },
  { id: "fanuc-builtin",    name: "Fanuc 0i/30i (built-in)",   dialect: "fanuc",    templateGcode: fanucTpl },
  { id: "linuxcnc-builtin", name: "LinuxCNC/EMC2 (built-in)",  dialect: "linuxcnc", templateGcode: linuxcncTpl },
  { id: "haas-builtin",     name: "Haas VF-series (built-in)", dialect: "haas",     templateGcode: haasTpl },
  { id: "mach3-builtin",    name: "Mach3 (built-in)",          dialect: "mach3",    templateGcode: mach3Tpl },
];

export async function seedBuiltinPosts(): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const p of BUILTIN_POSTS) {
    const existing = await db
      .select({ id: schema.opencamPosts.id })
      .from(schema.opencamPosts)
      .where(eq(schema.opencamPosts.id, p.id))
      .limit(1);

    if (existing.length > 0) {
      skipped += 1;
      continue;
    }

    await db.insert(schema.opencamPosts).values({
      id: p.id,
      userId: null,
      name: p.name,
      dialect: p.dialect,
      templateGcode: p.templateGcode,
      builtIn: true,
    });
    inserted += 1;
  }

  return { inserted, skipped };
}
