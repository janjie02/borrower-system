"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Mail, UserPlus } from "lucide-react";
import {
  createBorrowerInvitation,
  createStaffInvitation,
  changeStaffRole,
  toggleAccountStatus,
} from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Badge, EmptyState, LoadingSpinner } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, capitalize } from "@/lib/utils";
import type { Profile, StaffRole, RegistrationInvitation } from "@/types";

type StaffRow = Profile & { staff_profiles?: { department?: string | null } | null };

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [invitations, setInvitations] = useState<RegistrationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [borrowerEmail, setBorrowerEmail] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("staff");
  const [inviting, setInviting] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [staffRes, invRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*, staff_profiles(department)")
        .in("role", ["staff", "assistant_admin", "admin"])
        .order("created_at", { ascending: false }),
      supabase
        .from("registration_invitations")
        .select("*")
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setStaff((staffRes.data ?? []) as StaffRow[]);
    setInvitations((invRes.data ?? []) as RegistrationInvitation[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBorrowerInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowerEmail.trim()) return;
    setInviting(true);
    const result = await createBorrowerInvitation(borrowerEmail.trim());
    setInviting(false);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Borrower invitation sent");
      setLastLink(result.link ?? null);
      setBorrowerEmail("");
      loadData();
    }
  };

  const handleStaffInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmail.trim()) return;
    setInviting(true);
    const result = await createStaffInvitation(staffEmail.trim(), staffRole);
    setInviting(false);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Staff invitation sent");
      setLastLink(result.link ?? null);
      setStaffEmail("");
      loadData();
    }
  };

  const handleRoleChange = async (staffId: string, newRole: StaffRole | "admin") => {
    const result = await changeStaffRole(staffId, newRole);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Role updated");
      loadData();
    }
  };

  const handleToggleStatus = async (userId: string, disable: boolean) => {
    const result = await toggleAccountStatus(userId, disable);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success(disable ? "Account disabled" : "Account enabled");
      loadData();
    }
  };

  const copyLink = () => {
    if (lastLink) {
      navigator.clipboard.writeText(lastLink);
      toast.success("Link copied to clipboard");
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Staff Management</h1>
        <p className="text-sm text-muted">Manage staff accounts and send invitations</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5 text-accent" />
              Invite Borrower
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBorrowerInvite} className="flex gap-3">
              <Input
                type="email"
                placeholder="borrower@email.com"
                value={borrowerEmail}
                onChange={(e) => setBorrowerEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" disabled={inviting}>
                <Mail className="h-4 w-4" />
                Send
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5 text-accent" />
              Invite Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStaffInvite} className="space-y-3">
              <Input
                type="email"
                placeholder="staff@email.com"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                required
              />
              <select
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value as StaffRole)}
                className="h-10 w-full rounded-lg border border-white/10 bg-surface px-3 text-sm"
              >
                <option value="staff">Staff</option>
                <option value="assistant_admin">Assistant Admin</option>
              </select>
              <Button type="submit" disabled={inviting} className="w-full">
                <Mail className="h-4 w-4" />
                Send Invitation
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {lastLink && (
        <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft p-4">
          <p className="flex-1 truncate text-sm font-mono">{lastLink}</p>
          <Button size="sm" variant="outline" onClick={copyLink}>
            <Copy className="h-4 w-4" />
            Copy
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Staff Members ({staff.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <EmptyState title="No staff members" description="Invite staff to get started." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="py-2 text-left font-medium text-muted">Name</th>
                    <th className="py-2 text-left font-medium text-muted">Email</th>
                    <th className="py-2 text-left font-medium text-muted">Role</th>
                    <th className="py-2 text-left font-medium text-muted">Status</th>
                    <th className="py-2 text-left font-medium text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {staff.map((member) => (
                    <tr key={member.id}>
                      <td className="py-3 font-medium">{member.full_name}</td>
                      <td className="py-3 text-muted">{member.email}</td>
                      <td className="py-3">
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(
                              member.id,
                              e.target.value as StaffRole | "admin"
                            )
                          }
                          disabled={member.role === "admin"}
                          className="rounded border border-white/10 px-2 py-1 text-xs"
                        >
                          <option value="staff">Staff</option>
                          <option value="assistant_admin">Assistant Admin</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-3">
                        <Badge status={member.account_status} />
                      </td>
                      <td className="py-3">
                        {member.role !== "admin" && (
                          <Button
                            size="sm"
                            variant={member.account_status === "disabled" ? "default" : "destructive"}
                            onClick={() =>
                              handleToggleStatus(
                                member.id,
                                member.account_status !== "disabled"
                              )
                            }
                          >
                            {member.account_status === "disabled" ? "Enable" : "Disable"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted">No pending invitations</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium">{inv.email}</p>
                    <p className="text-muted">
                      {capitalize(inv.invitation_type)}
                      {inv.staff_role ? ` · ${capitalize(inv.staff_role)}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-muted">Expires {formatDate(inv.expires_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
