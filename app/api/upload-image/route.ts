import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { isNonEmptyFile, saveBuffer } from "@/lib/storage";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function extensionFromMime(type: string) {
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  if (type === "image/avif") return ".avif";
  return ".png";
}

export async function POST(request: Request) {
  await requireRole(["member", "admin", "owner"]);

  const formData = await request.formData();
  const imageFile = formData.get("imageFile");

  if (!isNonEmptyFile(imageFile)) {
    return NextResponse.json({ error: "missing-image" }, { status: 400 });
  }

  if (!imageFile.type.startsWith("image/")) {
    return NextResponse.json({ error: "unsupported-file" }, { status: 400 });
  }

  if (imageFile.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "file-too-large" }, { status: 400 });
  }

  try {
    const ext = extensionFromMime(imageFile.type);
    const name = imageFile.name || `pasted-image${ext}`;
    const savedImage = await saveBuffer(Buffer.from(await imageFile.arrayBuffer()), name, "body-images", ext);
    return NextResponse.json({ url: savedImage.publicUrl });
  } catch (error) {
    console.error("Image upload failed", error);
    return NextResponse.json({ error: "upload-failed" }, { status: 500 });
  }
}
