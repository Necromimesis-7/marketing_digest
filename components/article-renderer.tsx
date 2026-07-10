import { sanitizeArticleHtml } from "@/lib/content";

export function ArticleRenderer({ html }: { html: string }) {
  return <div className="article-body" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(html) }} />;
}
