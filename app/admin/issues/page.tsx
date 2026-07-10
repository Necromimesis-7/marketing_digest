import { Archive, Eye, Plus } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { archiveIssueAction, createIssueAction } from "@/lib/actions/issue-actions";
import { db } from "@/lib/db";

function errorMessage(error?: string) {
  switch (error) {
    case "missing-title":
      return "请填写期数标题。";
    case "no-items":
      return "请至少选择 1 个案例。";
    case "too-many":
      return "一期最多选择 5 个案例。";
    case "missing-article":
      return "有选中的案例不存在或已归档。";
    default:
      return "";
  }
}

export default async function IssuesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [query, issues, articles] = await Promise.all([
    searchParams,
    db.digestIssue.findMany({
      where: { status: { not: "archived" } },
      orderBy: { updatedAt: "desc" },
      include: {
        items: {
          include: { article: true },
          orderBy: { position: "asc" }
        },
        pushLogs: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    }),
    db.article.findMany({
      where: { status: { notIn: ["archived", "draft", "rejected"] } },
      orderBy: { updatedAt: "desc" },
      take: 30
    })
  ]);
  const error = errorMessage(query.error);

  return (
    <>
      <div className="page-title">
        <div>
          <h1>期数推送</h1>
          <p>从独立案例文章中选择 1-5 个，组成一期 POPO 卡片推送。</p>
        </div>
      </div>

      {error ? <div className="notice error" style={{ marginBottom: 18 }}>{error}</div> : null}

      <div className="form-grid">
        <section className="workspace">
          <div className="workspace-header">
            <strong>已创建期数</strong>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>标题</th>
                <th>案例</th>
                <th>状态</th>
                <th>最近推送</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.id}>
                  <td>
                    <strong>{issue.title}</strong>
                    <div className="muted">{issue.summary || "暂无摘要"}</div>
                  </td>
                  <td>
                    <ol style={{ margin: 0, paddingLeft: 18 }}>
                      {issue.items.map((item) => (
                        <li key={item.id}>{item.titleOverride || item.article.title}</li>
                      ))}
                    </ol>
                  </td>
                  <td>
                    <StatusBadge value={issue.status} />
                  </td>
                  <td>
                    {issue.pushLogs[0] ? (
                      <>
                        <StatusBadge value={issue.pushLogs[0].status} />{" "}
                        <span className="muted">{issue.pushLogs[0].createdAt.toLocaleString("zh-CN")}</span>
                      </>
                    ) : (
                      <span className="muted">未推送</span>
                    )}
                  </td>
                  <td>
                    <div className="button-row">
                      <Link className="button icon secondary" href={`/admin/issues/${issue.id}`} title="查看与推送">
                        <Eye size={16} />
                      </Link>
                      <form action={archiveIssueAction}>
                        <input type="hidden" name="issueId" value={issue.id} />
                        <button className="button icon secondary" type="submit" title="归档">
                          <Archive size={16} />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!issues.length ? (
                <tr>
                  <td colSpan={5} className="muted">
                    还没有期数。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <aside className="workspace">
          <div className="workspace-header">
            <strong>新建一期</strong>
          </div>
          <form action={createIssueAction} className="workspace-section stack">
            <div className="field">
              <label htmlFor="title">期数标题</label>
              <input id="title" name="title" placeholder="例如：本周 PC/Console 创意营销案例" />
            </div>
            <div className="field">
              <label htmlFor="summary">期数摘要</label>
              <textarea id="summary" name="summary" placeholder="本期推送的主题和看点" />
            </div>
            <div className="field">
              <label htmlFor="coverImageUrl">封面图 URL</label>
              <input id="coverImageUrl" name="coverImageUrl" placeholder="https://... 或 /uploads/..." />
            </div>
            <div className="field">
              <label htmlFor="coverImageFile">上传封面</label>
              <input id="coverImageFile" name="coverImageFile" type="file" accept="image/*" />
            </div>
            <div className="field">
              <label>选择案例（1-5 个）</label>
              <div className="stack" style={{ maxHeight: 360, overflow: "auto" }}>
                {articles.map((article) => (
                  <label key={article.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <input type="checkbox" name="articleIds" value={article.id} />
                    <span>
                      <strong>{article.title}</strong>
                      <span className="muted" style={{ display: "block" }}>{article.summary || "暂无摘要"}</span>
                    </span>
                  </label>
                ))}
                {!articles.length ? <span className="muted">暂无可选案例文章。</span> : null}
              </div>
            </div>
            <button className="button" type="submit">
              <Plus size={16} />
              创建期数
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}
