import Link from "next/link";
import { APP_NAME } from "@/lib/utils";
import {
  ClipboardList,
  Camera,
  Package,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const steps = [
  {
    icon: Package,
    title: "Select items",
    description: "Pick one or more items and set the quantities you need.",
  },
  {
    icon: Camera,
    title: "Take a live photo",
    description: "Verify your identity with your device camera — no uploads.",
  },
  {
    icon: ClipboardList,
    title: "Review & submit",
    description: "Send your request. Staff approve it before pickup.",
  },
];

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0B3A8A] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[#1E63C8] opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -right-16 h-[28rem] w-[28rem] rounded-full bg-[#0D47A1] opacity-60 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-40 w-40 rounded-full bg-[#FBC02D] opacity-10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBC02D] text-lg font-black text-[#0D47A1] shadow-lg shadow-black/20">
              B
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              {APP_NAME}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/status"
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
            >
              Check status
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-1 items-center px-5 py-8">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          {/* Left: message */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FBC02D]/40 bg-[#FBC02D]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#FBC02D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FBC02D]" />
              Equipment Borrowing
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Borrow what you need,
              <span className="block text-[#FBC02D]">in three simple steps.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-blue-100/80 lg:mx-0">
              Request items as a guest or signed-in borrower. Every request is
              reviewed by staff before pickup — fast, fair, and fully tracked.
            </p>
            <div className="mt-8 hidden items-center gap-6 lg:flex">
              {["Guest friendly", "Live photo check", "Staff approved"].map(
                (item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-blue-100/80">
                    <CheckCircle2 className="h-4 w-4 text-[#FBC02D]" />
                    {item}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right: the single borrow-process card */}
          <div className="relative">
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-[#FBC02D]/40 via-white/10 to-transparent blur-sm" />
            <div className="relative rounded-3xl border border-white/15 bg-white/[0.07] p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#FBC02D]">
                    Get started
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">Borrow process</h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBC02D] text-[#0D47A1]">
                  <ClipboardList className="h-5 w-5" />
                </div>
              </div>

              {/* Steps with connecting line */}
              <ol className="relative space-y-5 before:absolute before:left-[19px] before:top-3 before:h-[calc(100%-2rem)] before:w-px before:bg-white/15">
                {steps.map((step, i) => (
                  <li key={step.title} className="relative flex items-start gap-4">
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-[#0D47A1] text-sm font-bold text-white">
                      {i + 1}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2">
                        <step.icon className="h-4 w-4 text-[#FBC02D]" />
                        <p className="font-semibold text-white">{step.title}</p>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-blue-100/70">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <Link
                href="/borrow"
                className="group mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FBC02D] px-6 py-3.5 text-base font-bold text-[#0D47A1] shadow-lg shadow-black/20 transition-all hover:bg-[#FFCF43] hover:shadow-xl"
              >
                Start borrowing
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>

              <p className="mt-4 text-center text-xs text-blue-100/60">
                No account?{" "}
                <span className="font-semibold text-white">Guests can borrow too.</span>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 px-5 py-5 text-center text-xs text-blue-100/50">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </footer>
    </div>
  );
}
