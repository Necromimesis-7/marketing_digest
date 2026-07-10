import "server-only";

import { db } from "@/lib/db";

type PopoResponse<T> = {
  data?: T;
  errcode?: number;
  errmsg?: string;
  status?: number;
  message?: string;
  traceId?: string;
};

type TokenPayload = {
  accessToken: string;
  accessExpiredAt: number;
  refreshToken: string;
  refreshExpiredAt: number;
};

type SendMessageResponse = {
  msgInfo: Record<string, string>;
};

export type CardItem = string | { title: string; url?: string };

const TOKEN_ID = "robot";

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

async function requestJson<T>(path: string, init: RequestInit) {
  const response = await fetch(`${popoBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    },
    cache: "no-store"
  });

  const data = (await response.json().catch(() => ({}))) as PopoResponse<T>;
  if (!response.ok) {
    throw new Error(data.errmsg || data.message || `POPO request failed: ${response.status}`);
  }
  return data;
}

async function fetchNewToken() {
  const { appKey, appSecret } = appCredentials();
  const response = await requestJson<TokenPayload>("/open-apis/robots/v1/token", {
    method: "POST",
    body: JSON.stringify({ appKey, appSecret })
  });

  if (response.errcode !== 0 || !response.data) {
    throw new Error(response.errmsg || "Failed to get POPO token");
  }

  return saveToken(response.data);
}

async function refreshToken(refreshToken: string) {
  const { appKey } = appCredentials();
  const response = await requestJson<TokenPayload>("/open-apis/robots/v1/token/refresh", {
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

async function saveToken(token: TokenPayload) {
  return db.popoToken.upsert({
    where: { id: TOKEN_ID },
    update: {
      accessToken: token.accessToken,
      accessExpiredAt: new Date(token.accessExpiredAt),
      refreshToken: token.refreshToken,
      refreshExpiredAt: new Date(token.refreshExpiredAt)
    },
    create: {
      id: TOKEN_ID,
      accessToken: token.accessToken,
      accessExpiredAt: new Date(token.accessExpiredAt),
      refreshToken: token.refreshToken,
      refreshExpiredAt: new Date(token.refreshExpiredAt)
    }
  });
}

export async function getAccessToken(forceRefresh = false) {
  if (forceRefresh) {
    const existing = await db.popoToken.findUnique({ where: { id: TOKEN_ID } });
    if (existing && existing.refreshExpiredAt.getTime() > Date.now()) {
      return refreshToken(existing.refreshToken);
    }
    return fetchNewToken();
  }

  const existing = await db.popoToken.findUnique({ where: { id: TOKEN_ID } });
  const oneMinuteFromNow = Date.now() + 60_000;

  if (existing && existing.accessExpiredAt.getTime() > oneMinuteFromNow) {
    return existing;
  }

  if (existing && existing.refreshExpiredAt.getTime() > Date.now()) {
    return refreshToken(existing.refreshToken);
  }

  return fetchNewToken();
}

async function authorizedRequest<T>(path: string, init: RequestInit, retried = false) {
  const token = await getAccessToken(retried);
  const response = await requestJson<T>(path, {
    ...init,
    headers: {
      "Open-Access-Token": token.accessToken,
      ...(init.headers || {})
    }
  });

  if (!retried && (response.errcode === 42001 || response.status === 42001)) {
    return authorizedRequest<T>(path, init, true);
  }

  return response;
}

export function buildRichTextContent(input: { title: string; summary: string; url: string }) {
  return [
    { tag: "text", style: ["bold"], text: `【创意营销案例分享】\n${input.title}\n\n` },
    { tag: "text", text: input.summary ? `摘要：${input.summary}\n\n` : "" },
    { tag: "text", text: "阅读全文：" },
    { tag: "text", style: ["link"], text: input.url, href: input.url }
  ];
}

export async function sendRichTextMessage(input: {
  receiver: string;
  title: string;
  summary: string;
  url: string;
}) {
  const response = await authorizedRequest<SendMessageResponse>("/open-apis/robots/v1/im/send-msg", {
    method: "POST",
    body: JSON.stringify({
      receiver: input.receiver,
      msgType: "rich_text",
      message: {
        content: buildRichTextContent(input)
      }
    })
  });

  if (response.errcode !== 0 || !response.data) {
    throw Object.assign(new Error(response.errmsg || response.message || "POPO send message failed"), {
      errcode: response.errcode || response.status,
      errmsg: response.errmsg || response.message,
      traceId: response.traceId
    });
  }

  return response.data;
}

function cardTemplateUuid(templateUuidOverride?: string) {
  const templateUuid = templateUuidOverride || process.env.POPO_CARD_TEMPLATE_UUID;
  if (!templateUuid) {
    throw Object.assign(new Error("POPO_CARD_TEMPLATE_UUID is required for card messages"), {
      errmsg: "POPO_CARD_TEMPLATE_UUID is required for card messages"
    });
  }
  return templateUuid;
}

export function buildCardVariables(input: {
  title: string;
  summary: string;
  url: string;
  coverImageUrl?: string;
  items: CardItem[];
  columnTitle?: string;
  buttonText?: string;
  itemLimit?: number;
}) {
  const itemLimit = Math.min(5, Math.max(1, input.itemLimit || 4));
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

export async function sendCardMessage(input: {
  receiver: string;
  instanceUuid: string;
  title: string;
  summary: string;
  url: string;
  coverImageUrl?: string;
  items: CardItem[];
  templateUuid?: string;
  columnTitle?: string;
  buttonText?: string;
  itemLimit?: number;
}) {
  const templateUuid = cardTemplateUuid(input.templateUuid);
  const callBackConfigKey = process.env.POPO_CARD_CALLBACK_CONFIG_KEY || undefined;
  const compatibleMessage = `${input.title}\n${input.summary ? `${input.summary}\n` : ""}${input.url}`;

  const response = await authorizedRequest<SendMessageResponse>("/open-apis/robots/v1/im/send-msg", {
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

export async function getTeamInfo(tid: string) {
  const response = await authorizedRequest<{ name: string; desc?: string; board?: string }>(
    `/open-apis/robots/v1/team/${tid}/info?scopes=board`,
    { method: "GET" }
  );

  if (response.errcode !== 0 || !response.data) {
    throw Object.assign(new Error(response.errmsg || response.message || "Failed to get POPO team info"), {
      errcode: response.errcode || response.status,
      errmsg: response.errmsg || response.message
    });
  }

  return response.data;
}

export async function recallMessage(input: { msgId: string; sessionId: string }) {
  const response = await authorizedRequest<boolean>(`/open-apis/robots/v1/im/${input.msgId}/recall`, {
    method: "POST",
    body: JSON.stringify({
      sessionId: input.sessionId,
      sessionType: 3
    })
  });

  if (response.errcode !== 0) {
    throw Object.assign(new Error(response.errmsg || response.message || "Failed to recall POPO message"), {
      errcode: response.errcode || response.status,
      errmsg: response.errmsg || response.message
    });
  }

  return response.data;
}
