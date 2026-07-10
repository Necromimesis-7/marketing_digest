import { Save, Send } from "lucide-react";

import { sendCardConfigTestAction, updateCardConfigAction } from "@/lib/actions/popo-actions";
import { requireRole } from "@/lib/auth";
import { getCardConfig } from "@/lib/card-config";
import { db } from "@/lib/db";

const itemLimitOptions = [1, 2, 3, 4, 5];

function errorMessage(error?: string) {
  switch (error) {
    case "missing-template":
      return "请填写 Template Series ID，或先在 .env 中配置 POPO_CARD_TEMPLATE_UUID。";
    case "no-article":
      return "没有可用于测试的文章。";
    case "no-test-channel":
      return "没有启用的测试群。";
    case "test-failed":
      return "测试卡片发送失败，请查看日志。";
    default:
      return "";
  }
}

export default async function PopoCardConfigPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; saved?: string; tested?: string }>;
}) {
  await requireRole(["owner"]);
  const [query, config, testChannel, latestArticle] = await Promise.all([
    searchParams,
    getCardConfig(),
    db.popoChannel.findFirst({
      where: { enabled: true, channelType: "test" },
      orderBy: { createdAt: "asc" }
    }),
    db.article.findFirst({
      where: { status: { notIn: ["archived", "draft", "rejected"] } },
      orderBy: { updatedAt: "desc" }
    })
  ]);
  const error = errorMessage(query.error);

  return (
    <>
      <div className="page-title">
        <div>
          <h1>卡片配置</h1>
          <p>配置日常可变的卡片内容。POPO 后台仍负责模板结构和发布。</p>
        </div>
      </div>

      {error ? <div className="notice error" style={{ marginBottom: 18 }}>{error}</div> : null}
      {query.saved ? <div className="notice" style={{ marginBottom: 18 }}>卡片配置已保存。</div> : null}
      {query.tested ? <div className="notice" style={{ marginBottom: 18 }}>测试卡片已发送，请查看测试群和日志。</div> : null}

      <div className="form-grid">
        <section className="workspace">
          <div className="workspace-header">
            <strong>推送卡片</strong>
            <p className="muted">这些配置会在文章推送时作为变量传入 POPO 卡片模板。</p>
          </div>
          <form action={updateCardConfigAction} className="workspace-section stack">
            <div className="field">
              <label htmlFor="templateUuid">Template Series ID</label>
              <input id="templateUuid" name="templateUuid" defaultValue={config.templateUuid} placeholder="例如：series_7560192" />
              <span className="field-help">对应 POPO 卡片后台发布后的模板 ID。保存后优先使用这里的值。</span>
            </div>

            <div className="field">
              <label htmlFor="columnTitle">栏目标题</label>
              <input id="columnTitle" name="columnTitle" defaultValue={config.columnTitle} placeholder="创意营销案例分享" />
            </div>

            <div className="field">
              <label htmlFor="buttonText">按钮文案</label>
              <input id="buttonText" name="buttonText" defaultValue={config.buttonText} placeholder="阅读全文" />
            </div>

            <div className="field">
              <label htmlFor="defaultCoverImageUrl">默认封面图</label>
              <input id="defaultCoverImageUrl" name="defaultCoverImageUrl" defaultValue={config.defaultCoverImageUrl} placeholder="https://... 或 /uploads/..." />
              <span className="field-help">文章没有封面时使用。发到 POPO 后，公网 URL 最稳。</span>
            </div>

            <div className="field">
              <label htmlFor="itemLimit">列表条目数量</label>
              <select id="itemLimit" name="itemLimit" defaultValue={String(config.itemLimit)}>
                {itemLimitOptions.map((value) => (
                  <option key={value} value={value}>
                    {value} 条
                  </option>
                ))}
              </select>
              <span className="field-help">支持 1-5 条；系统会从正文标题和列表里自动提取。</span>
            </div>

            <button className="button" type="submit">
              <Save size={16} />
              保存配置
            </button>
          </form>
        </section>

        <aside className="workspace">
          <div className="workspace-header">
            <strong>测试</strong>
          </div>
          <div className="workspace-section stack">
            <div>
              <div className="muted">测试群</div>
              <strong>{testChannel ? `${testChannel.name} · ${testChannel.receiverTid}` : "未配置"}</strong>
            </div>
            <div>
              <div className="muted">测试文章</div>
              <strong>{latestArticle?.title || "暂无文章"}</strong>
            </div>
            <div>
              <div className="muted">当前条目数量</div>
              <strong>{config.itemLimit} 条</strong>
            </div>
            <form action={sendCardConfigTestAction}>
              <button className="button secondary" type="submit" disabled={!testChannel || !latestArticle}>
                <Send size={16} />
                发测试卡片
              </button>
            </form>
          </div>
        </aside>
      </div>
    </>
  );
}
