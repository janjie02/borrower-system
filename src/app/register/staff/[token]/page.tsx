"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, CheckCircle2, Loader2, UserCog } from "lucide-react";
import { PublicHeader } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { capitalize } from "@/lib/utils";
import { registerStaff, validateInvitation } from "@/lib/actions/auth";
import type { RegistrationInvitation } from "@/types";

export default function StaffRegisterPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState<RegistrationInvitation | null>(null);
  const [validationError, setValidationError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
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

      if (result.invitation.invitation_type !== "staff") {
        setValidationError("This invitation is not for staff registration.");
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

    setLoading(true);

    try {
      const result = await registerStaff({
        token,
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        department: department.trim() || undefined,
      });

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setSuccess(true);
      toast.success("Staff account created successfully!");
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

  const staffRoleLabel = invitation?.staff_role
    ? capitalize(invitation.staff_role)
    : "Staff";

  return (
    <div className="flex min-h-screen flex-col app-bg">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-[#0D2B66] shadow-lg shadow-black/30">
              {success ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <UserCog className="h-7 w-7" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {success ? "Account Ready" : "Staff Registration"}
            </CardTitle>
            <CardDescription>
              {success
                ? "Your staff account is ready. Redirecting to login..."
                : invitation
                  ? `Register as ${staffRoleLabel} for ${invitation.email}`
                  : "Complete your staff account setup"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4 text-center">
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                  You can now sign in to access the admin dashboard.
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

                {invitation?.staff_role && (
                  <div className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3">
                    <Briefcase className="h-5 w-5 shrink-0 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-white">Assigned Role</p>
                      <p className="text-sm text-muted">{staffRoleLabel}</p>
                    </div>
                  </div>
                )}

                <Input
                  label="Full Name"
                  placeholder="Jane Staff"
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
                  label="Department"
                  placeholder="e.g. Science Lab (optional)"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
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
                    "Create Staff Account"
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
