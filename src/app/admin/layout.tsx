import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardPath } from "@/types";
import { AdminSidebar } from "@/components/layout/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/admin/dashboard");
  }

  if (user.account_status === "disabled") {
    redirect("/login?error=disabled");
  }

  if (!["admin", "assistant_admin", "staff"].includes(user.role)) {
    redirect(getDashboardPath(user.role));
  }

  return (
    <div className="min-h-screen bg-white">
      <AdminSidebar role={user.role} userName={user.full_name || user.email} />
      <main className="min-h-screen lg:pl-64">
        <div className="p-6 pt-16 lg:p-8 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
