import { Edit, Eye, Plus } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function MyArticlesPage() {
  const session = await requireRole(["owner", "admin", "member"]);

  const articles = await db.article.findMany({
    where: session.role === "member" ? { submittedByUserId: session.userId } : {},
    orderBy: { updatedAt: "desc" }
  });

  return (
    <>
      <div className="page-title">
        <div>
          <h1>我的稿件</h1>
          <p>查看自己提交和保存的稿件状态。被驳回的稿件会显示审核反馈。</p>
        </div>
        <Link className="button" href="/submit">
          <Plus size={16} />
          新投稿
        </Link>
      </div>

      <div className="workspace">
        <table className="data-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>反馈</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id}>
                <td>
                  <strong>{article.title}</strong>
                  <div className="muted">{article.summary || "暂无摘要"}</div>
                </td>
                <td>
                  <StatusBadge value={article.status} />
                </td>
                <td>{article.updatedAt.toLocaleString("zh-CN")}</td>
                <td className={article.reviewNote ? "error-text" : "muted"}>{article.reviewNote || "-"}</td>
                <td>
                  <div className="button-row">
                    <Link className="button icon secondary" href={`/my/articles/${article.id}`} title="查看">
                      <Eye size={16} />
                    </Link>
                    {["draft", "submitted", "rejected"].includes(article.status) ? (
                      <Link className="button icon secondary" href={`/my/articles/${article.id}/edit`} title="修改">
                        <Edit size={16} />
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!articles.length ? (
              <tr>
                <td colSpan={5} className="muted">
                  还没有稿件。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
