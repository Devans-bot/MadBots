"use client";

import { useEffect, useState } from "react";
import { ChatMarkdown } from "@/components/ChatMarkdown";

interface ProfileData {
  mode: "custom" | "default" | null;
  bmi?: number | null;
  tdee?: number | null;
}

interface TrackingMeal {
  meal_no: number;
  done: boolean;
  items: Array<{ food_name: string; qty: number; unit: string; kcal: number; protein_g: number }>;
}

interface MacroChiefV2ControlsProps {
  onSendMessage?: (text: string) => void;
}

export function MacroChiefV2Controls({ onSendMessage }: MacroChiefV2ControlsProps) {
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [hasActivePlan, setHasActivePlan] = useState(false);

  // Onboarding / Quiz / Existing plan modal states
  const [flowStep, setFlowStep] = useState<
    "none" | "mode" | "custom_choice" | "quiz" | "diet_notes" | "plan_preview" | "paste_plan"
  >("none");
  const [heightCm, setHeightCm] = useState("175");
  const [weightKg, setWeightKg] = useState("70");
  const [age, setAge] = useState("24");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [activity, setActivity] = useState("moderate");
  const [quizError, setQuizError] = useState<string | null>(null);
  const [bmiInfo, setBmiInfo] = useState<{ bmi: number; category: string; tdee: number } | null>(null);

  const [dietType, setDietType] = useState("veg");
  const [allergies, setAllergies] = useState("");
  const [mealsPerDay, setMealsPerDay] = useState("4");
  const [goalNotes, setGoalNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<{
    targetKcal: number;
    totalKcal: number;
    totalProtein: number;
    items: unknown[];
    markdown: string;
  } | null>(null);

  // Existing plan paste
  const [pastedPlan, setPastedPlan] = useState("");
  const [brandPrompts, setBrandPrompts] = useState<
    Array<{ itemName: string; options: Array<{ id: string; name: string; brand: string | null }> }>
  >([]);
  const [pasteMessage, setPasteMessage] = useState<string | null>(null);

  // To-do tracker sheet
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerData, setTrackerData] = useState<{
    dateIst: string;
    plan: { id: string; name: string; total_kcal: number } | null;
    meals: TrackingMeal[];
  } | null>(null);

  const refreshProfile = async () => {
    try {
      const res = await fetch("/api/macros/profile");
      if (!res.ok) return;
      const d = await res.json();
      setProfile(d.profile);
      setHasActivePlan(Boolean(d.activePlan));
      if (!d.profile?.mode) {
        setFlowStep("mode");
      }
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const chooseMode = async (mode: "custom" | "default") => {
    await fetch("/api/macros/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    setProfile((prev) => ({ ...(prev || {}), mode }));
    if (mode === "custom") {
      setFlowStep("custom_choice");
    } else {
      setFlowStep("none");
    }
  };

  const submitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuizError(null);
    const res = await fetch("/api/macros/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "custom",
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        age: Number(age),
        gender,
        activity_level: activity,
      }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok) {
      setQuizError(d?.error || "Invalid values. Please check your inputs.");
      return;
    }
    setBmiInfo({
      bmi: d.profile.bmi,
      category: d.bmiCategory || "Normal",
      tdee: d.profile.tdee,
    });
    setFlowStep("diet_notes");
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setQuizError(null);
    try {
      await fetch("/api/macros/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diet_type: dietType,
          allergies,
          meals_per_day: Number(mealsPerDay) || 4,
        }),
      });
      const res = await fetch("/api/macros/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          dietType,
          allergies,
          mealsPerDay: Number(mealsPerDay) || 4,
          goalNotes,
        }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setQuizError(d?.error || "Failed to generate diet plan.");
        return;
      }
      setGeneratedPlan(d);
      setFlowStep("plan_preview");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveGeneratedPlan = async () => {
    if (!generatedPlan) return;
    const res = await fetch("/api/macros/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        name: "Custom Diet Plan",
        target_kcal: generatedPlan.targetKcal,
        items: generatedPlan.items,
      }),
    });
    if (res.ok) {
      setHasActivePlan(true);
      setFlowStep("none");
      setGeneratedPlan(null);
    }
  };

  const handleParseExistingPlan = async (skipBrandCheck = false) => {
    setPasteMessage(null);
    setBrandPrompts([]);
    const res = await fetch("/api/macros/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "parse_existing", text: pastedPlan, skipBrandCheck }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok) {
      setPasteMessage(d?.error || "Could not parse plan.");
      return;
    }
    if (d.needsBrandSelection) {
      setBrandPrompts(d.brandPrompts || []);
      return;
    }
    if (d.missingItems?.length > 0) {
      setPasteMessage(d.message);
      return;
    }
    // Auto-save parsed plan
    const saveRes = await fetch("/api/macros/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        name: "My Existing Plan",
        target_kcal: d.totalKcal,
        items: d.items,
      }),
    });
    if (saveRes.ok) {
      setHasActivePlan(true);
      setFlowStep("none");
      setPastedPlan("");
    }
  };

  const openTracker = async () => {
    setTrackerOpen(true);
    const res = await fetch("/api/macros/tracking");
    if (res.ok) {
      setTrackerData(await res.json());
    }
  };

  const toggleMealDone = async (planId: string, mealNo: number, nextDone: boolean) => {
    setTrackerData((prev) =>
      prev
        ? {
            ...prev,
            meals: prev.meals.map((m) => (m.meal_no === mealNo ? { ...m, done: nextDone } : m)),
          }
        : prev
    );
    await fetch("/api/macros/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, mealNo, done: nextDone }),
    });
  };

  if (!loaded) return null;

  return (
    <>
      {/* Top Action Bar inside Macro-Chief */}
      <div className="shrink-0 px-3 py-1.5 flex items-center justify-between gap-2 border-b border-[var(--ui-border)] bg-[var(--ui-card)]/60 backdrop-blur-xs">
        <button
          type="button"
          onClick={openTracker}
          className="text-[11.5px] font-semibold text-[#0066ff] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[14px]">checklist</span>
          <span>Track your diet plan</span>
        </button>

        <button
          type="button"
          onClick={() => setFlowStep(profile?.mode === "custom" ? "custom_choice" : "mode")}
          className="text-[11px] font-medium text-[var(--ui-muted)] hover:text-[var(--ui-text)] cursor-pointer"
        >
          {hasActivePlan ? "Diet Plan Setup" : "Setup Mode"}
        </button>
      </div>

      {/* Onboarding / Quiz / Plan Modal */}
      {flowStep !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-[22px] bg-[var(--ui-card)] border border-[var(--ui-border)] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--ui-text)] font-headline">
                Macro-Chief v2 Setup
              </h3>
              <button
                type="button"
                onClick={() => setFlowStep("none")}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--ui-muted)] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {flowStep === "mode" && (
              <div className="space-y-3">
                <p className="text-[13px] text-[var(--ui-muted)]">Choose how you want to use Macro-Chief:</p>
                <button
                  type="button"
                  onClick={() => chooseMode("custom")}
                  className="w-full p-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] hover:border-[#0066ff] text-left transition-all cursor-pointer"
                >
                  <div className="font-bold text-[14px] text-[var(--ui-text)]">Custom mode</div>
                  <div className="text-[12px] text-[var(--ui-muted)] mt-0.5">
                    Use my current plan, or get a free new plan.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => chooseMode("default")}
                  className="w-full p-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] hover:border-emerald-500 text-left transition-all cursor-pointer"
                >
                  <div className="font-bold text-[14px] text-[var(--ui-text)]">Default mode</div>
                  <div className="text-[12px] text-[var(--ui-muted)] mt-0.5">
                    Log my meals each day.
                  </div>
                </button>
              </div>
            )}

            {flowStep === "custom_choice" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setFlowStep("quiz")}
                  className="w-full p-3.5 rounded-2xl bg-[#0066ff] text-white font-bold text-[13.5px] cursor-pointer"
                >
                  Get a free new plan (Quiz)
                </button>
                <button
                  type="button"
                  onClick={() => setFlowStep("paste_plan")}
                  className="w-full p-3.5 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] text-[var(--ui-text)] font-bold text-[13.5px] cursor-pointer"
                >
                  Use my current plan (Paste plan)
                </button>
              </div>
            )}

            {flowStep === "quiz" && (
              <form onSubmit={submitQuiz} className="space-y-3">
                {quizError && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-[12px]">
                    {quizError}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ui-muted)]">Height (cm)</label>
                    <input
                      type="number"
                      min={120}
                      max={220}
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      className="w-full mt-1 px-2.5 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] text-[13px]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ui-muted)]">Weight (kg)</label>
                    <input
                      type="number"
                      min={30}
                      max={250}
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="w-full mt-1 px-2.5 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] text-[13px]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ui-muted)]">Age</label>
                    <input
                      type="number"
                      min={12}
                      max={90}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full mt-1 px-2.5 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] text-[13px]"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ui-muted)]">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as "male" | "female")}
                      className="w-full mt-1 px-2.5 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] text-[13px]"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ui-muted)]">Activity</label>
                    <select
                      value={activity}
                      onChange={(e) => setActivity(e.target.value)}
                      className="w-full mt-1 px-2.5 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] text-[13px]"
                    >
                      <option value="sedentary">Sedentary (1.2)</option>
                      <option value="light">Light (1.375)</option>
                      <option value="moderate">Moderate (1.55)</option>
                      <option value="very_active">Very Active (1.725)</option>
                      <option value="extra_active">Extra Active (1.9)</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#0066ff] text-white font-bold text-[13px] cursor-pointer"
                >
                  Calculate BMI &amp; Maintenance
                </button>
              </form>
            )}

            {flowStep === "diet_notes" && (
              <form onSubmit={handleGeneratePlan} className="space-y-3">
                {bmiInfo && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[12.5px]">
                    <strong>BMI:</strong> {bmiInfo.bmi} ({bmiInfo.category}) •{" "}
                    <strong>Maintenance:</strong> {bmiInfo.tdee} kcal/day
                  </div>
                )}
                {quizError && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 text-[12px]">{quizError}</div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ui-muted)]">Diet Type</label>
                    <select
                      value={dietType}
                      onChange={(e) => setDietType(e.target.value)}
                      className="w-full mt-1 px-2.5 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] text-[13px]"
                    >
                      <option value="veg">Veg</option>
                      <option value="non-veg">Non-Veg</option>
                      <option value="eggetarian">Eggetarian</option>
                      <option value="vegan">Vegan</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ui-muted)]">Meals / Day</label>
                    <input
                      type="number"
                      min={2}
                      max={6}
                      value={mealsPerDay}
                      onChange={(e) => setMealsPerDay(e.target.value)}
                      className="w-full mt-1 px-2.5 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] text-[13px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--ui-muted)]">
                    Allergies, restrictions, goal &amp; digestion notes
                  </label>
                  <textarea
                    rows={3}
                    value={`${allergies}${goalNotes ? `\n${goalNotes}` : ""}`}
                    onChange={(e) => {
                      setAllergies(e.target.value);
                      setGoalNotes(e.target.value);
                    }}
                    placeholder="e.g. No peanuts, fat loss goal, mild lactose sensitivity..."
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] text-[13px]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-2.5 rounded-xl bg-[#0066ff] text-white font-bold text-[13px] disabled:opacity-60 cursor-pointer"
                >
                  {generating ? "Creating your diet plan..." : "Generate Diet Plan"}
                </button>
              </form>
            )}

            {flowStep === "plan_preview" && generatedPlan && (
              <div className="space-y-3">
                <div className="text-[12.5px] max-h-64 overflow-y-auto">
                  <ChatMarkdown content={generatedPlan.markdown} accentColor="#10b981" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveGeneratedPlan}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-[13px] cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlowStep("diet_notes")}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--ui-border)] text-[var(--ui-text)] font-bold text-[13px] cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {flowStep === "paste_plan" && (
              <div className="space-y-3">
                <textarea
                  rows={5}
                  value={pastedPlan}
                  onChange={(e) => setPastedPlan(e.target.value)}
                  placeholder="Paste your meals here (e.g. Meal 1: 100g oats, 200ml milk...)"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] text-[13px]"
                />
                {pasteMessage && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[12px] whitespace-pre-wrap">
                    {pasteMessage}
                    {onSendMessage && (
                      <button
                        type="button"
                        onClick={() => {
                          setFlowStep("none");
                          onSendMessage("/Search ");
                        }}
                        className="block mt-1.5 font-bold text-[#0066ff] underline cursor-pointer"
                      >
                        Go to chat to /Add or /Search
                      </button>
                    )}
                  </div>
                )}
                {brandPrompts.length > 0 && (
                  <div className="space-y-2">
                    {brandPrompts.map((bp) => (
                      <div key={bp.itemName} className="p-2.5 rounded-xl border border-[var(--ui-border)]">
                        <div className="text-[12px] font-bold mb-1.5">
                          Which brand for &quot;{bp.itemName}&quot;?
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {bp.options.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={async () => {
                                await fetch("/api/macros/plan", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "choose_brand", foodCommonId: opt.id }),
                                });
                                handleParseExistingPlan(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#0066ff]/10 text-[#0066ff] text-[11px] font-semibold cursor-pointer"
                            >
                              {opt.name} {opt.brand ? `(${opt.brand})` : ""}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleParseExistingPlan(false)}
                  className="w-full py-2.5 rounded-xl bg-[#0066ff] text-white font-bold text-[13px] cursor-pointer"
                >
                  Parse &amp; Save Plan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* To-Do Tracker Sheet */}
      {trackerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setTrackerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-[24px] sm:rounded-[22px] bg-[var(--ui-card)] border border-[var(--ui-border)] shadow-2xl p-5 max-h-[80dvh] overflow-y-auto space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-[var(--ui-text)] font-headline">
                  Track Your Diet Plan
                </h3>
                <p className="text-[11px] text-[var(--ui-muted)]">
                  IST Date: {trackerData?.dateIst || "Today"} (resets at midnight IST)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTrackerOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--ui-muted)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {!trackerData?.plan ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-[13px] text-[var(--ui-muted)]">No active diet plan yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    setTrackerOpen(false);
                    setFlowStep("custom_choice");
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0066ff] text-white text-[12.5px] font-bold cursor-pointer"
                >
                  Create or Paste Plan
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {trackerData.meals.map((m) => (
                  <label
                    key={m.meal_no}
                    className="flex items-start gap-3 p-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={m.done}
                      onChange={(e) => toggleMealDone(trackerData.plan!.id, m.meal_no, e.target.checked)}
                      className="mt-1 w-4 h-4 accent-[#0066ff]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`text-[13px] font-bold ${m.done ? "line-through opacity-60" : ""}`}>
                        Meal {m.meal_no}
                      </div>
                      <div className="text-[11.5px] text-[var(--ui-muted)] mt-0.5 space-y-0.5">
                        {m.items.map((it, i) => (
                          <div key={i}>
                            {it.food_name} — {it.qty} {it.unit} ({it.kcal} kcal, {it.protein_g}g P)
                          </div>
                        ))}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
