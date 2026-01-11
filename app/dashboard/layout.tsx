import { ensurePrismaUser } from "@/lib/auth/ensurePrismaUser";
import { requireUser } from "@/lib/auth/requireUser";
import DashboardShell from "@/components/layout/DashboardShell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user) {
    await ensurePrismaUser(user);
  }
  return <DashboardShell>{children}</DashboardShell>;
}
