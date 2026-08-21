"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, GraduationCap, Loader2, UserPlus } from "lucide-react";
import { PublicHeader } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { registerBorrower, validateInvitation } from "@/lib/actions/auth";
import type { BorrowerAccountType, RegistrationInvitation } from "@/types";

export default function BorrowerRegisterPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState<RegistrationInvitation | null>(null);
  const [validationError, setValidationError] = useState("");

  const [accountType, setAccountType] = useState<BorrowerAccountType>("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [idCode, setIdCode] = useState("");
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkInvitation() {
      setValidating(true);
      const result = await validateInvitation(token);

      if (!result.valid || !result.invitation) {
        setValidationError(result.error ?? "Invalid or expired invitation");
        setValidating(false);
        return;
      }

      if (result.invitation.invitation_type !== "borrower") {
        setValidationError("This invitation is not for borrower registration.");
        setValidating(false);
        return;
      }

      setInvitation(result.invitation);
      setEmail(result.invitation.email);
      setValidating(false);
    }

    checkInvitation();
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

    if (accountType === "student" && (!year.trim() || !section.trim())) {
      setError("Year and section are required for student accounts.");
      return;
    }

    setLoading(true);

    try {
      const result = await registerBorrower({
        token,
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        accountType,
        idCode: idCode.trim(),
        year: accountType === "student" ? year.trim() : undefined,
        section: accountType === "student" ? section.trim() : undefined,
      });

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setSuccess(true);
      toast.success("Account created successfully!");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      const message = "Registration failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="flex min-h-screen flex-col app-bg">
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-sm text-muted">Validating invitation...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="flex min-h-screen flex-col app-bg">
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-red-300">Invalid Invitation</CardTitle>
              <CardDescription>{validationError}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/">Return Home</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col app-bg">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-[#0D2B66] shadow-lg shadow-black/30">
              {success ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <UserPlus className="h-7 w-7" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {success ? "Welcome!" : "Borrower Registration"}
            </CardTitle>
            <CardDescription>
              {success
                ? "Your account is ready. Redirecting to login..."
                : invitation
                  ? `Complete your registration for ${invitation.email}`
                  : "Complete your borrower account setup"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4 text-center">
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                  You can now sign in and start browsing inventory.
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

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-strong">Account Type</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAccountType("student")}
                      disabled={loading}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer",
                        accountType === "student"
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-white/12 bg-surface-2 text-muted hover:border-white/25"
                      )}
                    >
                      <GraduationCap className="h-5 w-5" />
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType("teacher")}
                      disabled={loading}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer",
                        accountType === "teacher"
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-white/12 bg-surface-2 text-muted hover:border-white/25"
                      )}
                    >
                      <UserPlus className="h-5 w-5" />
                      Teacher
                    </button>
                  </div>
                </div>

                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />

                <Input
                  label="Email"
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className="opacity-70"
                />

                <Input
                  label={accountType === "student" ? "Student ID" : "Employee ID"}
                  placeholder="e.g. 2024-00123"
                  value={idCode}
                  onChange={(e) => setIdCode(e.target.value)}
                  required
                  disabled={loading}
                />

                {accountType === "student" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Year Level"
                      placeholder="e.g. Grade 11"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <Input
                      label="Section"
                      placeholder="e.g. A"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                )}

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
                    "Create Account"
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
