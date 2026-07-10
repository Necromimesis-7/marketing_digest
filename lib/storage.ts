import "server-only";

import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const PUBLIC_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

function safeExtension(fileName: string, fallback: string) {
  const ext = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, "");
  return ext || fallback;
}

export async function saveBuffer(buffer: Buffer, originalName: string, directory: string, fallbackExt = "") {
  await mkdir(path.join(PUBLIC_UPLOAD_ROOT, directory), { recursive: true });
  const ext = safeExtension(originalName, fallbackExt);
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const relativePath = path.join(directory, fileName);
  const absolutePath = path.join(PUBLIC_UPLOAD_ROOT, relativePath);
  await writeFile(absolutePath, buffer);

  return {
    fileName,
    filePath: absolutePath,
    publicUrl: `/uploads/${relativePath.replaceAll(path.sep, "/")}`
  };
}

export async function saveUploadFile(file: File, directory: string) {
  const arrayBuffer = await file.arrayBuffer();
  return saveBuffer(Buffer.from(arrayBuffer), file.name, directory);
}

export function isNonEmptyFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}
