import { Archive, Ban, Eye, Save, Upload } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ContentBlockEditor } from "@/components/content-block-editor";
import { StatusBadge } from "@/components/status-badge";
import { archiveArticleAction, publishArticleAction, rejectArticleAction, updateArticleAction } from "@/lib/actions/article-actions";
import { articleBlocksForEditor } from "@/lib/article-blocks";
import { db } from "@/lib/db";

export default async function EditArticlePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const routeParams = await params;
  const query = await searchParams;
  const article = await db.article.findUnique({ where: { id: routeParams.id } });
  if (!article) notFound();
  const initialBlocks = articleBlocksForEditor(article.contentBlocksJson, article.contentHtml);

  return (
    <>
      <div className="page-title">
        <div>
          <h1>编辑文章</h1>
          <p>
            <StatusBadge value={article.status} /> <span className="muted">提交人：{article.submittedBy}</span>
          </p>
        </div>
        <div className="button-row">
          <Link className="button secondary" href={`/admin/articles/${article.id}/preview`}>
            <Eye size={16} />
            预览
          </Link>
          <form action={archiveArticleAction}>
            <input type="hidden" name="id" value={article.id} />
            <button className="button danger" type="submit">
              <Archive size={16} />
              归档
            </button>
          </form>
        </div>
      </div>

      {query.saved ? <div className="notice" style={{ marginBottom: 18 }}>已保存。</div> : null}
      {query.error ? <div className="notice error" style={{ marginBottom: 18 }}>发布前需要补齐标题和正文。</div> : null}

      <div className="editor-page-grid">
        <form action={updateArticleAction} className="workspace stack">
          <input type="hidden" name="id" value={article.id} />
          <input type="hidden" name="currentCoverImageUrl" value={article.coverImageUrl || ""} />
          <div className="workspace-section stack">
            <div className="field">
              <label htmlFor="title">标题</label>
              <input id="title" name="title" defaultValue={article.title} />
              <span className="field-help">保存草稿时可以先留空；发布前需要补齐。</span>
            </div>
            <div className="field">
              <label htmlFor="summary">摘要</label>
              <textarea id="summary" name="summary" defaultValue={article.summary} />
              <span className="field-help">留空时系统会从正文重新生成摘要。</span>
            </div>
            <div className="field">
              <label htmlFor="coverImageFile">封面图上传</label>
              <input id="coverImageFile" name="coverImageFile" type="file" accept="image/*" />
            </div>
            <div className="field">
              <label htmlFor="coverImageUrl">封面图 URL</label>
              <input id="coverImageUrl" name="coverImageUrl" defaultValue={article.coverImageUrl || ""} />
            </div>
            <div className="field">
              <label htmlFor="reviewNote">审核反馈</label>
              <textarea id="reviewNote" name="reviewNote" defaultValue={article.reviewNote || ""} placeholder="驳回时填写给投稿人的修改建议。" />
              <span className="field-help">保存会更新反馈；点击驳回会把稿件状态改为“已驳回”。发布后会清空反馈。</span>
            </div>
            <div className="button-row">
              <button className="button secondary" type="submit" name="intent" value="save">
                <Save size={16} />
                保存修改
              </button>
              <ConfirmSubmitButton className="button danger" message={`确认驳回《${article.title}》？`} submitAction={rejectArticleAction}>
                <Ban size={16} />
                驳回稿件
              </ConfirmSubmitButton>
              <button className="button" type="submit" formAction={publishArticleAction}>
                <Upload size={16} />
                发布
              </button>
            </div>
          </div>
          <div className="workspace-section stack">
            <div className="field">
              <label>正文内容块</label>
              <ContentBlockEditor initialBlocks={initialBlocks} />
              <span className="field-help">支持段落、小标题、图片、视频、引用和分割线。保存时会生成公开页 HTML。</span>
            </div>
            <details>
              <summary className="muted">高级：原始 HTML 兜底</summary>
              <div className="field" style={{ marginTop: 12 }}>
                <label htmlFor="contentHtml">正文 HTML</label>
                <textarea id="contentHtml" name="contentHtml" style={{ minHeight: 260 }} defaultValue={article.contentHtml} />
                <span className="field-help">如果内容块为空，系统会使用这里的 HTML。</span>
              </div>
            </details>
          </div>
        </form>
      </div>
    </>
  );
}
