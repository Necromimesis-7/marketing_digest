import crypto from "crypto";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

function loadEnv() {
  const envPath = ".env";
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const db = new PrismaClient();
const tokenId = "robot";

function popoBaseUrl() {
  return (process.env.POPO_BASE_URL || "https://open.popo.netease.com").replace(/\/$/, "");
}

function appCredentials() {
  const appKey = process.env.POPO_APP_KEY;
  const appSecret = process.env.POPO_APP_SECRET;
  if (!appKey || !appSecret) {
    throw new Error("POPO_APP_KEY and POPO_APP_SECRET are required");
  }
  return { appKey, appSecret };
}

async function requestJson(path, init) {
  const response = await fetch(`${popoBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.errmsg || data.message || `POPO request failed: ${response.status}`), data);
  }
  return data;
}

async function saveToken(token) {
  return db.popoToken.upsert({
    where: { id: tokenId },
    update: {
      accessToken: token.accessToken,
      accessExpiredAt: new Date(token.accessExpiredAt),
      refreshToken: token.refreshToken,
      refreshExpiredAt: new Date(token.refreshExpiredAt)
    },
    create: {
      id: tokenId,
      accessToken: token.accessToken,
      accessExpiredAt: new Date(token.accessExpiredAt),
      refreshToken: token.refreshToken,
      refreshExpiredAt: new Date(token.refreshExpiredAt)
    }
  });
}

async function fetchNewToken() {
  const { appKey, appSecret } = appCredentials();
  const response = await requestJson("/open-apis/robots/v1/token", {
    method: "POST",
    body: JSON.stringify({ appKey, appSecret })
  });

  if (response.errcode !== 0 || !response.data) {
    throw new Error(response.errmsg || "Failed to get POPO token");
  }

  return saveToken(response.data);
}

async function refreshToken(refreshToken) {
  const { appKey } = appCredentials();
  const response = await requestJson("/open-apis/robots/v1/token/refresh", {
    method: "POST",
    body: JSON.stringify({ appKey, refreshToken })
  });

  if (response.status === 42002 || response.errcode === 42002) {
    return fetchNewToken();
  }

  if (response.errcode !== 0 || !response.data) {
    throw new Error(response.errmsg || response.message || "Failed to refresh POPO token");
  }

  return saveToken(response.data);
}

async function getAccessToken(forceRefresh = false) {
  if (forceRefresh) {
    const existing = await db.popoToken.findUnique({ where: { id: tokenId } });
    if (existing && existing.refreshExpiredAt.getTime() > Date.now()) {
      return refreshToken(existing.refreshToken);
    }
    return fetchNewToken();
  }

  const existing = await db.popoToken.findUnique({ where: { id: tokenId } });
  const oneMinuteFromNow = Date.now() + 60_000;

  if (existing && existing.accessExpiredAt.getTime() > oneMinuteFromNow) {
    return existing;
  }

  if (existing && existing.refreshExpiredAt.getTime() > Date.now()) {
    return refreshToken(existing.refreshToken);
  }

  return fetchNewToken();
}

async function authorizedRequest(path, init, retried = false) {
  const token = await getAccessToken(retried);
  const response = await requestJson(path, {
    ...init,
    headers: {
      "Open-Access-Token": token.accessToken,
      ...(init.headers || {})
    }
  });

  if (!retried && (response.errcode === 42001 || response.status === 42001)) {
    return authorizedRequest(path, init, true);
  }

  return response;
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDigestItems(html, maxItems = 4) {
  const items = [];
  const pattern = /<(h2|h3|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = pattern.exec(html)) && items.length < maxItems) {
    const text = htmlToText(match[2]).trim();
    if (text && !items.includes(text)) {
      items.push(text.slice(0, 80));
    }
  }

  return items;
}

function clampCardItemLimit(value) {
  if (!Number.isFinite(value)) return 4;
  return Math.min(5, Math.max(1, Math.trunc(value)));
}

async function getCardConfig() {
  const config = await db.cardConfig.findUnique({ where: { id: "default" } }).catch(() => null);

  return {
    templateUuid: config?.templateUuid || process.env.POPO_CARD_TEMPLATE_UUID || "",
    columnTitle: config?.columnTitle || "创意营销案例分享",
    buttonText: config?.buttonText || "阅读全文",
    defaultCoverImageUrl: config?.defaultCoverImageUrl || "",
    itemLimit: clampCardItemLimit(config?.itemLimit ?? 4)
  };
}

function publicArticleUrl(token) {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/p/${token}`;
}

function absoluteUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

function buildCardVariables(input) {
  const itemLimit = clampCardItemLimit(input.itemLimit || 4);
  const normalizedItems = input.items.slice(0, itemLimit);
  const itemTitles = normalizedItems.map((item) => (typeof item === "string" ? item : item.title));
  const [item1Title = "", item2Title = "", item3Title = "", item4Title = "", item5Title = ""] = itemTitles;

  return {
    columnTitle: input.columnTitle || "创意营销案例分享",
    title: input.title,
    summary: input.summary,
    articleUrl: input.url,
    coverUrl: input.coverImageUrl || "",
    hasCover: Boolean(input.coverImageUrl),
    hasItems: normalizedItems.length > 0,
    itemList: normalizedItems.map((item, index) => {
      const title = typeof item === "string" ? item : item.title;
      const url = typeof item === "string" ? "" : item.url || "";
      return {
        index: index + 1,
        title,
        url,
        line: `${index + 1}. ${title}`
      };
    }),
    item1Title,
    item2Title,
    item3Title,
    item4Title,
    item5Title,
    item1Visible: Boolean(item1Title),
    item2Visible: Boolean(item2Title),
    item3Visible: Boolean(item3Title),
    item4Visible: Boolean(item4Title),
    item5Visible: Boolean(item5Title),
    readMoreText: input.buttonText || "阅读全文"
  };
}

async function sendCardMessage(input) {
  const templateUuid = input.templateUuid || process.env.POPO_CARD_TEMPLATE_UUID;
  if (!templateUuid) {
    throw new Error("POPO_CARD_TEMPLATE_UUID is required");
  }

  const callBackConfigKey = process.env.POPO_CARD_CALLBACK_CONFIG_KEY || undefined;
  const compatibleMessage = `${input.title}\n${input.summary ? `${input.summary}\n` : ""}${input.url}`;

  const response = await authorizedRequest("/open-apis/robots/v1/im/send-msg", {
    method: "POST",
    body: JSON.stringify({
      receiver: input.receiver,
      msgType: "card",
      message: {
        templateUuid,
        instanceUuid: input.instanceUuid,
        ...(callBackConfigKey ? { callBackConfigKey } : {}),
        publicVariableMap: buildCardVariables(input),
        options: {
          enableForward: true,
          lastMessage: `${input.columnTitle || "创意营销案例分享"}：${input.title}`,
          compatibleMessage
        }
      }
    })
  });

  if (response.errcode !== 0 || !response.data) {
    throw Object.assign(new Error(response.errmsg || response.message || "POPO card message failed"), {
      errcode: response.errcode || response.status,
      errmsg: response.errmsg || response.message,
      traceId: response.traceId
    });
  }

  return response.data;
}

function cryptoRandomToken() {
  return crypto.randomBytes(18).toString("base64url");
}

function errorDetails(error) {
  return {
    message: error instanceof Error ? error.message : String(error),
    errcode: typeof error?.errcode === "number" ? error.errcode : typeof error?.status === "number" ? error.status : undefined,
    errmsg: typeof error?.errmsg === "string" ? error.errmsg : typeof error?.message === "string" ? error.message : undefined
  };
}

async function main() {
  const cardConfig = await getCardConfig();
  const article = await db.article.findFirst({ orderBy: { createdAt: "desc" } });
  const channel = await db.popoChannel.findFirst({
    where: { receiverTid: "8572859", enabled: true }
  });

  if (!article) throw new Error("No article found");
  if (!channel) throw new Error("No enabled POPO channel found for 8572859");

  const token = article.publicToken || cryptoRandomToken();
  if (!article.publicToken) {
    await db.article.update({
      where: { id: article.id },
      data: {
        publicToken: token,
        status: "published",
        publishedAt: article.publishedAt || new Date()
      }
    });
  }

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

    const msgId = response.msgInfo[channel.receiverTid];
    await db.pushLog.create({
      data: {
        articleId: article.id,
        channelId: channel.id,
        receiverTid: channel.receiverTid,
        msgType: "card",
        msgId,
        status: "success",
        pushedAt: new Date(),
        requestSummary: `POPO card test: ${article.title} -> ${channel.name}`
      }
    });

    console.log(JSON.stringify({ ok: true, article: article.title, receiver: channel.receiverTid, msgId }, null, 2));
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
        requestSummary: `POPO card test failed: ${article.title} -> ${channel.name}`
      }
    });
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
