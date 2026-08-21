"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { getSettings, updateSettings } from "@/lib/actions/settings";
import { LoadingSpinner } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SystemSettings, EmailNotificationSettings } from "@/types";

const EMAIL_KEYS: (keyof EmailNotificationSettings)[] = [
  "invitation",
  "verification",
  "password_reset",
  "request_submitted",
  "request_approved",
  "request_rejected",
  "due_soon",
  "overdue",
  "return_confirmation",
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings(settings);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateEmailNotification = (key: keyof EmailNotificationSettings, value: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      email_notifications: { ...settings.email_notifications, [key]: value },
    });
  };

  if (loading || !settings) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2937]">Settings</h1>
        <p className="text-sm text-[#6B7280]">Configure system-wide preferences</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Organization Name"
              value={settings.organization_name}
              onChange={(e) =>
                setSettings({ ...settings, organization_name: e.target.value })
              }
            />
            <Input
              label="Logo URL"
              value={settings.logo_url}
              onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
              placeholder="https://..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Borrowing Defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Default Borrowing Days"
              type="number"
              min={1}
              value={settings.default_borrowing_days}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  default_borrowing_days: Number(e.target.value),
                })
              }
            />
            <Input
              label="Due Soon Reminder (days before)"
              type="number"
              min={0}
              value={settings.due_soon_days}
              onChange={(e) =>
                setSettings({ ...settings, due_soon_days: Number(e.target.value) })
              }
            />
            <Input
              label="Invitation Expiration (hours)"
              type="number"
              min={1}
              value={settings.invitation_expiration_hours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  invitation_expiration_hours: Number(e.target.value),
                })
              }
            />
            <div className="space-y-1.5">
              <label htmlFor="photo-retention" className="text-sm font-medium text-[#1F2937]">
                Photo Retention
              </label>
              <select
                id="photo-retention"
                value={settings.photo_retention_days}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    photo_retention_days: e.target
                      .value as SystemSettings["photo_retention_days"],
                  })
                }
                className="flex h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm"
              >
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">1 year</option>
                <option value="forever">Forever</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {EMAIL_KEYS.map((key) => (
              <label key={key} className="flex items-center justify-between gap-4 text-sm">
                <span className="capitalize text-[#1F2937]">
                  {key.replace(/_/g, " ")}
                </span>
                <input
                  type="checkbox"
                  checked={settings.email_notifications?.[key] ?? false}
                  onChange={(e) => updateEmailNotification(key, e.target.checked)}
                  className="h-4 w-4 rounded border-[#E5E7EB] text-[#1565C0] focus:ring-[#1565C0]"
                />
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credit Score Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {settings.credit_settings && (
              <>
                <Input
                  label="Default Score"
                  type="number"
                  value={settings.credit_settings.default_score ?? 500}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      credit_settings: {
                        ...settings.credit_settings,
                        default_score: Number(e.target.value),
                      },
                    })
                  }
                />
                <Input
                  label="Min Score"
                  type="number"
                  value={settings.credit_settings.min_score ?? 0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      credit_settings: {
                        ...settings.credit_settings,
                        min_score: Number(e.target.value),
                      },
                    })
                  }
                />
                <Input
                  label="Max Score"
                  type="number"
                  value={settings.credit_settings.max_score ?? 1000}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      credit_settings: {
                        ...settings.credit_settings,
                        max_score: Number(e.target.value),
                      },
                    })
                  }
                />
                <Input
                  label="On-Time Return Bonus"
                  type="number"
                  value={settings.credit_settings.on_time_return ?? 0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      credit_settings: {
                        ...settings.credit_settings,
                        on_time_return: Number(e.target.value),
                      },
                    })
                  }
                />
              </>
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} size="lg">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </div>
  );
}
