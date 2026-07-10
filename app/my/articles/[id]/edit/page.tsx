import { Save, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentBlockEditor } from "@/components/content-block-editor";
import { StatusBadge } from "@/components/status-badge";
import { resubmitOwnArticleAction, saveOwnArticleAction } from "@/lib/actions/article-actions";
import { articleBlocksForEditor } from "@/lib/article-blocks";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function MyArticleEditPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await requireRole(["owner", "admin", "member"]);
  const [routeParams, query] = await Promise.all([params, searchParams]);
  const article = await db.article.findUnique({ where: { id: routeParams.id } });

  if (!article) notFound();
  if (session.role === "member" && article.submittedByUserId !== session.userId) notFound();

  const editable = ["draft", "submitted", "rejected"].includes(article.status);
  if (!editable) notFound();

  const initialBlocks = articleBlocksForEditor(article.contentBlocksJson, article.contentHtml);

  return (
    <>
      <div className="page-title">
        <div>
          <h1>修改稿件</h1>
          <p>
            <StatusBadge value={article.status} /> <span className="muted">{article.title}</span>
          </p>
        </div>
        <Link className="button secondary" href={`/my/articles/${article.id}`}>
          返回详情
        </Link>
      </div>

      {query.saved ? <div className="notice" style={{ marginBottom: 18 }}>已保存修改。</div> : null}
      {query.error ? <div className="notice error" style={{ marginBottom: 18 }}>重新提交前需要补齐标题和正文。</div> : null}
      {article.reviewNote ? <div className="notice error" style={{ marginBottom: 18 }}>审核反馈：{article.reviewNote}</div> : null}

      <div className="workspace">
        <div className="workspace-section">
          <form action={resubmitOwnArticleAction} className="stack-lg">
            <input type="hidden" name="id" value={article.id} />
            <input type="hidden" name="currentCoverImageUrl" value={article.coverImageUrl || ""} />
            <div className="field">
              <label htmlFor="title">标题</label>
              <input id="title" name="title" defaultValue={article.title} />
            </div>
            <div className="field">
              <label>正文稿件</label>
              <ContentBlockEditor initialBlocks={initialBlocks} />
            </div>
            <details className="submit-options">
              <summary>封面和补充说明</summary>
              <div className="submit-options-grid">
                <div className="field">
                  <label htmlFor="coverImageFile">封面图上传</label>
                  <input id="coverImageFile" name="coverImageFile" type="file" accept="image/*" />
                </div>
                <div className="field">
                  <label htmlFor="coverImageUrl">或封面图 URL</label>
                  <input id="coverImageUrl" name="coverImageUrl" defaultValue={article.coverImageUrl || ""} placeholder="https://..." />
                </div>
                <div className="field submit-options-notes">
                  <label htmlFor="notes">补充说明</label>
                  <textarea id="notes" name="notes" defaultValue={article.notes || ""} placeholder="可写来源、注意事项或希望负责人保留的内容。" />
                </div>
              </div>
            </details>
            <div className="button-row">
              <button className="button secondary" type="submit" formAction={saveOwnArticleAction}>
                <Save size={16} />
                保存修改
              </button>
              <button className="button" type="submit">
                <Send size={16} />
                重新提交
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
