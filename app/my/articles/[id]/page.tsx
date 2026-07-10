import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleRenderer } from "@/components/article-renderer";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function MyArticleDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const session = await requireRole(["owner", "admin", "member"]);
  const [routeParams, query] = await Promise.all([params, searchParams]);
  const article = await db.article.findUnique({ where: { id: routeParams.id } });

  if (!article) notFound();
  if (session.role === "member" && article.submittedByUserId !== session.userId) notFound();

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{article.title}</h1>
          <p>
            <StatusBadge value={article.status} /> <span className="muted">更新时间：{article.updatedAt.toLocaleString("zh-CN")}</span>
          </p>
        </div>
        <div className="button-row">
          {["draft", "submitted", "rejected"].includes(article.status) ? (
            <Link className="button" href={`/my/articles/${article.id}/edit`}>
              修改稿件
            </Link>
          ) : null}
          <Link className="button secondary" href="/my/articles">
            返回我的稿件
          </Link>
        </div>
      </div>

      {query.submitted ? <div className="notice" style={{ marginBottom: 18 }}>稿件已重新提交。</div> : null}
      {article.reviewNote ? <div className="notice error" style={{ marginBottom: 18 }}>审核反馈：{article.reviewNote}</div> : null}

      <article className="workspace">
        <div className="workspace-section article-body">
          {article.summary ? <p className="article-deck">{article.summary}</p> : null}
          {article.coverImageUrl ? (
            <figure>
              <img src={article.coverImageUrl} alt="" />
            </figure>
          ) : null}
          <ArticleRenderer html={article.contentHtml || "<p>暂无正文。</p>"} />
        </div>
      </article>
    </>
  );
}
