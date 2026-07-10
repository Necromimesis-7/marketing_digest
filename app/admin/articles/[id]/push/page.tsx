import { RotateCcw, Send } from "lucide-react";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/status-badge";
import { pushArticleAction, recallPushAction } from "@/lib/actions/popo-actions";
import { getCardConfig } from "@/lib/card-config";
import { absoluteUrl, extractDigestItems, publicArticleUrl } from "@/lib/content";
import { db } from "@/lib/db";

export default async function PushArticlePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; pushed?: string; failed?: string; recalled?: string }>;
}) {
  const routeParams = await params;
  const query = await searchParams;
  const article = await db.article.findUnique({
    where: { id: routeParams.id },
    include: {
      pushLogs: {
        include: { channel: true },
        orderBy: { createdAt: "desc" }
      }
    }
  });
  if (!article) notFound();

  const [channels, cardConfig] = await Promise.all([
    db.popoChannel.findMany({
      where: { enabled: true },
      orderBy: [{ channelType: "asc" }, { createdAt: "asc" }]
    }),
    getCardConfig()
  ]);
  const url = article.publicToken ? publicArticleUrl(article.publicToken) : "发布或推送时自动生成";
  const digestItems = extractDigestItems(article.contentHtml, cardConfig.itemLimit);
  const coverUrl = absoluteUrl(article.coverImageUrl || cardConfig.defaultCoverImageUrl);
  const hasCardTemplate = Boolean(cardConfig.templateUuid);
  const cannotPush = article.status === "draft" || article.status === "rejected";

  return (
    <>
      <div className="page-title">
        <div>
          <h1>POPO 推送</h1>
          <p>{article.title}</p>
        </div>
      </div>

      {query.error === "no-channel" ? <div className="notice error" style={{ marginBottom: 18 }}>请选择至少一个群。</div> : null}
      {query.error === "draft" || cannotPush ? <div className="notice error" style={{ marginBottom: 18 }}>草稿或已驳回稿件需要先发布，发布后才能推送。</div> : null}
      {query.pushed ? (
        <div className="notice" style={{ marginBottom: 18 }}>
          推送完成：成功 {query.pushed}，失败 {query.failed || 0}。
        </div>
      ) : null}
      {query.recalled ? <div className="notice" style={{ marginBottom: 18 }}>撤回请求已处理。</div> : null}

      <div className="form-grid">
        <section className="workspace">
          <div className="workspace-header">
            <strong>卡片推送</strong>
            <p className="muted">正式文章推送使用 POPO card。卡片文案和条目数量来自卡片配置。</p>
          </div>
          {!hasCardTemplate ? (
            <div className="workspace-section">
              <div className="notice error">未配置 Template Series ID，文章卡片推送会失败。</div>
            </div>
          ) : null}
          <div className="workspace-section stack">
            <div>
              <strong>【{cardConfig.columnTitle}】</strong>
              <p>{article.title}</p>
              <p className="muted">{article.summary || "暂无摘要"}</p>
              {coverUrl ? <p className="muted">封面：{coverUrl}</p> : null}
              {digestItems.length ? (
                <ol>
                  {digestItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              ) : (
                <p className="muted">未从正文标题或列表中提取到条目，卡片条目会留空。</p>
              )}
              <p className="muted">{cardConfig.buttonText}：{url}</p>
              <p className="muted">最多显示 {cardConfig.itemLimit} 条。</p>
            </div>
          </div>
          <form action={pushArticleAction} className="workspace-section stack">
            <input type="hidden" name="articleId" value={article.id} />
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
            <button className="button" type="submit" disabled={cannotPush}>
              <Send size={16} />
              发送
            </button>
          </form>
        </section>

        <aside className="workspace">
          <div className="workspace-header">
            <strong>推送记录</strong>
          </div>
          <div className="workspace-section stack">
            {article.pushLogs.map((log) => (
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
            {!article.pushLogs.length ? <span className="muted">还没有推送记录。</span> : null}
          </div>
        </aside>
      </div>
    </>
  );
}
