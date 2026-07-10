import { escapeHtml, plainTextToHtml, sanitizeArticleHtml } from "@/lib/content";

export type ArticleBlockType = "paragraph" | "heading" | "quote" | "image" | "video" | "divider" | "html";

export type ArticleBlock = {
  id: string;
  type: ArticleBlockType;
  text?: string;
  url?: string;
  caption?: string;
  level?: 1 | 2 | 3 | 4;
};

const ALLOWED_VIDEO_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "player.bilibili.com",
  "www.bilibili.com",
  "bilibili.com",
  "www.tiktok.com",
  "tiktok.com",
  "player.vimeo.com",
  "vimeo.com",
  "v.qq.com"
]);

function blockId() {
  return `block-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyArticleBlock(type: ArticleBlockType = "paragraph"): ArticleBlock {
  return {
    id: blockId(),
    type,
    level: type === "heading" ? 2 : undefined
  };
}

export function parseArticleBlocks(value?: string | null): ArticleBlock[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as ArticleBlock[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((block) => normalizeBlock(block))
      .filter((block): block is ArticleBlock => Boolean(block));
  } catch {
    return [];
  }
}

export function articleBlocksForEditor(contentBlocksJson: string | null | undefined, contentHtml: string) {
  const blocks = parseArticleBlocks(contentBlocksJson);
  if (blocks.length) return blocks;
  if (contentHtml.trim()) {
    return [
      {
        id: "legacy-html",
        type: "html" as const,
        text: contentHtml
      }
    ];
  }
  return [emptyArticleBlock()];
}

export function normalizeBlocksJson(value: string) {
  const blocks = parseArticleBlocks(value);
  return JSON.stringify(blocks);
}

export function articleBlocksToHtml(value: string) {
  const blocks = parseArticleBlocks(value);
  const html = blocks.map(renderBlock).filter(Boolean).join("\n");
  return sanitizeArticleHtml(html);
}

function normalizeBlock(block: Partial<ArticleBlock>) {
  if (!block || typeof block !== "object") return null;
  const type = block.type;
  if (!["paragraph", "heading", "quote", "image", "video", "divider", "html"].includes(String(type))) return null;

  const headingLevel = [1, 2, 3, 4].includes(Number(block.level)) ? (Number(block.level) as 1 | 2 | 3 | 4) : 2;
  const normalized: ArticleBlock = {
    id: String(block.id || blockId()),
    type: type as ArticleBlockType,
    text: typeof block.text === "string" ? block.text : "",
    url: typeof block.url === "string" ? block.url : "",
    caption: typeof block.caption === "string" ? block.caption : "",
    level: headingLevel
  };
  return normalized;
}

function renderBlock(block: ArticleBlock) {
  switch (block.type) {
    case "paragraph":
      return block.text?.trim() ? plainTextToHtml(block.text) : "";
    case "heading": {
      const text = block.text?.trim();
      if (!text) return "";
      const level = [1, 2, 3, 4].includes(Number(block.level)) ? block.level : 2;
      return `<h${level}>${escapeHtml(text)}</h${level}>`;
    }
    case "quote":
      return block.text?.trim() ? `<blockquote>${plainTextToHtml(block.text)}</blockquote>` : "";
    case "image":
      return renderImageBlock(block);
    case "video":
      return renderVideoBlock(block);
    case "divider":
      return "<hr>";
    case "html":
      return sanitizeArticleHtml(block.text || "");
    default:
      return "";
  }
}

function renderImageBlock(block: ArticleBlock) {
  const src = safeMediaUrl(block.url || "", { allowLocal: true });
  if (!src) return "";
  const caption = block.caption?.trim();
  return `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(caption || "")}">${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}</figure>`;
}

function renderVideoBlock(block: ArticleBlock) {
  const raw = (block.url || "").trim();
  if (!raw) return "";

  const caption = block.caption?.trim();
  const media = renderVideoMedia(raw);
  if (!media) return "";
  return `<figure>${media}${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}</figure>`;
}

function renderVideoMedia(raw: string) {
  if (raw.startsWith("<iframe")) {
    const src = iframeSrc(raw);
    return sanitizeArticleHtml(`${raw}${src ? renderVideoFallback(src) : ""}`);
  }

  const url = safeMediaUrl(raw, { allowLocal: false });
  if (!url) return "";

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
    const type = url.endsWith(".webm") ? "video/webm" : url.endsWith(".ogg") ? "video/ogg" : "video/mp4";
    return `<video controls preload="metadata"><source src="${escapeHtml(url)}" type="${type}"></video>`;
  }

  const embedUrl = toEmbedUrl(url);
  if (embedUrl) {
    return `<iframe src="${escapeHtml(embedUrl)}" title="Embedded video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>${renderVideoFallback(url)}`;
  }

  return renderVideoFallback(url);
}

function iframeSrc(value: string) {
  const match = value.match(/\ssrc=["']([^"']+)["']/i);
  return match?.[1] || "";
}

function videoSourceName(value: string) {
  try {
    const hostname = new URL(value).hostname.replace(/^m\./, "www.");
    if (hostname.includes("youtube") || hostname === "youtu.be") return "YouTube";
    if (hostname.includes("tiktok")) return "TikTok";
    if (hostname.includes("bilibili")) return "B站";
    if (hostname.includes("vimeo")) return "Vimeo";
    if (hostname === "v.qq.com") return "腾讯视频";
  } catch {
    return "原视频";
  }
  return "原视频";
}

function toOpenVideoUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^m\./, "www.");

    if (host === "www.youtube.com" || host === "youtube.com") {
      const embedMatch = url.pathname.match(/\/embed\/([^/?#]+)/);
      if (embedMatch) return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
    }

    if (host === "player.bilibili.com") {
      const bvid = url.searchParams.get("bvid");
      if (bvid) return `https://www.bilibili.com/video/${bvid}`;
    }

    return url.href;
  } catch {
    return value;
  }
}

function renderVideoFallback(value: string) {
  const url = toOpenVideoUrl(value);
  const source = videoSourceName(url);
  return `<div class="video-fallback"><span>如果无法播放</span><a class="video-fallback-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">在 ${escapeHtml(source)} 打开</a></div>`;
}

function safeMediaUrl(value: string, { allowLocal }: { allowLocal: boolean }) {
  const trimmed = value.trim();
  if (allowLocal && trimmed.startsWith("/uploads/")) return trimmed;

  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    if (!allowLocal && !ALLOWED_VIDEO_HOSTS.has(url.hostname)) {
      return url.href;
    }
    return url.href;
  } catch {
    return "";
  }
}

function toEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^m\./, "www.");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (host === "www.youtube.com" || host === "youtube.com") {
      const watchId = url.searchParams.get("v");
      const pathParts = url.pathname.split("/").filter(Boolean);
      const directId = pathParts[0] === "shorts" || pathParts[0] === "embed" ? pathParts[1] : "";
      const id = watchId || directId;
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (host === "player.bilibili.com") return url.href;

    if (host === "www.bilibili.com" || host === "bilibili.com") {
      const match = url.pathname.match(/\/video\/(BV[a-zA-Z0-9]+)/);
      return match ? `https://player.bilibili.com/player.html?bvid=${match[1]}` : "";
    }

    if (host === "www.tiktok.com" || host === "tiktok.com") {
      if (url.pathname.startsWith("/embed/")) return url.href;
      const match = url.pathname.match(/\/video\/(\d+)/);
      return match ? `https://www.tiktok.com/embed/v2/${match[1]}` : "";
    }

    if (host === "player.vimeo.com") return url.href;

    if (host === "vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }

    if (host === "v.qq.com") return url.href;
  } catch {
    return "";
  }

  return "";
}
