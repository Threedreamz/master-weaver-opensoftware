"use server";

import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createModel, deleteModel as deleteModelQuery, getModelById } from "@/db/queries/models";

const UPLOAD_DIR = join(process.cwd(), "data", "uploads");

const VALID_EXTENSIONS = ["stl", "3mf", "obj", "step"] as const;
type FileFormat = (typeof VALID_EXTENSIONS)[number];

function extractFormat(filename: string): FileFormat | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && (VALID_EXTENSIONS as readonly string[]).includes(ext)) {
    return ext as FileFormat;
  }
  return null;
}

export async function uploadModel(formData: FormData) {
  const file = formData.get("file") as File | null;
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || undefined;
  const locale = (formData.get("locale") as string) || "en";

  if (!file || !name) {
    throw new Error("File and name are required");
  }

  if (file.size === 0) {
    throw new Error("File is empty");
  }

  const fileFormat = extractFormat(file.name);
  if (!fileFormat) {
    throw new Error("Unsupported file format. Accepted: .stl, .3mf, .obj, .step");
  }

  const uuid = crypto.randomUUID();
  const folderPath = join(UPLOAD_DIR, uuid);

  await mkdir(folderPath, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = join(folderPath, file.name);

  await writeFile(filePath, buffer);

  await createModel({
    name,
    filename: file.name,
    filePath: join("data", "uploads", uuid, file.name),
    fileFormat,
    fileSizeBytes: file.size,
    description,
  });

  revalidatePath(`/${locale}/admin/models`);
  redirect(`/${locale}/admin/models`);
}

export async function deleteModel(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = (formData.get("locale") as string) || "en";

  if (!id) {
    throw new Error("Model ID is required");
  }

  const model = await getModelById(id);
  if (model) {
    // Remove the upload folder (uuid directory)
    const parts = model.filePath.split("/");
    // filePath format: data/uploads/{uuid}/{filename}
    const uuidFolder = join(process.cwd(), "data", "uploads", parts[2]);
    try {
      await rm(uuidFolder, { recursive: true, force: true });
    } catch {
      // File may already be deleted, continue with DB cleanup
    }
  }

  await deleteModelQuery(id);

  revalidatePath(`/${locale}/admin/models`);
}
