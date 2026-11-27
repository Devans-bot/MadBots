export type ActivityLevel = "sedentary" | "light" | "moderate" | "very_active" | "extra_active";
export type Gender = "male" | "female";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export function getIstDateString(now: Date = new Date()): string {
  // Formats YYYY-MM-DD strictly in Asia/Kolkata
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function validateQuizInput(input: {
  heightCm: number;
  weightKg: number;
  age: number;
}): string | null {
  if (!Number.isFinite(input.heightCm) || input.heightCm < 120 || input.heightCm > 220) {
    return "Height must be between 120 cm and 220 cm.";
  }
  if (!Number.isFinite(input.weightKg) || input.weightKg < 30 || input.weightKg > 250) {
    return "Weight must be between 30 kg and 250 kg.";
  }
  if (!Number.isFinite(input.age) || input.age < 12 || input.age > 90) {
    return "Age must be between 12 and 90.";
  }
  return null;
}

export function computeBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export function computeBmr(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === "male" ? base + 5 : base - 161);
}

export function computeTdee(bmr: number, activity: ActivityLevel): number {
  const factor = ACTIVITY_FACTORS[activity] ?? 1.2;
  return Math.round(bmr * factor);
}

export function clampTargetKcal(tdee: number, goalText?: string): number {
  const g = (goalText || "").toLowerCase();
  let target = tdee;
  if (/\b(cut|lose|loss|deficit|fat loss|slim)\b/.test(g)) {
    target = tdee - 400;
  } else if (/\b(bulk|gain|surplus|muscle gain|mass)\b/.test(g)) {
    target = tdee + 300;
  }
  return Math.min(2800, Math.max(1600, Math.round(target)));
}

export const BRAND_SENSITIVE_KEYWORDS = [
  "bread",
  "protein",
  "whey",
  "milk",
  "peanut butter",
  "oats",
  "cheese",
  "curd",
];
