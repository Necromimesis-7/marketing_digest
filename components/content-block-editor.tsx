"use client";

import {
  ArrowDown,
  ArrowUp,
  Code2,
  FileText,
  Heading2,
  Image as ImageIcon,
  LoaderCircle,
  Minus,
  Pilcrow,
  Plus,
  Quote,
  RefreshCw,
  Trash2,
  Video
} from "lucide-react";
import type { ChangeEvent, ClipboardEvent, ElementType } from "react";
import { useMemo, useRef, useState } from "react";

import type { ArticleBlock, ArticleBlockType } from "@/lib/article-blocks";

type HeadingLevel = 1 | 2 | 3 | 4;

const blockTypes: Array<{ icon: ElementType; label: string; value: ArticleBlockType }> = [
  { icon: Pilcrow, label: "段落", value: "paragraph" },
  { icon: Heading2, label: "小标题", value: "heading" },
  { icon: ImageIcon, label: "图片", value: "image" },
  { icon: Video, label: "视频", value: "video" },
  { icon: Quote, label: "引用", value: "quote" },
  { icon: Minus, label: "分割线", value: "divider" },
  { icon: Code2, label: "HTML", value: "html" }
];

function newBlock(type: ArticleBlockType = "paragraph"): ArticleBlock {
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    level: type === "heading" ? 2 : undefined,
    text: "",
    url: "",
    caption: ""
  };
}

function normalizeInitialBlocks(blocks: ArticleBlock[]) {
  return blocks.length ? blocks : [newBlock()];
}

function blockWith(type: ArticleBlockType, patch: Partial<ArticleBlock> = {}) {
  return {
    ...newBlock(type),
    ...patch
  };
}

function isImageUrl(value: string) {
  if (/^\/uploads\/.+/i.test(value)) return true;
  if (!/^https?:\/\//i.test(value)) return false;

  try {
    const url = new URL(value);
    return /\.(png|jpe?g|webp|gif|avif)$/i.test(url.pathname) || url.hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

function isVideoFileUrl(value: string) {
  return /^https?:\/\/.+\.(mp4|webm|ogg)(\?.*)?$/i.test(value);
}

function isIframe(value: string) {
  return /^<iframe[\s\S]*<\/iframe>$/i.test(value.trim());
}

function isDividerLine(value: string) {
  return /^[-*_]{3,}$/.test(value.trim());
}

function isCaptionLine(value: string) {
  return /^(图注|图片说明|视频说明|说明|caption)[:：]\s*/i.test(value.trim());
}

function stripCaptionPrefix(value: string) {
  return value.trim().replace(/^(图注|图片说明|视频说明|说明|caption)[:：]\s*/i, "");
}

function isKnownVideoUrl(value: string) {
  try {
    const url = new URL(value);
    return ["youtu.be", "youtube.com", "www.youtube.com", "bilibili.com", "www.bilibili.com", "player.bilibili.com", "tiktok.com", "www.tiktok.com", "vimeo.com", "player.vimeo.com", "v.qq.com"].includes(url.hostname);
  } catch {
    return false;
  }
}

function iframeSrc(value: string) {
  const match = value.match(/\ssrc=["']([^"']+)["']/i);
  return match?.[1] || "";
}

function toPreviewEmbedUrl(value: string) {
  const raw = value.trim();
  if (isIframe(raw)) return iframeSrc(raw);

  try {
    const url = new URL(raw);
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
  const raw = value.trim();
  const urlValue = isIframe(raw) ? iframeSrc(raw) : raw;

  try {
    const url = new URL(urlValue);
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
    return urlValue;
  }
}

function firstUrl(value: string) {
  const markdownLink = value.match(/^\[[^\]]+\]\((https?:\/\/[^)]+|\/uploads\/[^)]+)\)$/i);
  const raw = markdownLink?.[1] || value.match(/https?:\/\/[^\s<>"']+|\/uploads\/[^\s<>"']+/i)?.[0] || "";
  return raw.replace(/[),，。；;]+$/g, "");
}

function mediaUrlFromLine(line: string) {
  const url = firstUrl(line);
  if (!url) return "";

  const rest = line
    .replace(url, "")
    .replace(/[\s:：|()（）\-[\]]/g, "")
    .toLowerCase();

  if (!rest || /^(图片|图|image|视频|video|youtube|tiktok|b站|bilibili|mp4)$/.test(rest)) {
    return url;
  }

  return "";
}

function headingFromLine(line: string): { level: HeadingLevel; text: string } | null {
  const markdownHeading = line.match(/^(#{1,4})\s+(.+)$/);
  if (markdownHeading) {
    return {
      level: markdownHeading[1].length as HeadingLevel,
      text: markdownHeading[2].trim()
    };
  }

  if (/^(\d+|[一二三四五六七八九十]+)[、.．]\s*\S+/.test(line) && line.length <= 42) {
    return {
      level: 2 as const,
      text: line
    };
  }

  return null;
}

function attachCaption(blocks: ArticleBlock[], caption: string) {
  const target = [...blocks].reverse().find((block) => (block.type === "image" || block.type === "video") && !block.caption);
  if (!target) return false;
  target.caption = caption;
  return true;
}

function meaningfulBlocks(blocks: ArticleBlock[]) {
  return blocks.filter((block) => block.type === "divider" || Boolean(block.text?.trim() || block.url?.trim()));
}

function isOnlyEmptyBlock(blocks: ArticleBlock[]) {
  return blocks.length === 1 && !blocks[0].text?.trim() && !blocks[0].url?.trim() && blocks[0].type === "paragraph";
}

function blockToDocumentText(block: ArticleBlock) {
  const text = block.text?.trim() || "";
  const caption = block.caption?.trim();

  switch (block.type) {
    case "heading":
      return `${"#".repeat(block.level || 2)} ${text}`.trim();
    case "quote":
      return text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "image":
      return [`图片：${block.url || ""}`, caption ? `图注：${caption}` : ""].filter(Boolean).join("\n");
    case "video":
      return [`视频：${block.url || ""}`, caption ? `视频说明：${caption}` : ""].filter(Boolean).join("\n");
    case "divider":
      return "---";
    case "html":
      return text;
    case "paragraph":
    default:
      return text;
  }
}

function blocksToDocumentText(blocks: ArticleBlock[]) {
  return meaningfulBlocks(blocks).map(blockToDocumentText).filter(Boolean).join("\n\n");
}

function parseImportedPlainText(value: string) {
  const blocks: ArticleBlock[] = [];
  const paragraphLines: string[] = [];

  function flushParagraph() {
    const text = paragraphLines.join("\n").trim();
    paragraphLines.length = 0;
    if (text) blocks.push(blockWith("paragraph", { text }));
  }

  const lines = value.replace(/\r\n/g, "\n").split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    if (isCaptionLine(line) && attachCaption(blocks, stripCaptionPrefix(line))) {
      continue;
    }

    if (isDividerLine(line)) {
      flushParagraph();
      blocks.push(blockWith("divider"));
      continue;
    }

    if (isIframe(line)) {
      flushParagraph();
      blocks.push(blockWith("video", { url: line }));
      continue;
    }

    const mediaUrl = mediaUrlFromLine(line);
    if (mediaUrl && isImageUrl(mediaUrl)) {
      flushParagraph();
      blocks.push(blockWith("image", { url: mediaUrl }));
      continue;
    }

    if (mediaUrl && (isVideoFileUrl(mediaUrl) || isKnownVideoUrl(mediaUrl))) {
      flushParagraph();
      blocks.push(blockWith("video", { url: mediaUrl }));
      continue;
    }

    if (/^>\s+/.test(line) || /^引用[:：]/.test(line)) {
      flushParagraph();
      blocks.push(blockWith("quote", { text: line.replace(/^>\s+|^引用[:：]\s*/g, "") }));
      continue;
    }

    const heading = headingFromLine(line);
    if (heading) {
      flushParagraph();
      blocks.push(blockWith("heading", { level: heading.level, text: heading.text }));
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  return meaningfulBlocks(blocks);
}

function textFromHtml(html: string) {
  return new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() || "";
}

function imageFilesFromClipboard(data: DataTransfer) {
  const files: File[] = [];

  Array.from(data.files).forEach((file) => {
    if (file.type.startsWith("image/")) files.push(file);
  });

  Array.from(data.items).forEach((item) => {
    if (item.kind !== "file" || !item.type.startsWith("image/")) return;
    const file = item.getAsFile();
    if (file) files.push(file);
  });

  const seen = new Set<string>();
  return files.filter((file) => {
    const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function imageExtensionFromMime(type: string) {
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  if (type === "image/avif") return ".avif";
  return ".png";
}

async function fileFromDataUrl(dataUrl: string, index: number) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const type = blob.type || "image/png";
  return new File([blob], `pasted-image-${index}${imageExtensionFromMime(type)}`, { type });
}

async function uploadPastedImage(file: File) {
  const formData = new FormData();
  formData.append("imageFile", file);

  const response = await fetch("/api/upload-image", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("image upload failed");
  }

  const payload = (await response.json()) as { url?: string };
  if (!payload.url) {
    throw new Error("missing image url");
  }
  return payload.url;
}

async function replaceDataImagesWithUploads(html: string) {
  if (!html) return { html, uploadedCount: 0 };

  const document = new DOMParser().parseFromString(html, "text/html");
  const images = Array.from(document.querySelectorAll("img[src^='data:image/']"));

  if (!images.length) return { html, uploadedCount: 0 };

  let uploadedCount = 0;
  for (const [index, image] of images.entries()) {
    const src = image.getAttribute("src");
    if (!src) continue;

    const file = await fileFromDataUrl(src, index + 1);
    const url = await uploadPastedImage(file);
    image.setAttribute("src", url);
    uploadedCount += 1;
  }

  return {
    html: document.body.innerHTML,
    uploadedCount
  };
}

function hasUnsupportedImageReferences(html: string) {
  if (!html) return false;

  const document = new DOMParser().parseFromString(html, "text/html");
  return Array.from(document.querySelectorAll("img[src]")).some((image) => {
    const src = image.getAttribute("src") || "";
    return Boolean(src && !src.startsWith("data:image/") && !isImageUrl(src));
  });
}

function appendImageBlocks(blocks: ArticleBlock[], urls: string[]) {
  if (!urls.length) return blocks;
  return [...blocks, ...urls.map((url) => blockWith("image", { url }))];
}

function parseImportedHtml(html: string, fallbackText: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  const blocks: ArticleBlock[] = [];

  function appendPlainText(value: string) {
    blocks.push(...parseImportedPlainText(value));
  }

  function pushMediaFromUrl(url: string) {
    if (isImageUrl(url)) {
      blocks.push(blockWith("image", { url }));
      return true;
    }
    if (isVideoFileUrl(url) || isKnownVideoUrl(url) || isIframe(url)) {
      blocks.push(blockWith("video", { url }));
      return true;
    }
    return false;
  }

  function visitElement(element: Element) {
    const tag = element.tagName.toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      const text = element.textContent?.trim();
      const level = Math.min(4, Math.max(1, Number(tag.slice(1)))) as HeadingLevel;
      if (text) blocks.push(blockWith("heading", { level, text }));
      return;
    }

    if (tag === "blockquote") {
      const text = element.textContent?.trim();
      if (text) blocks.push(blockWith("quote", { text }));
      return;
    }

    if (tag === "hr") {
      blocks.push(blockWith("divider"));
      return;
    }

    if (tag === "img") {
      const src = element.getAttribute("src") || "";
      if (src && isImageUrl(src)) blocks.push(blockWith("image", { url: src, caption: element.getAttribute("alt") || "" }));
      return;
    }

    if (tag === "iframe") {
      const src = element.getAttribute("src") || "";
      if (src) blocks.push(blockWith("video", { url: src }));
      return;
    }

    if (tag === "video") {
      const src = element.getAttribute("src") || element.querySelector("source")?.getAttribute("src") || "";
      if (src) blocks.push(blockWith("video", { url: src }));
      return;
    }

    if (tag === "figure") {
      const image = element.querySelector("img");
      const iframe = element.querySelector("iframe");
      const video = element.querySelector("video");
      const caption = element.querySelector("figcaption")?.textContent?.trim() || "";

      const imageUrl = image?.getAttribute("src") || "";
      if (imageUrl && isImageUrl(imageUrl)) {
        blocks.push(blockWith("image", { url: imageUrl, caption }));
        return;
      }

      const videoUrl = iframe?.getAttribute("src") || video?.getAttribute("src") || video?.querySelector("source")?.getAttribute("src") || "";
      if (videoUrl) {
        blocks.push(blockWith("video", { url: videoUrl, caption }));
        return;
      }
    }

    if (tag === "p" || tag === "div" || tag === "li") {
      const standaloneImage = element.children.length === 1 ? element.querySelector(":scope > img") : null;
      const standaloneImageUrl = standaloneImage?.getAttribute("src") || "";
      if (standaloneImageUrl && isImageUrl(standaloneImageUrl)) {
        blocks.push(blockWith("image", { url: standaloneImageUrl, caption: standaloneImage?.getAttribute("alt") || "" }));
        return;
      }

      const standaloneIframe = element.children.length === 1 ? element.querySelector(":scope > iframe") : null;
      if (standaloneIframe?.getAttribute("src")) {
        blocks.push(blockWith("video", { url: standaloneIframe.getAttribute("src") || "" }));
        return;
      }

      const link = element.querySelector("a[href]");
      const text = element.textContent?.trim() || "";
      if (link && text.replace(/\s+/g, " ") === link.textContent?.trim().replace(/\s+/g, " ")) {
        const href = link.getAttribute("href") || "";
        if (pushMediaFromUrl(href)) return;
      }

      if (text) appendPlainText(tag === "li" ? `- ${text}` : text);
      return;
    }

    Array.from(element.children).forEach(visitElement);
  }

  Array.from(document.body.children).forEach(visitElement);
  return meaningfulBlocks(blocks).length ? meaningfulBlocks(blocks) : parseImportedPlainText(fallbackText || textFromHtml(html));
}

export function ContentBlockEditor({
  name = "contentBlocksJson",
  initialBlocks,
  docxInputName
}: {
  name?: string;
  initialBlocks: ArticleBlock[];
  docxInputName?: string;
}) {
  const initialNormalizedBlocks = useMemo(() => normalizeInitialBlocks(initialBlocks), [initialBlocks]);
  const [blocks, setBlocks] = useState<ArticleBlock[]>(() => initialNormalizedBlocks);
  const [documentText, setDocumentText] = useState(() => blocksToDocumentText(initialNormalizedBlocks));
  const [lastImportCount, setLastImportCount] = useState<number | null>(null);
  const [docxFileName, setDocxFileName] = useState("");
  const [docxStatus, setDocxStatus] = useState<"idle" | "converting" | "converted" | "error">("idle");
  const [docxMessage, setDocxMessage] = useState("");
  const [pasteMessage, setPasteMessage] = useState("");
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const docxInputRef = useRef<HTMLInputElement>(null);
  const serialized = useMemo(() => JSON.stringify(blocks), [blocks]);

  function updateBlock(id: string, patch: Partial<ArticleBlock>) {
    setBlocks((current) => current.map((block) => (block.id === id ? { ...block, ...patch } : block)));
  }

  function changeType(id: string, type: ArticleBlockType) {
    updateBlock(id, {
      type,
      level: type === "heading" ? 2 : undefined
    });
  }

  function addBlock(type: ArticleBlockType = "paragraph", afterId?: string) {
    setBlocks((current) => {
      const block = newBlock(type);
      if (!afterId) return [...current, block];
      const index = current.findIndex((item) => item.id === afterId);
      if (index < 0) return [...current, block];
      return [...current.slice(0, index + 1), block, ...current.slice(index + 1)];
    });
  }

  function removeBlock(id: string) {
    setBlocks((current) => {
      const next = current.filter((block) => block.id !== id);
      return next.length ? next : [newBlock()];
    });
  }

  function moveBlock(id: string, direction: -1 | 1) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const [block] = next.splice(index, 1);
      next.splice(target, 0, block);
      return next;
    });
  }

  function handleTextPaste(block: ArticleBlock, event: ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
    if (block.type !== "paragraph" || block.text?.trim()) return;

    const pasted = event.clipboardData.getData("text").trim();
    if (!pasted) return;

    if (isImageUrl(pasted)) {
      event.preventDefault();
      updateBlock(block.id, { type: "image", url: pasted, text: "", caption: "" });
      return;
    }

    if (isVideoFileUrl(pasted) || isKnownVideoUrl(pasted) || isIframe(pasted)) {
      event.preventDefault();
      updateBlock(block.id, { type: "video", url: pasted, text: "", caption: "" });
    }
  }

  function handleImagePreview(blockId: string, file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreviews((current) => ({ ...current, [blockId]: url }));
  }

  function applyImportedBlocks(importedBlocks: ArticleBlock[], mode: "replace" | "append") {
    const nextBlocks = meaningfulBlocks(importedBlocks);
    if (!nextBlocks.length) return;

    if (mode === "replace") {
      setBlocks(nextBlocks);
      setImagePreviews({});
      setDocumentText(blocksToDocumentText(nextBlocks));
    } else {
      setBlocks((current) => {
        const merged = isOnlyEmptyBlock(current) ? nextBlocks : [...current, ...nextBlocks];
        setDocumentText(blocksToDocumentText(merged));
        return merged;
      });
    }
    setLastImportCount(nextBlocks.length);
  }

  function syncDocumentText(mode: "replace" | "append" = "replace") {
    applyImportedBlocks(parseImportedPlainText(documentText), mode);
  }

  async function handleBulkPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const imageFiles = imageFilesFromClipboard(event.clipboardData);
    const hasUnsupportedImages = hasUnsupportedImageReferences(html);
    const nextText = text || (html ? textFromHtml(html) : "");

    if (!html && !nextText.trim() && !imageFiles.length) return;

    event.preventDefault();
    setPasteMessage("");

    try {
      if (imageFiles.length || html.includes("data:image/")) {
        setPasteMessage("正在上传粘贴图片...");
      }

      const hasInlineDataImages = html.includes("data:image/");
      const normalizedHtml = html ? await replaceDataImagesWithUploads(html) : { html: "", uploadedCount: 0 };
      const looseImageFiles = hasInlineDataImages ? [] : imageFiles;
      const uploadedClipboardImageUrls = looseImageFiles.length ? await Promise.all(looseImageFiles.map(uploadPastedImage)) : [];
      const parsedBlocks = normalizedHtml.html ? parseImportedHtml(normalizedHtml.html, nextText) : parseImportedPlainText(nextText);
      const importedBlocks = appendImageBlocks(parsedBlocks, uploadedClipboardImageUrls);
      const uploadedCount = normalizedHtml.uploadedCount + uploadedClipboardImageUrls.length;
      const nextDocumentText = blocksToDocumentText(importedBlocks) || nextText;

      setDocumentText(nextDocumentText);
      applyImportedBlocks(importedBlocks, "replace");
      setPasteMessage(uploadedCount ? `已插入 ${uploadedCount} 张粘贴图片。` : hasUnsupportedImages ? "这次粘贴里的图片只有本地引用，浏览器无法读取；请改用 Word 上传或图片上传按钮。" : "");
    } catch {
      const fallbackBlocks = html ? parseImportedHtml(html, nextText) : parseImportedPlainText(nextText);
      setDocumentText(blocksToDocumentText(fallbackBlocks) || nextText);
      applyImportedBlocks(fallbackBlocks, "replace");
      setPasteMessage("图片上传失败。文字已保留，图片请改用 Word 上传或图片上传按钮。");
    }
  }

  async function convertDocxFile(file?: File | null) {
    if (!file) {
      setDocxStatus("error");
      setDocxMessage("请先选择 Word 文件。");
      return;
    }

    setDocxFileName(file.name);
    setDocxStatus("converting");
    setDocxMessage("正在转换 Word...");

    const formData = new FormData();
    formData.append("docxFile", file);

    try {
      const response = await fetch("/api/import-docx", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("import failed");
      }

      const imported = (await response.json()) as {
        html?: string;
        text?: string;
        messages?: string[];
      };

      const importedText = imported.text || (imported.html ? textFromHtml(imported.html) : "");
      const importedBlocks = imported.html ? parseImportedHtml(imported.html, importedText) : parseImportedPlainText(importedText);
      applyImportedBlocks(importedBlocks, "replace");
      setDocumentText(blocksToDocumentText(importedBlocks) || importedText);
      setDocxStatus("converted");
      setDocxMessage(importedBlocks.length ? `已转换为 ${importedBlocks.length} 个模块。` : "已读取 Word，但没有识别到可用正文。");
    } catch {
      setDocxStatus("error");
      setDocxMessage("Word 转换失败，请检查文件格式后重试。");
    }
  }

  function handleDocxChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setDocxFileName("");
      setDocxStatus("idle");
      setDocxMessage("");
      return;
    }
    void convertDocxFile(file);
  }

  return (
    <div className="block-editor">
      <input type="hidden" name={name} value={serialized} />

      <div className="writer-layout">
        <div className="writer-pane">
          <div className="writer-pane-header">
            <div>
              <strong>正文</strong>
              <p className="muted">像写文档一样编辑全文，系统会同步生成模块和预览。</p>
            </div>
          </div>

          <div className="document-editor-panel">
            {docxInputName ? (
              <div className="docx-import-row">
                <div>
                  <label htmlFor="docxFile">Word 稿件</label>
                  <p className="muted">选择 `.docx` 后会自动转换为下方模块。</p>
                </div>
                <div className="docx-import-actions">
                  <label className="file-pill">
                    <FileText size={15} />
                    {docxFileName || "选择 Word"}
                    <input id="docxFile" ref={docxInputRef} name={docxInputName} type="file" accept=".docx" onChange={handleDocxChange} />
                  </label>
                  <button className="button secondary" type="button" onClick={() => convertDocxFile(docxInputRef.current?.files?.[0])} disabled={docxStatus === "converting"}>
                    {docxStatus === "converting" ? <LoaderCircle size={15} /> : <RefreshCw size={15} />}
                    重新转化
                  </button>
                </div>
                {docxMessage ? <span className={docxStatus === "error" ? "field-help error-text" : "field-help"}>{docxMessage}</span> : null}
              </div>
            ) : null}
            <details className="editor-guide">
              <summary>简易使用说明</summary>
              <div className="editor-guide-grid">
                <div>
                  <strong>推荐写法</strong>
                  <p>直接粘贴整篇文章，系统会按空行、小标题、图片和视频链接自动拆成模块。</p>
                </div>
                <div>
                  <strong>标题</strong>
                  <p>用 `#` 到 `####` 控制 H1-H4 标题；短编号标题会自动识别为 H2。</p>
                </div>
                <div>
                  <strong>图片</strong>
                  <p>写 `图片：https://...`，紧接下一行写 `图注：...` 会显示为图片说明。本地图片建议上传 Word 或用图片上传按钮。</p>
                </div>
                <div>
                  <strong>视频</strong>
                  <p>直接粘贴 YouTube、TikTok、B站链接，无法内嵌播放时会保留打开原视频入口。</p>
                </div>
                <div>
                  <strong>分割线 / 引用</strong>
                  <p>`---` 会转为分割线；`&gt; 文字` 会转为引用块。</p>
                </div>
                <div>
                  <strong>草稿</strong>
                  <p>没写完可以先保存草稿，后台文章列表会显示草稿状态，发布后才能推送。</p>
                </div>
              </div>
            </details>
            <label htmlFor="documentText">文档编辑区</label>
            <textarea
              id="documentText"
              className="document-editor-input"
              value={documentText}
              onChange={(event) => {
                const nextText = event.target.value;
                setDocumentText(nextText);
                const nextBlocks = parseImportedPlainText(nextText);
                if (nextBlocks.length) {
                  setBlocks(nextBlocks);
                  setLastImportCount(nextBlocks.length);
                } else {
                  setBlocks([newBlock()]);
                  setLastImportCount(null);
                }
              }}
              onPaste={handleBulkPaste}
              placeholder={"直接写正文。示例：\n\n## 小标题\n正文段落\n\n图片：https://...\n图注：图片说明\n\n视频：https://www.youtube.com/watch?v=...\n\n---"}
            />
            <div className="button-row">
              <button className="button secondary" type="button" onClick={() => syncDocumentText("replace")} disabled={!documentText.trim()}>
                更新预览
              </button>
              <button className="button secondary" type="button" onClick={() => syncDocumentText("append")} disabled={!documentText.trim()}>
                追加为模块
              </button>
              {lastImportCount ? <span className="muted">已生成 {lastImportCount} 个模块</span> : null}
            </div>
            {pasteMessage ? <span className={pasteMessage.includes("失败") ? "field-help error-text" : "field-help"}>{pasteMessage}</span> : null}
          </div>

          <details className="module-inspector">
            <summary>高级：模块校对</summary>
            <div className="block-list block-list--writing">
              {blocks.map((block, index) => (
                <section key={block.id} className={`content-block content-block--${block.type}`}>
                  <div className="content-block-rail">
                    <span>{index + 1}</span>
                    <div className="content-block-tools">
                      <button className="button icon secondary" type="button" onClick={() => moveBlock(block.id, -1)} disabled={index === 0} title="上移">
                        <ArrowUp size={15} />
                      </button>
                      <button className="button icon secondary" type="button" onClick={() => moveBlock(block.id, 1)} disabled={index === blocks.length - 1} title="下移">
                        <ArrowDown size={15} />
                      </button>
                      <button className="button icon secondary" type="button" onClick={() => removeBlock(block.id)} title="删除">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="content-block-main">
                    <div className="content-block-kind">
                      <select value={block.type} onChange={(event) => changeType(block.id, event.target.value as ArticleBlockType)} aria-label="块类型">
                        {blockTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <BlockFields
                      block={block}
                      imagePreview={imagePreviews[block.id]}
                      onChange={(patch) => updateBlock(block.id, patch)}
                      onImagePreview={(file) => handleImagePreview(block.id, file)}
                      onTextPaste={(event) => handleTextPaste(block, event)}
                    />
                  </div>
                </section>
              ))}
            </div>

            <div className="insert-bar" aria-label="插入内容块">
              {blockTypes.slice(0, 6).map((type) => {
                const Icon = type.icon;
                return (
                  <button key={type.value} className="button secondary" type="button" onClick={() => addBlock(type.value)}>
                    <Icon size={15} />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </details>
        </div>

        <aside className="preview-pane">
          <div className="preview-pane-header">
            <strong>实时预览</strong>
            <span className="muted">{blocks.length} 个块</span>
          </div>
          <div className="preview-paper article-body">
            <BlocksPreview blocks={blocks} imagePreviews={imagePreviews} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function BlockFields({
  block,
  imagePreview,
  onChange,
  onImagePreview,
  onTextPaste
}: {
  block: ArticleBlock;
  imagePreview?: string;
  onChange: (patch: Partial<ArticleBlock>) => void;
  onImagePreview: (file?: File) => void;
  onTextPaste: (event: ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
}) {
  if (block.type === "divider") {
    return (
      <div className="content-block-placeholder">
        <Minus size={18} />
        分割线
      </div>
    );
  }

  if (block.type === "heading") {
    return (
      <div className="writing-fields">
        <div className="segmented-control" aria-label="标题级别">
          {[1, 2, 3, 4].map((level) => (
            <button key={level} className={block.level === level ? "active" : ""} type="button" onClick={() => onChange({ level: level as HeadingLevel })}>
              H{level}
            </button>
          ))}
        </div>
        <input className="writing-title-input" value={block.text || ""} onChange={(event) => onChange({ text: event.target.value })} onPaste={onTextPaste} placeholder="输入小标题" />
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <div className="media-editor">
        <div className="media-preview-shell">
          {imagePreview || block.url ? <img src={imagePreview || block.url} alt="" /> : <ImageIcon size={24} />}
        </div>
        <div className="writing-fields">
          <label className="file-pill">
            <ImageIcon size={15} />
            上传图片
            <input name={`blockImageFile:${block.id}`} type="file" accept="image/*" onChange={(event) => onImagePreview(event.target.files?.[0])} />
          </label>
          <input value={block.url || ""} onChange={(event) => onChange({ url: event.target.value })} placeholder="或粘贴图片 URL" />
          <input value={block.caption || ""} onChange={(event) => onChange({ caption: event.target.value })} placeholder="图片说明，可选" />
        </div>
      </div>
    );
  }

  if (block.type === "video") {
    return (
      <div className="writing-fields">
        <textarea className="writing-media-input" value={block.url || ""} onChange={(event) => onChange({ url: event.target.value })} placeholder="粘贴 MP4、B 站、TikTok、YouTube 链接或 iframe" />
        <input value={block.caption || ""} onChange={(event) => onChange({ caption: event.target.value })} placeholder="视频说明，可选" />
      </div>
    );
  }

  if (block.type === "html") {
    return <textarea className="writing-html-input" value={block.text || ""} onChange={(event) => onChange({ text: event.target.value })} placeholder="HTML 兜底编辑" />;
  }

  return (
    <textarea
      className={block.type === "quote" ? "writing-quote-input" : "writing-paragraph-input"}
      value={block.text || ""}
      onChange={(event) => onChange({ text: event.target.value })}
      onPaste={onTextPaste}
      placeholder={block.type === "quote" ? "输入引用或关键判断" : "输入正文段落，或粘贴媒体链接"}
    />
  );
}

function BlocksPreview({
  blocks,
  imagePreviews
}: {
  blocks: ArticleBlock[];
  imagePreviews: Record<string, string>;
}) {
  const visibleBlocks = blocks.filter((block) => block.type === "divider" || block.text?.trim() || block.url?.trim() || imagePreviews[block.id]);

  if (!visibleBlocks.length) {
    return <p className="muted">开始写正文后，这里会显示实时预览。</p>;
  }

  return (
    <>
      {visibleBlocks.map((block) => (
        <PreviewBlock key={block.id} block={block} imagePreview={imagePreviews[block.id]} />
      ))}
    </>
  );
}

function PreviewBlock({ block, imagePreview }: { block: ArticleBlock; imagePreview?: string }) {
  if (block.type === "heading") {
    switch (block.level) {
      case 1:
        return <h1>{block.text}</h1>;
      case 3:
        return <h3>{block.text}</h3>;
      case 4:
        return <h4>{block.text}</h4>;
      case 2:
      default:
        return <h2>{block.text}</h2>;
    }
  }

  if (block.type === "quote") {
    return <blockquote>{block.text}</blockquote>;
  }

  if (block.type === "image") {
    const src = imagePreview || block.url || "";
    if (!src) return null;
    return (
      <figure>
        <img src={src} alt={block.caption || ""} />
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
      </figure>
    );
  }

  if (block.type === "video") {
    const url = block.url?.trim() || "";
    if (!url) return null;
    const embedUrl = toPreviewEmbedUrl(url);
    const openUrl = toOpenVideoUrl(url);
    const sourceName = videoSourceName(openUrl);
    return (
      <figure>
        {isVideoFileUrl(url) ? (
          <video controls preload="metadata">
            <source src={url} />
          </video>
        ) : embedUrl ? (
          <>
            <iframe src={embedUrl} title="视频预览" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" />
            <div className="video-fallback">
              <span>如果无法播放</span>
              <a className="video-fallback-link" href={openUrl} target="_blank" rel="noreferrer">
                在 {sourceName} 打开
              </a>
            </div>
          </>
        ) : (
          <div className="video-fallback video-fallback--plain">
            <span>视频链接</span>
            <a className="video-fallback-link" href={openUrl} target="_blank" rel="noreferrer">
              在 {sourceName} 打开
            </a>
          </div>
        )}
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
      </figure>
    );
  }

  if (block.type === "divider") {
    return <hr />;
  }

  if (block.type === "html") {
    return (
      <pre className="html-preview-note">
        {block.text ? "HTML 内容会在保存后按公开页规则渲染。" : "HTML 块为空"}
      </pre>
    );
  }

  return <p>{block.text}</p>;
}
