import { CheckCircle2, MessageSquareText, Save } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import {
  checkChannelAction,
  createChannelAction,
  sendChannelTestAction,
  updateChannelAction
} from "@/lib/actions/popo-actions";
import { db } from "@/lib/db";

export default async function PopoChannelsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; saved?: string; checked?: string; tested?: string }>;
}) {
  const query = await searchParams;
  const channels = await db.popoChannel.findMany({
    orderBy: [{ channelType: "asc" }, { createdAt: "asc" }]
  });

  return (
    <>
      <div className="page-title">
        <div>
          <h1>POPO 群</h1>
          <p>配置测试群和正式群。推送时使用群 tid 作为 receiver。</p>
        </div>
      </div>

      {query.error ? <div className="notice error" style={{ marginBottom: 18 }}>请填写群名称和 tid。</div> : null}
      {query.saved ? <div className="notice" style={{ marginBottom: 18 }}>已保存。</div> : null}
      {query.checked ? <div className="notice" style={{ marginBottom: 18 }}>连接检查已完成。</div> : null}
      {query.tested ? <div className="notice" style={{ marginBottom: 18 }}>测试消息已处理，请查看推送日志。</div> : null}

      <div className="form-grid">
        <section className="workspace">
          <div className="workspace-header">
            <strong>已配置群</strong>
          </div>
          <div className="workspace-section stack">
            {channels.map((channel) => (
              <form key={channel.id} action={updateChannelAction} className="stack" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 18 }}>
                <input type="hidden" name="id" value={channel.id} />
                <div className="button-row">
                  <StatusBadge value={channel.channelType} />
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" name="enabled" defaultChecked={channel.enabled} />
                    启用
                  </label>
                </div>
                <div className="field">
                  <label>群名称</label>
                  <input name="name" defaultValue={channel.name} />
                </div>
                <div className="field">
                  <label>群 tid</label>
                  <input name="receiverTid" defaultValue={channel.receiverTid} />
                </div>
                <div className="field">
                  <label>类型</label>
                  <select name="channelType" defaultValue={channel.channelType}>
                    <option value="test">测试群</option>
                    <option value="production">正式群</option>
                  </select>
                </div>
                {channel.lastCheckStatus ? (
                  <div className={channel.lastCheckStatus.startsWith("ok") ? "notice" : "notice error"}>
                    {channel.lastCheckStatus}
                  </div>
                ) : null}
                <div className="button-row">
                  <button className="button secondary" type="submit">
                    <Save size={16} />
                    保存
                  </button>
                  <button className="button secondary" formAction={checkChannelAction} type="submit">
                    <CheckCircle2 size={16} />
                    检查连接
                  </button>
                  <button className="button" formAction={sendChannelTestAction} type="submit">
                    <MessageSquareText size={16} />
                    发测试
                  </button>
                </div>
              </form>
            ))}
            {!channels.length ? <span className="muted">还没有配置群。</span> : null}
          </div>
        </section>

        <aside className="workspace">
          <div className="workspace-header">
            <strong>新增群</strong>
          </div>
          <form action={createChannelAction} className="workspace-section stack">
            <div className="field">
              <label htmlFor="name">群名称</label>
              <input id="name" name="name" placeholder="例如：营销案例测试群" />
            </div>
            <div className="field">
              <label htmlFor="receiverTid">群 tid</label>
              <input id="receiverTid" name="receiverTid" placeholder="例如：1000014361" />
            </div>
            <div className="field">
              <label htmlFor="channelType">类型</label>
              <select id="channelType" name="channelType" defaultValue="test">
                <option value="test">测试群</option>
                <option value="production">正式群</option>
              </select>
            </div>
            <button className="button" type="submit">
              新增
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}
