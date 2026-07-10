import { ExternalLink, RotateCcw, Save, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/status-badge";
import { pushIssueAction, updateIssueMetaAction } from "@/lib/actions/issue-actions";
import { recallPushAction } from "@/lib/actions/popo-actions";
import { getCardConfig } from "@/lib/card-config";
import { absoluteUrl, publicArticleUrl, publicIssueUrl } from "@/lib/content";
import { db } from "@/lib/db";

function errorMessage(error?: string) {
  switch (error) {
    case "no-channel":
      return "请选择至少一个群。";
    case "missing-msgid":
      return "这条记录缺少 msgId，无法撤回。";
    case "missing-title":
      return "期数标题不能为空。";
    default:
      return "";
  }
}

export default async function IssueDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; created?: string; saved?: string; pushed?: string; failed?: string; recalled?: string }>;
}) {
  const routeParams = await params;
  const [query, issue, channels, cardConfig] = await Promise.all([
    searchParams,
    db.digestIssue.findUnique({
      where: { id: routeParams.id },
      include: {
        items: {
          include: { article: true },
          orderBy: { position: "asc" }
        },
        pushLogs: {
          include: { channel: true },
          orderBy: { createdAt: "desc" }
        }
      }
    }),
    db.popoChannel.findMany({
      where: { enabled: true },
      orderBy: [{ channelType: "asc" }, { createdAt: "asc" }]
    }),
    getCardConfig()
  ]);

  if (!issue) notFound();

  const error = errorMessage(query.error);
  const issueUrl = issue.publicToken ? publicIssueUrl(issue.publicToken) : "推送时自动生成";
  const coverUrl = absoluteUrl(issue.coverImageUrl || cardConfig.defaultCoverImageUrl);
  const visibleItems = issue.items.slice(0, cardConfig.itemLimit);
  const hasCardTemplate = Boolean(cardConfig.templateUuid);

  return (
    <>
      <div className="page-title">
        <div>
          <h1>期数推送</h1>
          <p>{issue.title}</p>
        </div>
        <Link href="/admin/issues" className="button secondary">
          返回期数
        </Link>
      </div>

      {query.created ? <div className="notice" style={{ marginBottom: 18 }}>期数已创建。</div> : null}
      {query.saved ? <div className="notice" style={{ marginBottom: 18 }}>期数信息已保存。</div> : null}
      {query.pushed ? (
        <div className="notice" style={{ marginBottom: 18 }}>
          推送完成：成功 {query.pushed}，失败 {query.failed || 0}。
        </div>
      ) : null}
      {query.recalled ? <div className="notice" style={{ marginBottom: 18 }}>撤回请求已处理。</div> : null}
      {error ? <div className="notice error" style={{ marginBottom: 18 }}>{error}</div> : null}

      <div className="form-grid">
        <section className="workspace">
          <div className="workspace-header">
            <strong>卡片内容</strong>
            <p className="muted">卡片底部按钮打开本期合集，每个案例条目打开自己的独立文章页。</p>
          </div>
          {!hasCardTemplate ? (
            <div className="workspace-section">
              <div className="notice error">未配置 Template Series ID，卡片推送会失败。</div>
            </div>
          ) : null}
          <div className="workspace-section stack">
            <div>
              <strong>【{cardConfig.columnTitle}】</strong>
              <p>{issue.title}</p>
              <p className="muted">{issue.summary || "暂无摘要"}</p>
              {coverUrl ? <p className="muted">封面：{coverUrl}</p> : null}
              <p className="muted">合集链接：{issueUrl}</p>
              <p className="muted">最多显示 {cardConfig.itemLimit} 条，本期已选 {issue.items.length} 条。</p>
            </div>

            <ol className="stack" style={{ paddingLeft: 22 }}>
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <strong>{item.titleOverride || item.article.title}</strong>
                  <p className="muted">{item.summaryOverride || item.article.summary || "暂无摘要"}</p>
                  {item.article.publicToken ? (
                    <Link className="button secondary" href={publicArticleUrl(item.article.publicToken)} target="_blank">
                      <ExternalLink size={16} />
                      打开案例页
                    </Link>
                  ) : (
                    <span className="muted">案例链接会在推送前自动生成。</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <form action={updateIssueMetaAction} className="workspace-section stack">
            <input type="hidden" name="issueId" value={issue.id} />
            <input type="hidden" name="currentCoverImageUrl" value={issue.coverImageUrl || ""} />
            <div className="workspace-header compact">
              <strong>编辑本期信息</strong>
              <p className="muted">用于调整 POPO 卡片主标题、摘要、头图，以及合集页展示。</p>
            </div>
            <div className="field">
              <label htmlFor="title">期数标题</label>
              <input id="title" name="title" defaultValue={issue.title} />
            </div>
            <div className="field">
              <label htmlFor="summary">期数摘要</label>
              <textarea id="summary" name="summary" defaultValue={issue.summary} />
            </div>
            <div className="field">
              <label htmlFor="coverImageUrl">封面图 URL</label>
              <input id="coverImageUrl" name="coverImageUrl" defaultValue={issue.coverImageUrl || ""} placeholder="https://... 或 /uploads/..." />
            </div>
            <div className="field">
              <label htmlFor="coverImageFile">上传新封面</label>
              <input id="coverImageFile" name="coverImageFile" type="file" accept="image/*" />
            </div>
            <button className="button secondary" type="submit">
              <Save size={16} />
              保存本期信息
            </button>
          </form>
          <form action={pushIssueAction} className="workspace-section stack">
            <input type="hidden" name="issueId" value={issue.id} />
            <div className="field">
              <label>选择 POPO 群</label>
              <div className="stack">
                {channels.map((channel) => (
                  <label key={channel.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="checkbox" name="channelIds" value={channel.id} defaultChecked={channel.channelType === "test"} />
                    <span>{channel.name}</span>
                    <StatusBadge value={channel.channelType} />
                    <span className="muted">{channel.receiverTid}</span>
                  </label>
                ))}
                {!channels.length ? <span className="muted">还没有启用的 POPO 群。</span> : null}
              </div>
            </div>
            <button className="button" type="submit">
              <Send size={16} />
              发送本期
            </button>
          </form>
        </section>

        <aside className="workspace">
          <div className="workspace-header">
            <strong>推送记录</strong>
          </div>
          <div className="workspace-section stack">
            {issue.pushLogs.map((log) => (
              <div key={log.id} className="stack" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 14 }}>
                <div className="button-row">
                  <StatusBadge value={log.status} />
                  <strong>{log.channel?.name || log.receiverTid}</strong>
                </div>
                <div className="muted">{log.createdAt.toLocaleString("zh-CN")}</div>
                <div className="muted">类型：{log.msgType}</div>
                {log.msgId ? <div className="muted">msgId: {log.msgId}</div> : null}
                {log.errmsg ? <div className="notice error">{log.errcode ? `${log.errcode}: ` : ""}{log.errmsg}</div> : null}
                {log.status === "success" && log.msgId ? (
                  <form action={recallPushAction}>
                    <input type="hidden" name="logId" value={log.id} />
                    <button className="button secondary" type="submit">
                      <RotateCcw size={16} />
                      撤回
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
            {!issue.pushLogs.length ? <span className="muted">还没有推送记录。</span> : null}
          </div>
        </aside>
      </div>
    </>
  );
}
