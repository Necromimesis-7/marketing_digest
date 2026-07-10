import { AppShell } from "@/components/app-shell";
import { ContentBlockEditor } from "@/components/content-block-editor";
import { saveArticleDraftAction, submitArticleAction } from "@/lib/actions/article-actions";
import { emptyArticleBlock } from "@/lib/article-blocks";
import { requireRole } from "@/lib/auth";

export default async function SubmitPage({
  searchParams
}: {
  searchParams: Promise<{ draft?: string; submitted?: string; error?: string }>;
}) {
  const session = await requireRole(["member", "admin", "owner"]);
  const query = await searchParams;
  const content = (
    <>
      <div className="page-title">
        <div>
          <h1>提交完整稿件</h1>
          <p>上传 Word 或粘贴完整正文。负责人会在后台编辑、发布并推送。</p>
        </div>
      </div>

      <div className="workspace">
        <div className="workspace-section">
          {query.submitted ? <div className="notice">稿件已提交。</div> : null}
          {query.draft ? <div className="notice">草稿已保存，负责人可以在后台继续编辑。</div> : null}
          {query.error ? <div className="notice error">提交失败：请检查标题和正文。</div> : null}
          <form action={submitArticleAction} className="stack-lg" style={{ marginTop: 16 }}>
            <div className="field">
              <label htmlFor="title">标题</label>
              <input id="title" name="title" placeholder="例如：三则 PC/Console 游戏创意营销案例" />
              <span className="field-help">保存草稿时可以先不填；正式提交前需要补上标题。</span>
            </div>
            <div className="field">
              <label>正文稿件</label>
              <ContentBlockEditor initialBlocks={[emptyArticleBlock()]} docxInputName="docxFile" />
              <span className="field-help">Word 或全文粘贴都会优先转为正文模块；未转换时提交仍会使用 Word 文件。</span>
            </div>
            <details className="submit-options">
              <summary>封面、提交人和补充说明</summary>
              <div className="submit-options-grid">
                <div className="field">
                  <label htmlFor="submittedBy">提交人</label>
                  <input id="submittedBy" name="submittedBy" defaultValue={session.name} />
                </div>
                <div className="field">
                  <label htmlFor="coverImageFile">封面图上传</label>
                  <input id="coverImageFile" name="coverImageFile" type="file" accept="image/*" />
                </div>
                <div className="field">
                  <label htmlFor="coverImageUrl">或封面图 URL</label>
                  <input id="coverImageUrl" name="coverImageUrl" placeholder="https://..." />
                </div>
                <div className="field submit-options-notes">
                  <label htmlFor="notes">补充说明</label>
                  <textarea id="notes" name="notes" placeholder="可写来源、注意事项或希望负责人保留的内容。" />
                </div>
              </div>
            </details>
            <div className="button-row">
              <button className="button secondary" type="submit" formAction={saveArticleDraftAction}>
                保存草稿
              </button>
              <button className="button" type="submit">
                提交稿件
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <AppShell active="/submit" session={session}>
      {content}
    </AppShell>
  );
}
