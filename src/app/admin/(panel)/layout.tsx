import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminShell email={session.email}>{children}</AdminShell>;
}
