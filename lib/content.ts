import sanitizeHtml from "sanitize-html";

export function sanitizeArticleHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "figure",
      "figcaption",
      "video",
      "source",
      "iframe",
      "hr",
      "pre",
      "code",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "span",
      "div"
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      figure: ["class"],
      figcaption: ["class"],
      video: ["src", "controls", "poster", "preload", "width", "height"],
      source: ["src", "type"],
      iframe: ["src", "title", "width", "height", "allow", "allowfullscreen", "loading", "referrerpolicy"],
      "*": ["class"]
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" })
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
      video: ["http", "https"],
      source: ["http", "https"],
      iframe: ["http", "https"]
    },
    allowedIframeHostnames: [
      "www.youtube.com",
      "youtube.com",
      "player.bilibili.com",
      "www.bilibili.com",
      "www.tiktok.com",
      "tiktok.com",
      "v.qq.com",
      "player.vimeo.com"
    ]
  });
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function plainTextToHtml(text: string) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block) => `<p>${escapeHtml(block).replaceAll("\n", "<br>")}</p>`).join("\n");
}

export function htmlToText(html: string) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

export function generateSummary(html: string, maxLength = 180) {
  const text = htmlToText(html);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

export function publicArticleUrl(token: string) {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/p/${token}`;
}

export function publicIssueUrl(token: string) {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/i/${token}`;
}

export function absoluteUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

export function extractDigestItems(html: string, maxItems = 4) {
  const items: string[] = [];
  const pattern = /<(h2|h3|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) && items.length < maxItems) {
    const text = htmlToText(match[2]).trim();
    if (text && !items.includes(text)) {
      items.push(text.slice(0, 80));
    }
  }

  return items;
}
