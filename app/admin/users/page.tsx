import { Save } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { updateUserAction } from "@/lib/actions/auth-actions";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

function errorMessage(error?: string) {
  switch (error) {
    case "missing-user":
      return "账号不存在。";
    case "last-owner":
      return "至少需要保留一个启用状态的负责人账号。";
    default:
      return "";
  }
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const session = await requireRole(["owner"]);
  const [query, users] = await Promise.all([
    searchParams,
    db.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }]
    })
  ]);
  const error = errorMessage(query.error);

  return (
    <>
      <div className="page-title">
        <div>
          <h1>用户</h1>
          <p>管理同事账号、角色和启用状态。新同事可通过邀请码自行注册。</p>
        </div>
      </div>

      {query.saved ? <div className="notice" style={{ marginBottom: 18 }}>账号设置已保存。</div> : null}
      {error ? <div className="notice error" style={{ marginBottom: 18 }}>{error}</div> : null}

      <div className="workspace">
        <table className="data-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>角色</th>
              <th>状态</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = session.userId === user.id;
              return (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <div className="muted">{user.email}</div>
                    {isSelf ? <div className="muted">当前账号</div> : null}
                  </td>
                  <td>
                    {isSelf ? (
                      <StatusBadge value={user.role} />
                    ) : (
                      <form id={`user-form-${user.id}`} action={updateUserAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <select name="role" defaultValue={user.role} aria-label="角色">
                          <option value="member">成员</option>
                          <option value="admin">管理员</option>
                          <option value="owner">负责人</option>
                        </select>
                      </form>
                    )}
                  </td>
                  <td>
                    {isSelf ? (
                      <StatusBadge value={user.status} />
                    ) : (
                      <select name="status" form={`user-form-${user.id}`} defaultValue={user.status} aria-label="状态">
                        <option value="active">启用</option>
                        <option value="disabled">禁用</option>
                      </select>
                    )}
                  </td>
                  <td>{user.createdAt.toLocaleString("zh-CN")}</td>
                  <td>
                    {isSelf ? (
                      <span className="muted">不可修改自己</span>
                    ) : (
                      <button className="button secondary" type="submit" form={`user-form-${user.id}`}>
                        <Save size={16} />
                        保存
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!users.length ? (
              <tr>
                <td colSpan={5} className="muted">
                  还没有账号。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
