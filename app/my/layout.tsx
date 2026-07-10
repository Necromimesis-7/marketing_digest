import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function MyLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["owner", "admin", "member"]);
  return <AppShell session={session}>{children}</AppShell>;
}
