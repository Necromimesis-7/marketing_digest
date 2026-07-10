"use server";

import crypto from "crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { getCardConfig } from "@/lib/card-config";
import { absoluteUrl, publicArticleUrl, publicIssueUrl } from "@/lib/content";
import { db } from "@/lib/db";
import { sendCardMessage } from "@/lib/popo";
import { isNonEmptyFile, saveUploadFile } from "@/lib/storage";

function publicToken() {
  return crypto.randomBytes(12).toString("base64url");
}

function issueRedirect(issueId: string, params: string) {
  redirect(`/admin/issues/${issueId}${params}`);
}

function selectedArticleIds(formData: FormData) {
  const ids = formData.getAll("articleIds").map(String).filter(Boolean);
  return Array.from(new Set(ids));
}

function validateItemCount(ids: string[], fallbackPath: string) {
  if (!ids.length) {
    redirect(`${fallbackPath}?error=no-items`);
  }
  if (ids.length > 5) {
    redirect(`${fallbackPath}?error=too-many`);
  }
}

async function saveIssueCover(formData: FormData) {
  const coverUrl = String(formData.get("coverImageUrl") || "").trim();
  const coverFile = formData.get("coverImageFile");

  if (isNonEmptyFile(coverFile)) {
    const saved = await saveUploadFile(coverFile, "issue-covers");
    return saved.publicUrl;
  }

  return coverUrl || null;
}

function compactTopic(title: string) {
  const cleanTitle = title.replace(/\s+/g, " ").trim();
  const [prefix] = cleanTitle.split(/[：:]/).map((part) => part.trim()).filter(Boolean);
  const topic = prefix && prefix.length <= 32 ? prefix : cleanTitle;
  return topic.length > 36 ? `${topic.slice(0, 36).trim()}...` : topic;
}

function generatedIssueSummary(articles: Array<{ title: string }>) {
  const topics = articles.map((article) => compactTopic(article.title)).filter(Boolean);
  if (!topics.length) return "";
  return `本期收录 ${articles.length} 篇创意营销案例，涵盖 ${topics.join("、")}。`;
}

async function ensureArticlePublic(article: {
  id: string;
  status: string;
  publicToken: string | null;
  publishedAt: Date | null;
}) {
  if (article.publicToken && article.status !== "submitted") {
    return article.publicToken;
  }

  const token = article.publicToken || publicToken();
  await db.article.update({
    where: { id: article.id },
    data: {
      publicToken: token,
      status: article.status === "submitted" ? "published" : article.status,
      publishedAt: article.publishedAt || new Date()
    }
  });
  return token;
}

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    const extended = error as Error & { errcode?: number; errmsg?: string; traceId?: string };
    return {
      message: error.message,
      errcode: extended.errcode,
      errmsg: extended.errmsg || error.message,
      details: extended.traceId ? `traceId=${extended.traceId}` : undefined
    };
  }
  return { message: "Unknown error", errmsg: "Unknown error" };
}

export async function createIssueAction(formData: FormData) {
  await requireRole(["owner", "admin"]);

  const titleInput = String(formData.get("title") || "").trim();
  const summaryInput = String(formData.get("summary") || "").trim();
  const articleIds = selectedArticleIds(formData);

  validateItemCount(articleIds, "/admin/issues");

  const articles = await db.article.findMany({
    where: { id: { in: articleIds }, status: { notIn: ["archived", "draft", "rejected"] } }
  });
  const articleMap = new Map(articles.map((article) => [article.id, article]));
  const orderedArticles = articleIds.map((id) => articleMap.get(id));

  if (orderedArticles.some((article) => !article)) {
    redirect("/admin/issues?error=missing-article");
  }
  const issueArticles = orderedArticles as NonNullable<(typeof orderedArticles)[number]>[];

  for (const article of issueArticles) {
    await ensureArticlePublic(article);
  }

  const [issueCount, cardConfig] = await Promise.all([db.digestIssue.count(), getCardConfig()]);
  const title = titleInput || `Creative Spark 第 ${issueCount + 1} 期｜创意营销案例分享`;
  const summary = summaryInput || generatedIssueSummary(issueArticles);
  const coverImageUrl =
    (await saveIssueCover(formData)) ||
    issueArticles.find((article) => article.coverImageUrl)?.coverImageUrl ||
    cardConfig.defaultCoverImageUrl ||
    null;

  const issue = await db.digestIssue.create({
    data: {
      title,
      summary,
      coverImageUrl,
      status: "published",
      publicToken: publicToken(),
      publishedAt: new Date(),
      items: {
        create: issueArticles.map((article, index) => ({
          articleId: article.id,
          position: index + 1
        }))
      }
    }
  });

  revalidatePath("/admin/issues");
  redirect(`/admin/issues/${issue.id}?created=1`);
}

export async function updateIssueMetaAction(formData: FormData) {
  await requireRole(["owner", "admin"]);

  const issueId = String(formData.get("issueId") || "");
  const title = String(formData.get("title") || "").trim();
  const summary = String(formData.get("summary") || "").trim();
  const currentCover = String(formData.get("currentCoverImageUrl") || "").trim();
  const coverImageUrl = (await saveIssueCover(formData)) || currentCover || null;

  if (!issueId) {
    redirect("/admin/issues");
  }

  if (!title) {
    issueRedirect(issueId, "?error=missing-title");
  }

  await db.digestIssue.update({
    where: { id: issueId },
    data: {
      title,
      summary,
      coverImageUrl
    }
  });

  revalidatePath("/admin/issues");
  revalidatePath(`/admin/issues/${issueId}`);
  issueRedirect(issueId, "?saved=1");
}

export async function archiveIssueAction(formData: FormData) {
  await requireRole(["owner", "admin"]);
  const issueId = String(formData.get("issueId") || "");

  await db.digestIssue.update({
    where: { id: issueId },
    data: { status: "archived" }
  });

  revalidatePath("/admin/issues");
  redirect("/admin/issues");
}

export async function pushIssueAction(formData: FormData) {
  await requireRole(["owner", "admin"]);

  const issueId = String(formData.get("issueId") || "");
  const channelIds = formData.getAll("channelIds").map(String);

  if (!channelIds.length) {
    issueRedirect(issueId, "?error=no-channel");
  }

  const [issue, channels, cardConfig] = await Promise.all([
    db.digestIssue.findUniqueOrThrow({
      where: { id: issueId },
      include: {
        items: {
          include: { article: true },
          orderBy: { position: "asc" }
        }
      }
    }),
    db.popoChannel.findMany({
      where: {
        id: { in: channelIds },
        enabled: true
      }
    }),
    getCardConfig()
  ]);

  const issueToken = issue.publicToken || publicToken();
  if (!issue.publicToken || issue.status === "draft") {
    await db.digestIssue.update({
      where: { id: issue.id },
      data: {
        publicToken: issueToken,
        status: "published",
        publishedAt: issue.publishedAt || new Date()
      }
    });
  }

  const itemCards = [];
  for (const item of issue.items.slice(0, cardConfig.itemLimit)) {
    const articleToken = await ensureArticlePublic(item.article);
    itemCards.push({
      title: item.titleOverride || item.article.title,
      url: publicArticleUrl(articleToken)
    });
  }

  let successCount = 0;
  let failCount = 0;

  for (const channel of channels) {
    try {
      const response = await sendCardMessage({
        receiver: channel.receiverTid,
        instanceUuid: `digest-issue-${issue.id}-${channel.id}-${Date.now()}`.slice(0, 128),
        title: issue.title,
        summary: issue.summary,
        url: publicIssueUrl(issueToken),
        coverImageUrl: absoluteUrl(issue.coverImageUrl || cardConfig.defaultCoverImageUrl),
        items: itemCards,
        templateUuid: cardConfig.templateUuid,
        columnTitle: cardConfig.columnTitle,
        buttonText: cardConfig.buttonText,
        itemLimit: cardConfig.itemLimit
      });

      await db.pushLog.create({
        data: {
          issueId: issue.id,
          channelId: channel.id,
          receiverTid: channel.receiverTid,
          msgType: "card",
          msgId: response.msgInfo[channel.receiverTid],
          status: "success",
          pushedAt: new Date(),
          requestSummary: `POPO issue card: ${issue.title} -> ${channel.name}`
        }
      });
      successCount += 1;
    } catch (error) {
      const details = errorDetails(error);
      await db.pushLog.create({
        data: {
          issueId: issue.id,
          channelId: channel.id,
          receiverTid: channel.receiverTid,
          msgType: "card",
          status: "failed",
          errcode: details.errcode,
          errmsg: details.errmsg,
          requestSummary: `POPO issue card: ${issue.title} -> ${channel.name}`
        }
      });
      await db.errorLog.create({
        data: {
          scope: "push",
          message: details.message,
          details: `issue=${issue.id}, channel=${channel.name}, receiver=${channel.receiverTid}`
        }
      });
      failCount += 1;
    }
  }

  await db.digestIssue.update({
    where: { id: issue.id },
    data: {
      status: successCount > 0 && channels.some((channel) => channel.channelType === "production") ? "pushed" : failCount > 0 ? "push_failed" : issue.status
    }
  });

  revalidatePath("/admin/issues");
  revalidatePath(`/admin/issues/${issueId}`);
  redirect(`/admin/issues/${issueId}?pushed=${successCount}&failed=${failCount}`);
}
