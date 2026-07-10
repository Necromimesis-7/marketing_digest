import Link from "next/link";

import { PasswordField } from "@/components/password-field";
import { registerAction } from "@/lib/actions/auth-actions";

function errorMessage(error?: string) {
  switch (error) {
    case "missing":
      return "请填写姓名、邮箱和至少 8 位密码。";
    case "mismatch":
      return "两次输入的密码不一致。";
    case "code":
      return "邀请码不正确。";
    case "exists":
      return "这个邮箱已经注册过。";
    default:
      return "";
  }
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const error = errorMessage(query.error);

  return (
    <main className="auth-screen">
      <section className="auth-visual">
        <h1>Marketing Digest</h1>
        <p>注册后可提交创意营销案例、保存草稿，并由负责人统一发布和推送。</p>
      </section>
      <section className="auth-panel">
        <form action={registerAction} className="auth-form stack">
          <div className="stack">
            <h2>注册账号</h2>
            <p>使用团队邀请码注册。首个注册账号会自动成为负责人。</p>
          </div>
          {error ? <div className="notice error">{error}</div> : null}
          <div className="field">
            <label htmlFor="name">姓名</label>
            <input id="name" name="name" autoComplete="name" placeholder="例如：Lufeng" />
          </div>
          <div className="field">
            <label htmlFor="email">邮箱</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="name@corp.netease.com" />
          </div>
          <PasswordField id="password" name="password" label="密码" autoComplete="new-password" placeholder="至少 8 位" />
          <PasswordField id="passwordConfirm" name="passwordConfirm" label="确认密码" autoComplete="new-password" placeholder="再次输入密码" />
          <div className="field">
            <label htmlFor="registrationCode">邀请码</label>
            <input id="registrationCode" name="registrationCode" placeholder="向负责人获取" />
          </div>
          <button className="button" type="submit">
            创建账号
          </button>
          <Link className="button secondary" href="/login">
            已有账号，去登录
          </Link>
        </form>
      </section>
    </main>
  );
}
