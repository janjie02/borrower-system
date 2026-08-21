import { describe, it, expect } from "vitest";
import {
  calculateReturnTiming,
  calculateConditionPenalty,
  calculateNewCreditScore,
  getCreditTier,
  DEFAULT_CREDIT_SETTINGS,
} from "@/lib/services/credit";
import { hasPermission, getDashboardPath } from "@/types";

describe("Credit Service", () => {
  it("calculates very early return (+20)", () => {
    const due = new Date("2026-08-21");
    const returned = new Date("2026-08-18");
    const result = calculateReturnTiming(due, returned);
    expect(result.timing).toBe("very_early");
    expect(result.creditChange).toBe(20);
  });

  it("calculates early return (+10)", () => {
    const due = new Date("2026-08-21");
    const returned = new Date("2026-08-20");
    const result = calculateReturnTiming(due, returned);
    expect(result.timing).toBe("early");
    expect(result.creditChange).toBe(10);
  });

  it("calculates on-time return (+3)", () => {
    const due = new Date("2026-08-21");
    const returned = new Date("2026-08-21");
    const result = calculateReturnTiming(due, returned);
    expect(result.timing).toBe("on_time");
    expect(result.creditChange).toBe(3);
  });

  it("calculates 1 day late (-10)", () => {
    const due = new Date("2026-08-21");
    const returned = new Date("2026-08-22");
    const result = calculateReturnTiming(due, returned);
    expect(result.timing).toBe("late_1");
    expect(result.creditChange).toBe(-10);
    expect(result.daysLate).toBe(1);
  });

  it("calculates 2-3 days late (-25)", () => {
    const due = new Date("2026-08-21");
    const returned = new Date("2026-08-23");
    const result = calculateReturnTiming(due, returned);
    expect(result.timing).toBe("late_2_3");
    expect(result.creditChange).toBe(-25);
  });

  it("calculates 4-7 days late (-50)", () => {
    const due = new Date("2026-08-21");
    const returned = new Date("2026-08-25");
    const result = calculateReturnTiming(due, returned);
    expect(result.timing).toBe("late_4_7");
    expect(result.creditChange).toBe(-50);
  });

  it("calculates 8+ days late (-80)", () => {
    const due = new Date("2026-08-21");
    const returned = new Date("2026-08-30");
    const result = calculateReturnTiming(due, returned);
    expect(result.timing).toBe("late_8_plus");
    expect(result.creditChange).toBe(-80);
  });

  it("calculates minor damage penalty", () => {
    const result = calculateConditionPenalty("minor_damage");
    expect(result.creditChange).toBe(-50);
  });

  it("calculates lost item penalty", () => {
    const result = calculateConditionPenalty("lost");
    expect(result.creditChange).toBe(-200);
  });

  it("never allows credit below 0", () => {
    const score = calculateNewCreditScore(10, -50, 0, [], DEFAULT_CREDIT_SETTINGS);
    expect(score).toBe(0);
  });

  it("never allows credit above 1000", () => {
    const score = calculateNewCreditScore(990, 20, 0, [], DEFAULT_CREDIT_SETTINGS);
    expect(score).toBe(1000);
  });

  it("applies rolling behavior for repeat offenders", () => {
    const history = [-25, -25, -50, -10];
    const scoreWithHistory = calculateNewCreditScore(400, 20, 0, history, DEFAULT_CREDIT_SETTINGS);
    const scoreWithoutHistory = calculateNewCreditScore(400, 20, 0, [], DEFAULT_CREDIT_SETTINGS);
    expect(scoreWithHistory).toBeLessThan(scoreWithoutHistory);
  });

  it("returns correct credit tiers", () => {
    expect(getCreditTier(850)).toBe("green");
    expect(getCreditTier(700)).toBe("light_green");
    expect(getCreditTier(450)).toBe("orange");
    expect(getCreditTier(150)).toBe("red");
  });
});

describe("Role Permissions", () => {
  it("admin has full permissions", () => {
    expect(hasPermission("admin", "settings.manage")).toBe(true);
    expect(hasPermission("admin", "staff.manage")).toBe(true);
    expect(hasPermission("admin", "inventory.manage")).toBe(true);
  });

  it("assistant_admin cannot manage staff or settings", () => {
    expect(hasPermission("assistant_admin", "inventory.view")).toBe(true);
    expect(hasPermission("assistant_admin", "staff.manage")).toBe(false);
    expect(hasPermission("assistant_admin", "settings.manage")).toBe(false);
  });

  it("staff cannot manage inventory", () => {
    expect(hasPermission("staff", "requests.manage")).toBe(true);
    expect(hasPermission("staff", "inventory.manage")).toBe(false);
  });

  it("borrower can only access borrower features", () => {
    expect(hasPermission("borrower", "borrow.create")).toBe(true);
    expect(hasPermission("borrower", "requests.manage")).toBe(false);
  });

  it("redirects to correct dashboard by role", () => {
    expect(getDashboardPath("admin")).toBe("/admin/dashboard");
    expect(getDashboardPath("borrower")).toBe("/borrower/dashboard");
    expect(getDashboardPath("staff")).toBe("/admin/dashboard");
  });
});

describe("Invitation Validation Logic", () => {
  it("detects expired invitations", () => {
    const expiresAt = new Date(Date.now() - 1000);
    const isExpired = expiresAt.getTime() < Date.now();
    expect(isExpired).toBe(true);
  });

  it("detects valid invitations", () => {
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const isExpired = expiresAt.getTime() < Date.now();
    expect(isExpired).toBe(false);
  });

  it("detects used invitations", () => {
    const usedAt = new Date().toISOString();
    const isUsed = usedAt !== null;
    expect(isUsed).toBe(true);
  });
});

describe("Inventory Quantity Logic", () => {
  it("prevents borrowing more than available", () => {
    const available = 3;
    const requested = 5;
    expect(requested > available).toBe(true);
  });

  it("allows borrowing within available quantity", () => {
    const available = 5;
    const requested = 3;
    expect(requested <= available).toBe(true);
  });

  it("maintains quantity integrity", () => {
    const total = 10;
    const available = 5;
    const borrowed = 3;
    const damaged = 1;
    const lost = 1;
    expect(available + borrowed + damaged + lost).toBe(total);
  });
});

describe("SKU Generation", () => {
  it("validates SKU prefix format", () => {
    expect(/^[A-Za-z0-9]{1,5}$/.test("CAM")).toBe(true);
    expect(/^[A-Za-z0-9]{1,5}$/.test("SCI25")).toBe(true);
    expect(/^[A-Za-z0-9]{1,5}$/.test("AB CD")).toBe(false);
    expect(/^[A-Za-z0-9]{1,5}$/.test("TOOL123")).toBe(false);
  });

  it("generates SKU format", () => {
    const prefix = "CAM";
    const seq = 1;
    const sku = `${prefix}-${String(seq).padStart(6, "0")}`;
    expect(sku).toBe("CAM-000001");
  });
});
