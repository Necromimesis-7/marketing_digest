"use client";

import { BookOpenText, FileText, LogOut, MessageSquareText, Newspaper, RadioTower, Settings2, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/lib/actions/auth-actions";
import type { Role, Session } from "@/lib/auth";

const navItems = [
  { href: "/my/articles", label: "我的稿件", icon: UserRound, roles: ["member"] },
  { href: "/admin/articles", label: "文章", icon: FileText, roles: ["owner", "admin"] },
  { href: "/admin/issues", label: "期数推送", icon: Newspaper, roles: ["owner", "admin"] },
  { href: "/admin/popo/card", label: "卡片配置", icon: Settings2, roles: ["owner"] },
  { href: "/admin/popo/channels", label: "POPO 群", icon: RadioTower, roles: ["owner", "admin"] },
  { href: "/admin/logs", label: "日志", icon: MessageSquareText, roles: ["owner", "admin"] },
  { href: "/admin/users", label: "用户", icon: Users, roles: ["owner"] },
  { href: "/submit", label: "投稿", icon: BookOpenText, roles: ["owner", "admin", "member"] }
] satisfies Array<{ href: string; label: string; icon: React.ComponentType<{ size?: number }>; roles: Role[] }>;

const roleLabels: Record<Role, string> = {
  owner: "负责人",
  admin: "管理员",
  member: "成员"
};

export function AppShell({
  children,
  active,
  session
}: {
  children: React.ReactNode;
  active?: string;
  session: Session;
}) {
  const pathname = usePathname();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Marketing Digest</strong>
          <span>{session.name} · {roleLabels[session.role]}</span>
        </div>
        <nav className="nav">
          {navItems.map((item) => {
            if (!item.roles.includes(session.role)) return null;
            const Icon = item.icon;
            const isActive = active ? active === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={isActive ? "active" : ""}>
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
          <form action={logoutAction}>
            <button type="submit">
              <LogOut size={18} />
              退出
            </button>
          </form>
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
