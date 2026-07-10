import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { importDocxToHtml } from "@/lib/import-docx";
import { htmlToText } from "@/lib/content";
import { isNonEmptyFile, saveUploadFile } from "@/lib/storage";

export async function POST(request: Request) {
  await requireRole(["member", "admin", "owner"]);

  const formData = await request.formData();
  const docxFile = formData.get("docxFile");

  if (!isNonEmptyFile(docxFile)) {
    return NextResponse.json({ error: "missing-docx" }, { status: 400 });
  }

  if (!docxFile.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "unsupported-file" }, { status: 400 });
  }

  if (docxFile.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "file-too-large" }, { status: 400 });
  }

  try {
    const savedDocx = await saveUploadFile(docxFile, "sources");
    const imported = await importDocxToHtml(savedDocx.filePath);

    return NextResponse.json({
      html: imported.html,
      text: htmlToText(imported.html),
      messages: imported.messages
    });
  } catch (error) {
    console.error("DOCX import failed", error);
    return NextResponse.json({ error: "import-failed" }, { status: 500 });
  }
}
