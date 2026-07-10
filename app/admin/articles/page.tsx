import { Ban, Edit, Eye, Send } from "lucide-react";
import Link from "next/link";

import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { StatusBadge } from "@/components/status-badge";
import { rejectArticleAction } from "@/lib/actions/article-actions";
import { db } from "@/lib/db";

export default async function ArticlesPage() {
  const articles = await db.article.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      submittedByUser: true,
      pushLogs: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  return (
    <>
      <div className="page-title">
        <div>
          <h1>文章</h1>
          <p>管理成员提交的稿件和草稿，发布阅读页，并推送到 POPO 群。</p>
        </div>
        <Link href="/submit" className="button secondary">
          新提交
        </Link>
      </div>

      <div className="workspace">
        <table className="data-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>提交人</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>最近推送</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id}>
                <td>
                  <strong>{article.title}</strong>
                  <div className="muted">{article.summary || "暂无摘要"}</div>
                  {article.reviewNote ? <div className="error-text">驳回原因：{article.reviewNote}</div> : null}
                </td>
                <td>
                  {article.submittedByUser?.name || article.submittedBy}
                  {article.submittedByUser?.email ? <div className="muted">{article.submittedByUser.email}</div> : null}
                </td>
                <td>
                  <StatusBadge value={article.status} />
                </td>
                <td>{article.updatedAt.toLocaleString("zh-CN")}</td>
                <td>
                  {article.pushLogs[0] ? (
                    <>
                      <StatusBadge value={article.pushLogs[0].status} />{" "}
                      <span className="muted">{article.pushLogs[0].createdAt.toLocaleString("zh-CN")}</span>
                    </>
                  ) : (
                    <span className="muted">未推送</span>
                  )}
                </td>
                <td>
                  <div className="button-row">
                    <Link className="button icon secondary" href={`/admin/articles/${article.id}/edit`} title="编辑">
                      <Edit size={16} />
                    </Link>
                    <Link className="button icon secondary" href={`/admin/articles/${article.id}/preview`} title="预览">
                      <Eye size={16} />
                    </Link>
                    {article.status === "archived" || article.status === "rejected" ? null : (
                      <form action={rejectArticleAction}>
                        <input type="hidden" name="id" value={article.id} />
                        <input type="hidden" name="redirectTo" value="list" />
                        <ConfirmSubmitButton className="button icon danger" message={`确认驳回《${article.title}》？`} title="驳回">
                          <Ban size={16} />
                        </ConfirmSubmitButton>
                      </form>
                    )}
                    {article.status === "draft" || article.status === "rejected" ? (
                      <button className="button icon secondary" type="button" disabled title="草稿或已驳回稿件需先发布">
                        <Send size={16} />
                      </button>
                    ) : (
                      <Link className="button icon secondary" href={`/admin/articles/${article.id}/push`} title="推送">
                        <Send size={16} />
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!articles.length ? (
              <tr>
                <td colSpan={6} className="muted">
                  还没有文章。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
