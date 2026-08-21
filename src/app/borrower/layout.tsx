import { redirect } from "next/navigation";
import { getCurrentUser, getDashboardPath } from "@/lib/auth";
import { BorrowerNav } from "@/components/layout/navigation";
import { CartProvider } from "@/components/shared/cart-context";

export default async function BorrowerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/borrower/dashboard");
  }

  if (user.role !== "borrower") {
    redirect(getDashboardPath(user.role));
  }

  if (user.account_status === "disabled") {
    redirect("/login?error=disabled");
  }

  return (
    <CartProvider>
      <div className="min-h-screen bg-[#F9FAFB]">
        <BorrowerNav userName={user.full_name} />
        <main className="mx-auto max-w-lg px-4 pb-24 pt-4">{children}</main>
      </div>
    </CartProvider>
  );
}
