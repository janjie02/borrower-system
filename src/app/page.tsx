import Link from "next/link";
import { PublicHeader } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/utils";
import { ClipboardList, Package, ShieldCheck, Star } from "lucide-react";

const features = [
  {
    icon: Package,
    title: "Browse Inventory",
    description:
      "View available equipment and supplies in real time. Search by category, SKU, or barcode before you borrow.",
  },
  {
    icon: ClipboardList,
    title: "Simple Borrowing",
    description:
      "Submit borrow requests in a few taps. Track approval status, due dates, and return reminders from one place.",
  },
  {
    icon: Star,
    title: "Credit Score System",
    description:
      "Build a borrowing reputation with on-time returns. Fair scoring rewards responsible borrowers over time.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Managed",
    description:
      "Staff and admins oversee inventory, approvals, and returns with full activity logging and accountability.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-[#1565C0] px-4 py-16 sm:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#FBC02D33,transparent_55%)]" />
          <div className="relative mx-auto max-w-6xl text-center">
            <p className="mb-4 inline-block rounded-full bg-[#FBC02D] px-4 py-1 text-sm font-semibold text-[#1F2937]">
              School Equipment Borrowing
            </p>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {APP_NAME}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-100 sm:text-xl">
              Borrow lab equipment, tools, and resources with confidence. Fast requests,
              clear due dates, and a credit system that keeps things fair for everyone.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto min-w-[160px]">
                <Link href="/borrow">Borrow Items</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto min-w-[160px] border-white bg-white/10 text-white hover:bg-white hover:text-[#1565C0]"
              >
                <Link href="/login">Staff Login</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-[#1565C0]">Everything you need to borrow</h2>
              <p className="mt-3 text-[#6B7280]">
                A streamlined experience for borrowers, with powerful tools for staff and administrators.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card key={feature.title} className="border-[#E5E7EB] transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E3F2FD] text-[#1565C0]">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-[#1565C0]">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-[#6B7280]">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#E5E7EB] bg-[#E3F2FD] px-4 py-12">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
            <div>
              <h3 className="text-xl font-semibold text-[#1565C0]">Ready to get started?</h3>
              <p className="mt-1 text-[#6B7280]">
                Borrowers need an invitation link from staff. Admins and staff can sign in directly.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="secondary">
                <Link href="/borrow">Start Borrowing</Link>
              </Button>
              <Button asChild variant="default">
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E5E7EB] px-4 py-6 text-center text-sm text-[#6B7280]">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </footer>
    </div>
  );
}
