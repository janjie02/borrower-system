import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "Borrowing System <noreply@example.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured. Would send:", { to, subject });
    return false;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#1565C0;padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Borrowing Management System</h1>
    </div>
    <div style="padding:32px 24px;">${content}</div>
    <div style="background:#E3F2FD;padding:16px 24px;text-align:center;font-size:12px;color:#6B7280;">
      &copy; ${new Date().getFullYear()} Borrowing Management System
    </div>
  </div>
</body>
</html>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:#1565C0;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0;">${label}</a>`;
}

export async function sendInvitationEmail(
  email: string,
  token: string,
  type: "borrower" | "staff",
  expiresAt: Date
): Promise<boolean> {
  const path = type === "borrower" ? `/register/borrower/${token}` : `/register/staff/${token}`;
  const url = `${APP_URL}${path}`;
  const roleLabel = type === "borrower" ? "Borrower" : "Staff";

  return sendEmail({
    to: email,
    subject: `You're invited to register as ${roleLabel}`,
    html: baseTemplate(`
      <h2 style="color:#1565C0;">Registration Invitation</h2>
      <p>You have been invited to create a <strong>${roleLabel}</strong> account on the Borrowing Management System.</p>
      <p>Click the button below to complete your registration. This link is single-use and expires on <strong>${expiresAt.toLocaleString()}</strong>.</p>
      ${button(url, "Complete Registration")}
      <p style="font-size:13px;color:#6B7280;">If you did not expect this invitation, you can safely ignore this email.</p>
    `),
  });
}

export async function sendBorrowRequestSubmittedEmail(
  email: string,
  requestNumber: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Borrow Request Submitted — ${requestNumber}`,
    html: baseTemplate(`
      <h2 style="color:#1565C0;">Request Submitted</h2>
      <p>Your borrowing request <strong>${requestNumber}</strong> has been submitted and is pending approval.</p>
      <p>You will receive another email once your request has been reviewed.</p>
    `),
  });
}

export async function sendBorrowRequestApprovedEmail(
  email: string,
  requestNumber: string,
  dueDate: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Request Approved — ${requestNumber}`,
    html: baseTemplate(`
      <h2 style="color:#1565C0;">Request Approved</h2>
      <p>Your borrowing request <strong>${requestNumber}</strong> has been approved.</p>
      <p>Please return all items by <strong>${dueDate}</strong>.</p>
    `),
  });
}

export async function sendBorrowRequestRejectedEmail(
  email: string,
  requestNumber: string,
  reason?: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Request Rejected — ${requestNumber}`,
    html: baseTemplate(`
      <h2 style="color:#1565C0;">Request Rejected</h2>
      <p>Your borrowing request <strong>${requestNumber}</strong> has been rejected.</p>
      ${reason ? `<p>Reason: ${reason}</p>` : ""}
    `),
  });
}

export async function sendDueSoonEmail(
  email: string,
  requestNumber: string,
  dueDate: string,
  items: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Due Soon — ${requestNumber}`,
    html: baseTemplate(`
      <h2 style="color:#FBC02D;">Items Due Soon</h2>
      <p>Your borrowed items are due on <strong>${dueDate}</strong>.</p>
      <p>Request: <strong>${requestNumber}</strong></p>
      <p>Items: ${items}</p>
      <p>Please return them on time to maintain your credit score.</p>
    `),
  });
}

export async function sendOverdueEmail(
  email: string,
  requestNumber: string,
  daysOverdue: number,
  items: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Overdue — ${requestNumber}`,
    html: baseTemplate(`
      <h2 style="color:#DC2626;">Items Overdue</h2>
      <p>Your borrowed items are <strong>${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue</strong>.</p>
      <p>Request: <strong>${requestNumber}</strong></p>
      <p>Items: ${items}</p>
      <p>Please return them as soon as possible to avoid further credit penalties.</p>
    `),
  });
}

export async function sendReturnConfirmationEmail(
  email: string,
  requestNumber: string,
  items: string,
  creditChange?: number
): Promise<boolean> {
  const creditMsg =
    creditChange !== undefined
      ? `<p>Credit change: <strong>${creditChange >= 0 ? "+" : ""}${creditChange}</strong></p>`
      : "";
  return sendEmail({
    to: email,
    subject: `Return Confirmed — ${requestNumber}`,
    html: baseTemplate(`
      <h2 style="color:#1565C0;">Return Confirmed</h2>
      <p>Your return for request <strong>${requestNumber}</strong> has been processed.</p>
      <p>Items: ${items}</p>
      ${creditMsg}
    `),
  });
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Reset Your Password",
    html: baseTemplate(`
      <h2 style="color:#1565C0;">Password Reset</h2>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      ${button(resetUrl, "Reset Password")}
      <p style="font-size:13px;color:#6B7280;">If you did not request this, ignore this email.</p>
    `),
  });
}
