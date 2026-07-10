import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["owner", "admin"]);
  return (
    <AppShell session={session}>
      {children}
    </AppShell>
  );
}
