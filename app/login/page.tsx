import { loginAction } from "@/lib/actions/auth-actions";
import { PasswordField } from "@/components/password-field";
import Link from "next/link";

function errorMessage(error?: string) {
  switch (error) {
    case "missing":
      return "请填写邮箱和密码。";
    case "invalid":
      return "邮箱或密码不正确，或账号已被禁用。";
    default:
      return "";
  }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const error = errorMessage(query.error);
  return (
    <main className="auth-screen">
      <section className="auth-visual">
        <h1>Marketing Digest</h1>
        <p>提交完整稿件，发布内部长文，并将本期创意营销案例摘要推送到 POPO 群。</p>
      </section>
      <section className="auth-panel">
        <form action={loginAction} className="auth-form stack">
          <div className="stack">
            <h2>登录</h2>
            <p>使用注册邮箱登录。负责人和管理员进入后台，成员进入自己的稿件页。</p>
          </div>
          {error ? <div className="notice error">{error}</div> : null}
          <div className="field">
            <label htmlFor="email">邮箱</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="name@corp.netease.com" />
          </div>
          <PasswordField id="password" name="password" label="密码" autoComplete="current-password" placeholder="输入账号密码" />
          <button className="button" type="submit">
            进入
          </button>
          <Link className="button secondary" href="/register">
            注册账号
          </Link>
        </form>
      </section>
    </main>
  );
}
