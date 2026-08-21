import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCreditStatus, formatDateTime, capitalize } from "@/lib/utils";
import type { BorrowerProfile, CreditHistoryEntry } from "@/types";
import { User, Phone, CreditCard, TrendingUp, TrendingDown } from "lucide-react";

async function updateBorrowerProfile(formData: FormData) {
  "use server";

  const user = await requireAuth();
  if (user.role !== "borrower") return;

  const supabase = await createClient();
  const fullName = formData.get("fullName") as string;
  const phone = formData.get("phone") as string;
  const year = formData.get("year") as string;
  const section = formData.get("section") as string;
  const accountType = formData.get("accountType") as "student" | "teacher";

  await supabase
    .from("profiles")
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  await supabase
    .from("borrower_profiles")
    .update({
      phone: phone || null,
      year: accountType === "student" ? year || null : null,
      section: accountType === "student" ? section || null : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/borrower/profile");
}

export default async function BorrowerProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  const [{ data: borrowerProfile }, { data: creditHistory }] = await Promise.all([
    supabase.from("borrower_profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("credit_history")
      .select("*")
      .eq("borrower_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const profile = borrowerProfile as BorrowerProfile | null;
  const history = (creditHistory ?? []) as CreditHistoryEntry[];
  const credit = getCreditStatus(profile?.credit_score ?? 500);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-sm text-muted">{user.email}</p>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${credit.gradient} p-6 text-white shadow-lg`}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">Credit Score</p>
            <p className="text-4xl font-bold">{profile?.credit_score ?? 500}</p>
            <p className="mt-1 text-sm font-semibold">{credit.label}</p>
          </div>
          <CreditCard className="h-12 w-12 text-white/30" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-accent" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateBorrowerProfile} className="space-y-4">
            <Input
              label="Full Name"
              name="fullName"
              defaultValue={user.full_name}
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              defaultValue={user.email}
              disabled
              className="opacity-60"
            />
            <Input
              label="Phone"
              name="phone"
              type="tel"
              defaultValue={profile?.phone ?? ""}
              placeholder="Your phone number"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="ID Code"
                name="idCode"
                defaultValue={profile?.id_code ?? ""}
                disabled
                className="opacity-60"
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">
                  Account Type
                </label>
                <p className="flex h-10 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-sm capitalize text-muted">
                  {profile?.account_type ?? "student"}
                </p>
              </div>
            </div>

            {profile?.account_type === "student" && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Year"
                  name="year"
                  defaultValue={profile?.year ?? ""}
                  placeholder="e.g. 2024"
                />
                <Input
                  label="Section"
                  name="section"
                  defaultValue={profile?.section ?? ""}
                  placeholder="e.g. A"
                />
              </div>
            )}

            <input
              type="hidden"
              name="accountType"
              value={profile?.account_type ?? "student"}
            />

            <Button type="submit" size="lg" className="w-full">
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-5 w-5 text-accent" />
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Status</span>
            <Badge status={user.account_status === "active" ? "active" : "pending"} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Member since</span>
            <span className="text-sm font-medium text-white">
              {formatDateTime(user.created_at)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credit History</CardTitle>
        </CardHeader>
        <CardContent>
          {!history.length ? (
            <p className="text-sm text-muted text-center py-6">
              No credit changes yet. Return items on time to build your score.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 border-b border-white/10 pb-3 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {capitalize(entry.transaction_type)}
                    </p>
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">
                      {entry.behavior}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {formatDateTime(entry.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`flex items-center gap-1 text-sm font-bold ${
                        entry.credit_change >= 0
                          ? "text-emerald-300"
                          : "text-red-300"
                      }`}
                    >
                      {entry.credit_change >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {entry.credit_change >= 0 ? "+" : ""}
                      {entry.credit_change}
                    </p>
                    <p className="text-xs text-muted">
                      Score: {entry.new_score}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
