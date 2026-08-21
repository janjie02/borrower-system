"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";
import { PublicHeader } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAction } from "@/lib/actions/auth";
import { getDashboardPath, type UserRole } from "@/types";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    errorParam === "disabled" ? "Your account has been disabled. Contact an administrator." : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await loginAction(email.trim(), password);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      if (result.success && result.role) {
        toast.success("Welcome back!");
        const dashboard = redirectTo ?? getDashboardPath(result.role as UserRole);
        router.push(dashboard);
        router.refresh();
      }
    } catch {
      const message = "Something went wrong. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-[#E5E7EB] shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#1565C0] text-white">
          <LogIn className="h-7 w-7" />
        </div>
        <CardTitle className="text-2xl text-[#1565C0]">Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="you@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={loading}
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[#1565C0] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[#6B7280]">
          Need to borrow items?{" "}
          <Link href="/borrow" className="font-medium text-[#1565C0] hover:underline">
            Go to borrow page
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function LoginFallback() {
  return (
    <Card className="w-full max-w-md border-[#E5E7EB] shadow-lg">
      <CardContent className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#1565C0]" />
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#E3F2FD]">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
