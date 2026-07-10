import "server-only";

import mammoth from "mammoth";

import { escapeHtml } from "@/lib/content";
import { sanitizeArticleHtml } from "@/lib/content";
import { saveBuffer } from "@/lib/storage";

function extensionFromContentType(contentType?: string) {
  if (!contentType) return ".png";
  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("gif")) return ".gif";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("bmp")) return ".bmp";
  return ".png";
}

function isImageUrl(value: string) {
  try {
    const url = new URL(value);
    return /\.(png|jpe?g|webp|gif|avif)$/i.test(url.pathname) || url.hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

function isVideoFileUrl(value: string) {
  try {
    const url = new URL(value);
    return /\.(mp4|webm|ogg)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function videoType(value: string) {
  if (/\.webm$/i.test(new URL(value).pathname)) return "video/webm";
  if (/\.ogg$/i.test(new URL(value).pathname)) return "video/ogg";
  return "video/mp4";
}

function embedUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^m\./, "www.");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (host === "www.youtube.com" || host === "youtube.com") {
      const watchId = url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      const directId = parts[0] === "shorts" || parts[0] === "embed" ? parts[1] : "";
      const id = watchId || directId;
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (host === "www.tiktok.com" || host === "tiktok.com") {
      if (url.pathname.startsWith("/embed/")) return url.href;
      const match = url.pathname.match(/\/video\/(\d+)/);
      return match ? `https://www.tiktok.com/embed/v2/${match[1]}` : "";
    }

    if (host === "player.bilibili.com") return url.href;

    if (host === "www.bilibili.com" || host === "bilibili.com") {
      const match = url.pathname.match(/\/video\/(BV[a-zA-Z0-9]+)/);
      return match ? `https://player.bilibili.com/player.html?bvid=${match[1]}` : "";
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

function mediaHtmlFromUrl(value: string) {
  const raw = value.trim();
  if (!/^https?:\/\//i.test(raw)) return "";

  if (isImageUrl(raw)) {
    return `<figure><img src="${escapeHtml(raw)}" alt=""></figure>`;
  }

  if (isVideoFileUrl(raw)) {
    return `<figure><video controls preload="metadata"><source src="${escapeHtml(raw)}" type="${videoType(raw)}"></video></figure>`;
  }

  const iframeSrc = embedUrl(raw);
  if (iframeSrc) {
    return `<figure><iframe src="${escapeHtml(iframeSrc)}" title="Embedded video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></figure>`;
  }

  return "";
}

function enhanceStandaloneMediaLinks(html: string) {
  return html.replace(/<p>\s*(?:(?:图片|图|image|视频|video|youtube|tiktok|b站|bilibili|mp4)\s*[:：]\s*)?(?:<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>|(https?:\/\/[^<\s]+))\s*<\/p>/gi, (match, href: string | undefined, plainUrl: string | undefined) => {
    const mediaHtml = mediaHtmlFromUrl(href || plainUrl || "");
    return mediaHtml || match;
  });
}

export async function importDocxToHtml(filePath: string) {
  const result = await mammoth.convertToHtml(
    { path: filePath },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const imageBuffer = await image.read();
        const saved = await saveBuffer(
          Buffer.from(imageBuffer),
          `docx-image${extensionFromContentType(image.contentType)}`,
          "docx-images",
          extensionFromContentType(image.contentType)
        );
        return { src: saved.publicUrl };
      })
    }
  );

  return {
    html: sanitizeArticleHtml(enhanceStandaloneMediaLinks(result.value)),
    messages: result.messages.map((message) => message.message)
  };
}
