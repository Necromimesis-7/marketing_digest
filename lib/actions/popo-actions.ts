"use server";

import crypto from "crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { CARD_CONFIG_ID, DEFAULT_CARD_CONFIG, clampCardItemLimit, getCardConfig } from "@/lib/card-config";
import { absoluteUrl, extractDigestItems, publicArticleUrl } from "@/lib/content";
import { db } from "@/lib/db";
import { getTeamInfo, recallMessage, sendCardMessage, sendRichTextMessage } from "@/lib/popo";

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

export async function createChannelAction(formData: FormData) {
  await requireRole(["owner", "admin"]);
  const name = String(formData.get("name") || "").trim();
  const receiverTid = String(formData.get("receiverTid") || "").trim();
  const channelType = String(formData.get("channelType") || "production");

  if (!name || !receiverTid) {
    redirect("/admin/popo/channels?error=missing-fields");
  }

  await db.popoChannel.create({
    data: {
      name,
      receiverTid,
      channelType: channelType === "test" ? "test" : "production"
    }
  });

  revalidatePath("/admin/popo/channels");
  redirect("/admin/popo/channels?saved=1");
}

export async function updateChannelAction(formData: FormData) {
  await requireRole(["owner", "admin"]);
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const receiverTid = String(formData.get("receiverTid") || "").trim();
  const channelType = String(formData.get("channelType") || "production");
  const enabled = formData.get("enabled") === "on";

  await db.popoChannel.update({
    where: { id },
    data: {
      name,
      receiverTid,
      channelType: channelType === "test" ? "test" : "production",
      enabled
    }
  });

  revalidatePath("/admin/popo/channels");
  redirect("/admin/popo/channels?saved=1");
}

export async function checkChannelAction(formData: FormData) {
  await requireRole(["owner", "admin"]);
  const id = String(formData.get("id") || "");
  const channel = await db.popoChannel.findUniqueOrThrow({ where: { id } });

  try {
    const info = await getTeamInfo(channel.receiverTid);
    await db.popoChannel.update({
      where: { id },
      data: {
        lastCheckedAt: new Date(),
        lastCheckStatus: `ok: ${info.name || "群信息可访问"}`
      }
    });
  } catch (error) {
    const details = errorDetails(error);
    await db.popoChannel.update({
      where: { id },
      data: {
        lastCheckedAt: new Date(),
        lastCheckStatus: `failed: ${details.errcode ? `${details.errcode} ` : ""}${details.message}`
      }
    });
    await db.errorLog.create({
      data: {
        scope: "push",
        message: details.message,
        details: `channel=${channel.name}, receiver=${channel.receiverTid}`
      }
    });
  }

  revalidatePath("/admin/popo/channels");
  redirect("/admin/popo/channels?checked=1");
}

export async function sendChannelTestAction(formData: FormData) {
  await requireRole(["owner", "admin"]);
  const id = String(formData.get("id") || "");
  const channel = await db.popoChannel.findUniqueOrThrow({ where: { id } });

  try {
    const response = await sendRichTextMessage({
      receiver: channel.receiverTid,
      title: "测试推送",
      summary: "如果你看到这条消息，说明营销案例分享工具已经可以向该 POPO 群发送 rich_text 消息。",
      url: process.env.APP_BASE_URL || "http://localhost:3000"
    });

    await db.pushLog.create({
      data: {
        channelId: channel.id,
        receiverTid: channel.receiverTid,
        msgId: response.msgInfo[channel.receiverTid],
        status: "success",
        pushedAt: new Date(),
        requestSummary: "POPO channel test message"
      }
    });
    await db.popoChannel.update({
      where: { id: channel.id },
      data: {
        lastCheckedAt: new Date(),
        lastCheckStatus: "ok: test message sent"
      }
    });
  } catch (error) {
    const details = errorDetails(error);
    await db.pushLog.create({
      data: {
        channelId: channel.id,
        receiverTid: channel.receiverTid,
        status: "failed",
        errcode: details.errcode,
        errmsg: details.errmsg,
        requestSummary: "POPO channel test message"
      }
    });
    await db.errorLog.create({
      data: {
        scope: "push",
        message: details.message,
        details: `channel=${channel.name}, receiver=${channel.receiverTid}`
      }
    });
    await db.popoChannel.update({
      where: { id: channel.id },
      data: {
        lastCheckedAt: new Date(),
        lastCheckStatus: `failed: ${details.errcode ? `${details.errcode} ` : ""}${details.message}`
      }
    });
  }

  revalidatePath("/admin/popo/channels");
  redirect("/admin/popo/channels?tested=1");
}

export async function updateCardConfigAction(formData: FormData) {
  await requireRole(["owner"]);

  const templateUuid = String(formData.get("templateUuid") || "").trim();
  const columnTitle = String(formData.get("columnTitle") || "").trim() || DEFAULT_CARD_CONFIG.columnTitle;
  const buttonText = String(formData.get("buttonText") || "").trim() || DEFAULT_CARD_CONFIG.buttonText;
  const defaultCoverImageUrl = String(formData.get("defaultCoverImageUrl") || "").trim();
  const itemLimit = clampCardItemLimit(Number(formData.get("itemLimit") || DEFAULT_CARD_CONFIG.itemLimit));

  if (!templateUuid && !process.env.POPO_CARD_TEMPLATE_UUID) {
    redirect("/admin/popo/card?error=missing-template");
  }

  await db.cardConfig.upsert({
    where: { id: CARD_CONFIG_ID },
    update: {
      templateUuid,
      columnTitle,
      buttonText,
      defaultCoverImageUrl: defaultCoverImageUrl || null,
      itemLimit,
      itemSource: "auto"
    },
    create: {
      id: CARD_CONFIG_ID,
      templateUuid,
      columnTitle,
      buttonText,
      defaultCoverImageUrl: defaultCoverImageUrl || null,
      itemLimit,
      itemSource: "auto"
    }
  });

  revalidatePath("/admin/popo/card");
  revalidatePath("/admin/articles");
  redirect("/admin/popo/card?saved=1");
}

export async function pushArticleAction(formData: FormData) {
  await requireRole(["owner", "admin"]);
  const articleId = String(formData.get("articleId") || "");
  const channelIds = formData.getAll("channelIds").map(String);

  if (!channelIds.length) {
    redirect(`/admin/articles/${articleId}/push?error=no-channel`);
  }

  const article = await db.article.findUniqueOrThrow({ where: { id: articleId } });
  if (article.status === "draft" || article.status === "rejected") {
    redirect(`/admin/articles/${articleId}/push?error=draft`);
  }

  const channels = await db.popoChannel.findMany({
    where: {
      id: { in: channelIds },
      enabled: true
    }
  });
  const cardConfig = await getCardConfig();

  const token = article.publicToken || cryptoRandomToken();
  if (!article.publicToken || article.status === "submitted") {
    await db.article.update({
      where: { id: article.id },
      data: {
        publicToken: token,
        status: "published",
        publishedAt: article.publishedAt || new Date()
      }
    });
  }

  let successCount = 0;
  let failCount = 0;

  for (const channel of channels) {
    try {
      const response = await sendCardMessage({
        receiver: channel.receiverTid,
        instanceUuid: `digest-${article.id}-${channel.id}-${Date.now()}`.slice(0, 128),
        title: article.title,
        summary: article.summary,
        url: publicArticleUrl(token),
        coverImageUrl: absoluteUrl(article.coverImageUrl || cardConfig.defaultCoverImageUrl),
        items: extractDigestItems(article.contentHtml, cardConfig.itemLimit),
        templateUuid: cardConfig.templateUuid,
        columnTitle: cardConfig.columnTitle,
        buttonText: cardConfig.buttonText,
        itemLimit: cardConfig.itemLimit
      });

      await db.pushLog.create({
        data: {
          articleId: article.id,
          channelId: channel.id,
          receiverTid: channel.receiverTid,
          msgType: "card",
          msgId: response.msgInfo[channel.receiverTid],
          status: "success",
          pushedAt: new Date(),
          requestSummary: `POPO card: ${article.title} -> ${channel.name}`
        }
      });
      successCount += 1;
    } catch (error) {
      const details = errorDetails(error);
      await db.pushLog.create({
        data: {
          articleId: article.id,
          channelId: channel.id,
          receiverTid: channel.receiverTid,
          msgType: "card",
          status: "failed",
          errcode: details.errcode,
          errmsg: details.errmsg,
          requestSummary: `POPO card: ${article.title} -> ${channel.name}`
        }
      });
      await db.errorLog.create({
        data: {
          scope: "push",
          message: details.message,
          details: `article=${article.id}, channel=${channel.name}, receiver=${channel.receiverTid}`
        }
      });
      failCount += 1;
    }
  }

  await db.article.update({
    where: { id: article.id },
    data: {
      status: successCount > 0 && channels.some((channel) => channel.channelType === "production") ? "pushed" : failCount > 0 ? "push_failed" : article.status
    }
  });

  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${articleId}/push`);
  redirect(`/admin/articles/${articleId}/push?pushed=${successCount}&failed=${failCount}`);
}

export async function sendCardConfigTestAction() {
  await requireRole(["owner"]);

  const [cardConfig, article, channel] = await Promise.all([
    getCardConfig(),
    db.article.findFirst({
      where: { status: { notIn: ["archived", "draft", "rejected"] } },
      orderBy: { updatedAt: "desc" }
    }),
    db.popoChannel.findFirst({
      where: { enabled: true, channelType: "test" },
      orderBy: { createdAt: "asc" }
    })
  ]);

  if (!article) {
    redirect("/admin/popo/card?error=no-article");
  }

  if (!channel) {
    redirect("/admin/popo/card?error=no-test-channel");
  }

  const token = article.publicToken || cryptoRandomToken();
  if (!article.publicToken) {
    await db.article.update({
      where: { id: article.id },
      data: {
        publicToken: token,
        status: article.status === "submitted" ? "published" : article.status,
        publishedAt: article.publishedAt || new Date()
      }
    });
  }

  try {
    const response = await sendCardMessage({
      receiver: channel.receiverTid,
      instanceUuid: `digest-config-test-${article.id}-${channel.id}-${Date.now()}`.slice(0, 128),
      title: article.title,
      summary: article.summary,
      url: publicArticleUrl(token),
      coverImageUrl: absoluteUrl(article.coverImageUrl || cardConfig.defaultCoverImageUrl),
      items: extractDigestItems(article.contentHtml, cardConfig.itemLimit),
      templateUuid: cardConfig.templateUuid,
      columnTitle: cardConfig.columnTitle,
      buttonText: cardConfig.buttonText,
      itemLimit: cardConfig.itemLimit
    });

    await db.pushLog.create({
      data: {
        articleId: article.id,
        channelId: channel.id,
        receiverTid: channel.receiverTid,
        msgType: "card",
        msgId: response.msgInfo[channel.receiverTid],
        status: "success",
        pushedAt: new Date(),
        requestSummary: `POPO card config test: ${article.title} -> ${channel.name}`
      }
    });
  } catch (error) {
    const details = errorDetails(error);
    await db.pushLog.create({
      data: {
        articleId: article.id,
        channelId: channel.id,
        receiverTid: channel.receiverTid,
        msgType: "card",
        status: "failed",
        errcode: details.errcode,
        errmsg: details.errmsg,
        requestSummary: `POPO card config test failed: ${article.title} -> ${channel.name}`
      }
    });
    await db.errorLog.create({
      data: {
        scope: "push",
        message: details.message,
        details: `config-test article=${article.id}, channel=${channel.name}, receiver=${channel.receiverTid}`
      }
    });
    redirect("/admin/popo/card?error=test-failed");
  }

  revalidatePath("/admin/popo/card");
  revalidatePath("/admin/logs");
  redirect("/admin/popo/card?tested=1");
}

export async function recallPushAction(formData: FormData) {
  await requireRole(["owner", "admin"]);
  const logId = String(formData.get("logId") || "");
  const log = await db.pushLog.findUniqueOrThrow({ where: { id: logId } });
  const redirectPath = log.issueId ? `/admin/issues/${log.issueId}` : `/admin/articles/${log.articleId}/push`;

  if (!log.msgId) {
    redirect(`${redirectPath}?error=missing-msgid`);
  }

  try {
    await recallMessage({ msgId: log.msgId, sessionId: log.receiverTid });
    await db.pushLog.update({
      where: { id: log.id },
      data: {
        status: "recalled",
        recalledAt: new Date()
      }
    });
  } catch (error) {
    const details = errorDetails(error);
    await db.errorLog.create({
      data: {
        scope: "recall",
        message: details.message,
        details: `pushLog=${log.id}, msgId=${log.msgId}, receiver=${log.receiverTid}`
      }
    });
  }

  revalidatePath(redirectPath);
  redirect(`${redirectPath}?recalled=1`);
}

function cryptoRandomToken() {
  return crypto.randomBytes(12).toString("base64url");
}
