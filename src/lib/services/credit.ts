import type { CreditSettings, ReturnCondition, ReturnTiming } from "@/types";

export const DEFAULT_CREDIT_SETTINGS: CreditSettings = {
  very_early_return: 20,
  early_return: 10,
  on_time_return: 3,
  late_1_day: -10,
  late_2_3_days: -25,
  late_4_7_days: -50,
  late_8_plus_days: -80,
  minor_damage: -50,
  moderate_damage: -100,
  severe_damage: -150,
  lost_item: -200,
  min_score: 0,
  max_score: 1000,
  default_score: 500,
  rolling_weight_recent: 0.7,
  rolling_weight_historical: 0.3,
};

export interface ReturnTimingResult {
  timing: ReturnTiming;
  daysLate: number;
  daysEarly: number;
  creditChange: number;
  behavior: string;
}

export function calculateReturnTiming(
  dueDate: Date,
  returnDate: Date,
  settings: CreditSettings = DEFAULT_CREDIT_SETTINGS
): ReturnTimingResult {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const returned = new Date(returnDate);
  returned.setHours(0, 0, 0, 0);

  const diffMs = returned.getTime() - due.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -2) {
    return {
      timing: "very_early",
      daysLate: 0,
      daysEarly: Math.abs(diffDays),
      creditChange: settings.very_early_return,
      behavior: `Returned ${Math.abs(diffDays)} days early`,
    };
  }
  if (diffDays < 0) {
    return {
      timing: "early",
      daysLate: 0,
      daysEarly: Math.abs(diffDays),
      creditChange: settings.early_return,
      behavior: `Returned ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""} early`,
    };
  }
  if (diffDays === 0) {
    return {
      timing: "on_time",
      daysLate: 0,
      daysEarly: 0,
      creditChange: settings.on_time_return,
      behavior: "Returned on time",
    };
  }
  if (diffDays === 1) {
    return {
      timing: "late_1",
      daysLate: 1,
      daysEarly: 0,
      creditChange: settings.late_1_day,
      behavior: "Returned 1 day late",
    };
  }
  if (diffDays <= 3) {
    return {
      timing: "late_2_3",
      daysLate: diffDays,
      daysEarly: 0,
      creditChange: settings.late_2_3_days,
      behavior: `Returned ${diffDays} days late`,
    };
  }
  if (diffDays <= 7) {
    return {
      timing: "late_4_7",
      daysLate: diffDays,
      daysEarly: 0,
      creditChange: settings.late_4_7_days,
      behavior: `Returned ${diffDays} days late`,
    };
  }
  return {
    timing: "late_8_plus",
    daysLate: diffDays,
    daysEarly: 0,
    creditChange: settings.late_8_plus_days,
    behavior: `Returned ${diffDays} days late`,
  };
}

export function calculateConditionPenalty(
  condition: ReturnCondition,
  settings: CreditSettings = DEFAULT_CREDIT_SETTINGS
): { creditChange: number; behavior: string } {
  switch (condition) {
    case "minor_damage":
      return { creditChange: settings.minor_damage, behavior: "Minor damage reported" };
    case "damaged":
      return { creditChange: settings.moderate_damage, behavior: "Moderate damage reported" };
    case "lost":
      return { creditChange: settings.lost_item, behavior: "Item marked as lost" };
    default:
      return { creditChange: 0, behavior: "Good condition" };
  }
}

export function calculateNewCreditScore(
  currentScore: number,
  timingChange: number,
  conditionChange: number,
  recentHistory: number[],
  settings: CreditSettings = DEFAULT_CREDIT_SETTINGS
): number {
  const rawChange = timingChange + conditionChange;

  let adjustedChange = rawChange;
  if (recentHistory.length > 0) {
    const avgHistorical =
      recentHistory.reduce((a, b) => a + b, 0) / recentHistory.length;
    if (avgHistorical < 0 && rawChange > 0) {
      adjustedChange = Math.round(
        rawChange * settings.rolling_weight_recent +
          avgHistorical * settings.rolling_weight_historical * 0.1
      );
    }
  }

  const newScore = Math.max(
    settings.min_score,
    Math.min(settings.max_score, currentScore + adjustedChange)
  );

  return newScore;
}

export function getCreditTier(score: number): "red" | "orange" | "light_green" | "green" {
  if (score >= 800) return "green";
  if (score >= 600) return "light_green";
  if (score >= 300) return "orange";
  return "red";
}
