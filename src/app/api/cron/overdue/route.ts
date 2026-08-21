import { type NextRequest, NextResponse } from "next/server";
import { markOverdueRequests } from "@/lib/actions/borrowing";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendDueSoonEmail,
  sendOverdueEmail,
} from "@/lib/services/email";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overdueResult = await markOverdueRequests();
  const supabase = createAdminClient();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: dueSoon } = await supabase
    .from("borrow_requests")
    .select(`
      request_number, due_date, borrower_id, guest_profile_id,
      borrow_request_items(inventory(name)),
      profiles!borrower_id(email),
      guest_profiles(email)
    `)
    .eq("status", "active")
    .eq("due_date", tomorrowStr);

  for (const req of dueSoon ?? []) {
    const email =
      (req.profiles as unknown as { email: string } | null)?.email ??
      (req.guest_profiles as unknown as { email: string } | null)?.email;
    if (!email) continue;
    const items = ((req.borrow_request_items as unknown as { inventory: { name: string } }[]) ?? [])
      .map((i) => i.inventory?.name)
      .filter(Boolean)
      .join(", ");
    await sendDueSoonEmail(email, req.request_number, req.due_date!, items);
  }

  const { data: overdueRequests } = await supabase
    .from("borrow_requests")
    .select(`
      request_number, due_date, borrower_id,
      borrow_request_items(inventory(name)),
      profiles!borrower_id(email),
      guest_profiles(email)
    `)
    .eq("status", "overdue");

  for (const req of overdueRequests ?? []) {
    const email =
      (req.profiles as unknown as { email: string } | null)?.email ??
      (req.guest_profiles as unknown as { email: string } | null)?.email;
    if (!email) continue;
    const daysOverdue = Math.ceil(
      (Date.now() - new Date(req.due_date!).getTime()) / (1000 * 60 * 60 * 24)
    );
    const items = ((req.borrow_request_items as unknown as { inventory: { name: string } }[]) ?? [])
      .map((i) => i.inventory?.name)
      .filter(Boolean)
      .join(", ");
    await sendOverdueEmail(email, req.request_number, daysOverdue, items);
  }

  return NextResponse.json({
    success: true,
    overdueMarked: overdueResult.updated,
    dueSoonNotified: dueSoon?.length ?? 0,
    overdueNotified: overdueRequests?.length ?? 0,
  });
}
