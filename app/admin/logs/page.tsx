import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";

export default async function LogsPage() {
  const [pushLogs, errorLogs] = await Promise.all([
    db.pushLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        article: true,
        issue: true,
        channel: true
      }
    }),
    db.errorLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 80
    })
  ]);

  return (
    <>
      <div className="page-title">
        <div>
          <h1>日志</h1>
          <p>查看 POPO 推送记录、撤回状态和系统错误。</p>
        </div>
      </div>

      <div className="workspace" style={{ marginBottom: 24 }}>
        <div className="workspace-header">
          <strong>推送记录</strong>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>文章</th>
              <th>群</th>
              <th>类型</th>
              <th>状态</th>
              <th>错误</th>
            </tr>
          </thead>
          <tbody>
            {pushLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.createdAt.toLocaleString("zh-CN")}</td>
                <td>{log.issue?.title || log.article?.title || "测试消息"}</td>
                <td>{log.channel?.name || log.receiverTid}</td>
                <td>{log.msgType}</td>
                <td>
                  <StatusBadge value={log.status} />
                </td>
                <td className="muted">{log.errmsg || log.msgId || "-"}</td>
              </tr>
            ))}
            {!pushLogs.length ? (
              <tr>
                <td colSpan={6} className="muted">
                  暂无推送记录。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="workspace">
        <div className="workspace-header">
          <strong>错误日志</strong>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>范围</th>
              <th>信息</th>
              <th>详情</th>
            </tr>
          </thead>
          <tbody>
            {errorLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.createdAt.toLocaleString("zh-CN")}</td>
                <td>{log.scope}</td>
                <td>{log.message}</td>
                <td className="muted">{log.details || "-"}</td>
              </tr>
            ))}
            {!errorLogs.length ? (
              <tr>
                <td colSpan={4} className="muted">
                  暂无错误日志。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
