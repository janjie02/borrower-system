"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, APP_NAME } from "@/lib/utils";
import {
  LayoutDashboard, Package, ClipboardList, RotateCcw, Users, UserCog,
  Activity, Settings, FileText, LogOut, Menu, X, Home, History, User,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: UserRole[];
}

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: "/admin/inventory", label: "Inventory", icon: <Package className="h-5 w-5" />, roles: ["admin", "assistant_admin"] },
  { href: "/admin/requests", label: "Borrow Requests", icon: <ClipboardList className="h-5 w-5" /> },
  { href: "/admin/returns", label: "Returns", icon: <RotateCcw className="h-5 w-5" /> },
  { href: "/admin/borrowers", label: "Borrowers", icon: <Users className="h-5 w-5" />, roles: ["admin"] },
  { href: "/admin/staff", label: "Staff", icon: <UserCog className="h-5 w-5" />, roles: ["admin"] },
  { href: "/admin/activity", label: "Activity Log", icon: <Activity className="h-5 w-5" />, roles: ["admin"] },
  { href: "/admin/reports", label: "Reports", icon: <FileText className="h-5 w-5" />, roles: ["admin"] },
  { href: "/admin/settings", label: "Settings", icon: <Settings className="h-5 w-5" />, roles: ["admin"] },
];

const borrowerNav: NavItem[] = [
  { href: "/borrower/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: "/borrower/inventory", label: "Browse Items", icon: <Package className="h-5 w-5" /> },
  { href: "/borrower/borrow", label: "Borrow", icon: <ClipboardList className="h-5 w-5" /> },
  { href: "/borrower/history", label: "History", icon: <History className="h-5 w-5" /> },
  { href: "/borrower/profile", label: "Profile", icon: <User className="h-5 w-5" /> },
];

export function AdminSidebar({ role, userName }: { role: UserRole; userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = adminNav.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const NavContent = () => (
    <>
      <div className="flex items-center gap-3 px-4 py-6 border-b border-[#0D47A1]">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FBC02D] font-bold text-[#0D47A1]">
          B
        </div>
        <div>
          <p className="font-semibold text-white text-sm leading-tight">{APP_NAME}</p>
          <p className="text-xs text-blue-200 capitalize">{role.replace("_", " ")}</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith(item.href)
                ? "bg-[#FBC02D] text-[#0D47A1]"
                : "text-blue-100 hover:bg-[#0D47A1] hover:text-white"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-[#0D47A1] p-4">
        <p className="text-xs text-blue-200 mb-2 truncate">{userName}</p>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-blue-100 hover:bg-[#0D47A1] cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 rounded-lg bg-[#1565C0] p-2 text-white lg:hidden cursor-pointer"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#1565C0] transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}

export function BorrowerNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link href="/borrower/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1565C0] font-bold text-white text-sm">
              B
            </div>
            <span className="font-semibold text-[#1565C0] text-sm">{APP_NAME}</span>
          </Link>
          <button onClick={handleLogout} className="text-[#6B7280] hover:text-[#1565C0] cursor-pointer">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E5E7EB] bg-white safe-area-pb">
        <div className="mx-auto flex max-w-lg">
          {borrowerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
                pathname.startsWith(item.href)
                  ? "text-[#1565C0]"
                  : "text-[#6B7280]"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export function PublicHeader() {
  return (
    <header className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1565C0] font-bold text-white">
            B
          </div>
          <span className="font-bold text-[#1565C0] text-lg">{APP_NAME}</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/borrow"
            className="rounded-lg bg-[#FBC02D] px-4 py-2 text-sm font-semibold text-[#1F2937] hover:bg-[#F9A825] transition-colors"
          >
            Borrow
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-[#1565C0] px-4 py-2 text-sm font-semibold text-[#1565C0] hover:bg-[#E3F2FD] transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
