import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function saveFile(
  buffer: Buffer,
  originalname: string,
  karteId: string,
): Promise<{ dateiname: string; pfad: string }> {
  const ext = path.extname(originalname);
  const dateiname = `${karteId}_${Date.now()}${ext}`;
  const karteDir = path.join(UPLOAD_DIR, karteId);
  await ensureDir(karteDir);

  const pfad = path.join(karteDir, dateiname);
  await fs.writeFile(pfad, buffer);

  return { dateiname, pfad };
}

export async function deleteFile(pfad: string): Promise<void> {
  try {
    await fs.unlink(pfad);
  } catch {
    // File may already be deleted
  }
}

export async function streamFile(pfad: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(pfad);
  } catch {
    return null;
  }
}
