import { ExternalLink, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicArticle } from "@/components/public-article";
import { StatusBadge } from "@/components/status-badge";
import { publicArticleUrl } from "@/lib/content";
import { db } from "@/lib/db";

export default async function PreviewArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const routeParams = await params;
  const article = await db.article.findUnique({ where: { id: routeParams.id } });
  if (!article) notFound();

  const publicUrl = article.publicToken ? publicArticleUrl(article.publicToken) : "";
  const cannotPush = article.status === "draft" || article.status === "rejected";

  return (
    <>
      <div className="page-title">
        <div>
          <h1>预览</h1>
          <p>
            <StatusBadge value={article.status} /> <span className="muted">{article.title}</span>
          </p>
        </div>
        <div className="button-row">
          <Link className="button secondary" href={`/admin/articles/${article.id}/edit`}>
            编辑
          </Link>
          {cannotPush ? (
            <button className="button" type="button" disabled title="草稿或已驳回稿件需先发布">
              <Send size={16} />
              推送
            </button>
          ) : (
            <Link className="button" href={`/admin/articles/${article.id}/push`}>
              <Send size={16} />
              推送
            </Link>
          )}
        </div>
      </div>

      <div className="workspace" style={{ marginBottom: 22 }}>
        <div className="workspace-section">
          {article.reviewNote ? <div className="notice error" style={{ marginBottom: 14 }}>审核反馈：{article.reviewNote}</div> : null}
          {publicUrl ? (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="button secondary">
              <ExternalLink size={16} />
              {publicUrl}
            </a>
          ) : (
            <span className="muted">发布后生成公开阅读链接。</span>
          )}
        </div>
      </div>

      <PublicArticle title={article.title} summary={article.summary} coverImageUrl={article.coverImageUrl} html={article.contentHtml} publishedAt={article.publishedAt} createdAt={article.createdAt} />
    </>
  );
}
