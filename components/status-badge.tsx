const labels: Record<string, string> = {
  submitted: "已提交",
  draft: "草稿",
  rejected: "已驳回",
  published: "已发布",
  pushed: "已推送",
  push_failed: "推送失败",
  archived: "已归档",
  success: "成功",
  failed: "失败",
  recalled: "已撤回",
  test: "测试群",
  production: "正式群",
  active: "启用",
  disabled: "禁用",
  owner: "负责人",
  admin: "管理员",
  member: "成员"
};

export function StatusBadge({ value }: { value: string }) {
  return <span className={`status ${value}`}>{labels[value] || value}</span>;
}
