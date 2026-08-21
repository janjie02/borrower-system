"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { PublicHeader } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo }
      );

      if (resetError) {
        setError(resetError.message);
        toast.error(resetError.message);
        return;
      }

      setSuccess(true);
      toast.success("Password reset email sent!");
    } catch {
      const message = "Failed to send reset email. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col app-bg">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-[#0D2B66] shadow-lg shadow-black/30">
              {success ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <Mail className="h-7 w-7" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {success ? "Check Your Email" : "Reset Password"}
            </CardTitle>
            <CardDescription>
              {success
                ? "If an account exists for that email, you'll receive a reset link shortly."
                : "Enter your email and we'll send you a link to reset your password."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                  A password reset link has been sent to <strong>{email}</strong>. The link
                  expires after a short time for security.
                </div>
                <Button asChild variant="default" className="w-full">
                  <Link href="/login">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
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

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <Button asChild variant="ghost" className="w-full">
                  <Link href="/login">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
