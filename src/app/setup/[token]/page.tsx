"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setupInitialAdmin, validateSetupToken } from "@/lib/actions/auth";

export default function SetupPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    validateSetupToken(token).then((result) => {
      if (!result.valid) setTokenError(result.error ?? "Invalid token");
      setCheckingToken(false);
    });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await setupInitialAdmin({
        token,
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      });

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setSuccess(true);
      toast.success("Admin account created successfully!");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Setup failed. Please try again.";
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
                <ShieldCheck className="h-7 w-7" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {success ? "Setup Complete" : "Initial Admin Setup"}
            </CardTitle>
            <CardDescription>
              {success
                ? "Your administrator account is ready. Redirecting to login..."
                : "Create the first administrator account for your organization."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {checkingToken ? (
              <div className="flex items-center justify-center py-8 text-muted">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Checking setup link...
              </div>
            ) : tokenError ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {tokenError}
                </div>
                <p className="text-sm text-muted">
                  Run this in Supabase SQL Editor to get a new link:
                </p>
                <pre className="rounded-xl bg-navy-950 border border-white/10 p-3 text-xs text-muted-strong overflow-x-auto">
{`INSERT INTO setup_tokens (token, expires_at)
VALUES (encode(gen_random_bytes(32), 'hex'),
        NOW() + INTERVAL '24 hours')
RETURNING token;`}
                </pre>
              </div>
            ) : success ? (
              <div className="space-y-4 text-center">
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                  You can now sign in with your new admin credentials.
                </div>
                <Button asChild className="w-full">
                  <Link href="/login">Go to Login</Link>
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
                  label="Full Name"
                  placeholder="Jane Administrator"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />

                <Input
                  label="Email"
                  type="email"
                  placeholder="admin@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Admin Account"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
