"use server";

import crypto from "crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { articleBlocksToHtml, normalizeBlocksJson, parseArticleBlocks } from "@/lib/article-blocks";
import { generateSummary, plainTextToHtml, sanitizeArticleHtml } from "@/lib/content";
import { db } from "@/lib/db";
import { importDocxToHtml } from "@/lib/import-docx";
import { isNonEmptyFile, saveUploadFile } from "@/lib/storage";

function publicToken() {
  return crypto.randomBytes(12).toString("base64url");
}

async function saveCover(formData: FormData) {
  const coverUrl = String(formData.get("coverImageUrl") || "").trim();
  const coverFile = formData.get("coverImageFile");

  if (isNonEmptyFile(coverFile)) {
    const saved = await saveUploadFile(coverFile, "covers");
    return saved.publicUrl;
  }

  return coverUrl || null;
}

async function saveBlockImageUploads(contentBlocksJson: string, formData: FormData) {
  const blocks = parseArticleBlocks(contentBlocksJson);
  let changed = false;

  for (const block of blocks) {
    if (block.type !== "image") continue;

    const imageFile = formData.get(`blockImageFile:${block.id}`);
    if (isNonEmptyFile(imageFile)) {
      const savedImage = await saveUploadFile(imageFile, "body-images");
      block.url = savedImage.publicUrl;
      changed = true;
    }
  }

  return changed ? JSON.stringify(blocks) : contentBlocksJson;
}

async function articleContentFromForm(formData: FormData) {
  const plainText = String(formData.get("plainText") || "").trim();
  const contentBlocksJson = await saveBlockImageUploads(normalizeBlocksJson(String(formData.get("contentBlocksJson") || "[]")), formData);
  const blockHtml = articleBlocksToHtml(contentBlocksJson);
  const docxFile = formData.get("docxFile");

  let contentHtml = "";
  let sourceType = "text";
  let sourceFilePath: string | null = null;

  if (blockHtml) {
    sourceType = "blocks";
    if (isNonEmptyFile(docxFile)) {
      const savedDocx = await saveUploadFile(docxFile, "sources");
      sourceFilePath = savedDocx.filePath;
    }
    contentHtml = blockHtml;
  } else if (isNonEmptyFile(docxFile)) {
    const savedDocx = await saveUploadFile(docxFile, "sources");
    sourceType = "docx";
    sourceFilePath = savedDocx.filePath;
    const imported = await importDocxToHtml(savedDocx.filePath);
    contentHtml = imported.html;
  } else if (plainText) {
    contentHtml = sanitizeArticleHtml(plainTextToHtml(plainText));
  }

  return {
    contentBlocksJson: blockHtml ? contentBlocksJson : null,
    contentHtml,
    sourceFilePath,
    sourceType
  };
}

export async function submitArticleAction(formData: FormData) {
  const session = await requireRole(["member", "admin", "owner"]);
  const title = String(formData.get("title") || "").trim();
  const submittedBy = String(formData.get("submittedBy") || "").trim() || session.name;
  const notes = String(formData.get("notes") || "").trim();
  const articleContent = await articleContentFromForm(formData);

  if (!title) {
    redirect("/submit?error=missing-title");
  }

  if (!articleContent.contentHtml.trim()) {
    redirect("/submit?error=missing-content");
  }

  const coverImageUrl = await saveCover(formData);
  const summary = generateSummary(articleContent.contentHtml);

  const article = await db.article.create({
    data: {
      title,
      submittedBy,
      submittedByUserId: session.userId || null,
      notes: notes || null,
      sourceType: articleContent.sourceType,
      sourceFilePath: articleContent.sourceFilePath,
      coverImageUrl,
      contentHtml: articleContent.contentHtml,
      contentBlocksJson: articleContent.contentBlocksJson,
      summary,
      status: "submitted"
    }
  });

  revalidatePath("/admin/articles");
  revalidatePath("/my/articles");
  redirect(`/submit?submitted=${article.id}`);
}

export async function saveArticleDraftAction(formData: FormData) {
  const session = await requireRole(["member", "admin", "owner"]);
  const title = String(formData.get("title") || "").trim() || "未命名草稿";
  const submittedBy = String(formData.get("submittedBy") || "").trim() || session.name;
  const notes = String(formData.get("notes") || "").trim();
  const articleContent = await articleContentFromForm(formData);
  const coverImageUrl = await saveCover(formData);
  const summary = articleContent.contentHtml.trim() ? generateSummary(articleContent.contentHtml) : "";

  const article = await db.article.create({
    data: {
      title,
      submittedBy,
      submittedByUserId: session.userId || null,
      notes: notes || null,
      sourceType: articleContent.sourceType,
      sourceFilePath: articleContent.sourceFilePath,
      coverImageUrl,
      contentHtml: articleContent.contentHtml,
      contentBlocksJson: articleContent.contentBlocksJson,
      summary,
      status: "draft"
    }
  });

  revalidatePath("/admin/articles");
  revalidatePath("/my/articles");

  if (session.role === "owner" || session.role === "admin") {
    redirect(`/admin/articles/${article.id}/edit?saved=1`);
  }

  redirect(`/submit?draft=${article.id}`);
}

async function persistOwnArticle(formData: FormData, intent: "save" | "submit") {
  const session = await requireRole(["member", "admin", "owner"]);
  const id = String(formData.get("id") || "");
  const titleInput = String(formData.get("title") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const currentCover = String(formData.get("currentCoverImageUrl") || "").trim();
  const coverImageUrl = (await saveCover(formData)) || currentCover || null;
  const articleContent = await articleContentFromForm(formData);
  const shouldSubmit = intent === "submit";
  const title = titleInput || (shouldSubmit ? "" : "未命名草稿");

  if (!id) {
    redirect("/my/articles");
  }

  const existing = await db.article.findUniqueOrThrow({ where: { id } });
  const isOwner = session.role !== "member" || existing.submittedByUserId === session.userId;
  const editable = ["draft", "submitted", "rejected"].includes(existing.status);

  if (!isOwner || !editable) {
    redirect("/my/articles?error=not-editable");
  }

  if (shouldSubmit && (!title || !articleContent.contentHtml.trim())) {
    redirect(`/my/articles/${id}/edit?error=missing-fields`);
  }

  const summary = articleContent.contentHtml.trim() ? generateSummary(articleContent.contentHtml) : "";

  await db.article.update({
    where: { id },
    data: {
      title,
      submittedBy: existing.submittedBy || session.name,
      submittedByUserId: existing.submittedByUserId || session.userId || null,
      notes: notes || null,
      sourceType: articleContent.sourceType,
      sourceFilePath: articleContent.sourceFilePath || existing.sourceFilePath,
      coverImageUrl,
      contentHtml: articleContent.contentHtml,
      contentBlocksJson: articleContent.contentBlocksJson,
      summary,
      status: shouldSubmit ? "submitted" : existing.status,
      reviewNote: shouldSubmit ? null : existing.reviewNote,
      publicToken: shouldSubmit ? null : existing.publicToken,
      publishedAt: shouldSubmit ? null : existing.publishedAt
    }
  });

  revalidatePath("/my/articles");
  revalidatePath(`/my/articles/${id}`);
  revalidatePath("/admin/articles");

  if (shouldSubmit) {
    redirect(`/my/articles/${id}?submitted=1`);
  }

  redirect(`/my/articles/${id}/edit?saved=1`);
}

export async function saveOwnArticleAction(formData: FormData) {
  return persistOwnArticle(formData, "save");
}

export async function resubmitOwnArticleAction(formData: FormData) {
  return persistOwnArticle(formData, "submit");
}

async function persistArticle(formData: FormData, intent: "save" | "publish") {
  await requireRole(["owner", "admin"]);

  const id = String(formData.get("id") || "");
  const titleInput = String(formData.get("title") || "").trim();
  const summaryInput = String(formData.get("summary") || "").trim();
  const reviewNoteInput = String(formData.get("reviewNote") || "").trim();
  const currentCover = String(formData.get("currentCoverImageUrl") || "").trim();
  const coverImageUrl = (await saveCover(formData)) || currentCover || null;
  const contentBlocksJson = await saveBlockImageUploads(normalizeBlocksJson(String(formData.get("contentBlocksJson") || "[]")), formData);
  const blockHtml = articleBlocksToHtml(contentBlocksJson);
  let contentHtml = blockHtml || sanitizeArticleHtml(String(formData.get("contentHtml") || ""));
  const shouldPublish = intent === "publish";
  const title = titleInput || (shouldPublish ? "" : "未命名草稿");

  if (!id || (shouldPublish && (!title || !contentHtml.trim()))) {
    redirect(`/admin/articles/${id}/edit?error=missing-fields`);
  }

  const existing = await db.article.findUniqueOrThrow({ where: { id } });
  const summary = summaryInput || (contentHtml.trim() ? generateSummary(contentHtml) : "");

  await db.article.update({
    where: { id },
    data: {
      title,
      summary,
      coverImageUrl,
      contentHtml,
      contentBlocksJson: blockHtml ? contentBlocksJson : null,
      status: shouldPublish ? "published" : existing.status,
      reviewNote: shouldPublish ? null : reviewNoteInput || null,
      publicToken: shouldPublish && !existing.publicToken ? publicToken() : existing.publicToken,
      publishedAt: shouldPublish && !existing.publishedAt ? new Date() : existing.publishedAt
    }
  });

  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${id}/edit`);
  if (existing.submittedByUserId) revalidatePath("/my/articles");

  if (shouldPublish) {
    redirect(`/admin/articles/${id}/preview`);
  }

  redirect(`/admin/articles/${id}/edit?saved=1`);
}

export async function updateArticleAction(formData: FormData) {
  return persistArticle(formData, "save");
}

export async function publishArticleAction(formData: FormData) {
  return persistArticle(formData, "publish");
}

export async function rejectArticleAction(formData: FormData) {
  await requireRole(["owner", "admin"]);

  const id = String(formData.get("id") || "");
  const reviewNote = String(formData.get("reviewNote") || "").trim();
  const redirectTo = String(formData.get("redirectTo") || "");

  if (!id) {
    redirect("/admin/articles");
  }

  const article = await db.article.update({
    where: { id },
    data: {
      status: "rejected",
      reviewNote: reviewNote || "稿件已驳回，请根据反馈修改后重新提交。"
    }
  });

  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${id}/edit`);
  if (article.submittedByUserId) revalidatePath("/my/articles");
  if (redirectTo === "list") {
    redirect("/admin/articles");
  }
  redirect(`/admin/articles/${id}/edit?saved=1`);
}

export async function archiveArticleAction(formData: FormData) {
  await requireRole(["owner", "admin"]);
  const id = String(formData.get("id") || "");
  const article = await db.article.update({ where: { id }, data: { status: "archived" } });
  revalidatePath("/admin/articles");
  if (article.submittedByUserId) revalidatePath("/my/articles");
  redirect("/admin/articles");
}
