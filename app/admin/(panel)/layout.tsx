import { requireAdminPage } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <div className="lg:flex">
      <AdminNav />
      <div className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">{children}</div>
    </div>
  );
}
