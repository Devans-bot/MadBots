"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BOTS, type Bot } from "@/lib/bots";
import { MainHeader } from "@/components/MainHeader";
import { ChatDrawer } from "@/components/ChatDrawer";
import { SettingsDrawer } from "@/components/SettingsDrawer";

type Last = { text: string; t: number };

export default function Home() {
  const [last, setLast] = useState<Record<string, Last>>({});
  const [customBots, setCustomBots] = useState<Bot[]>([]);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBotName, setNewBotName] = useState("");
  const [newBotDescription, setNewBotDescription] = useState("");
  const [newBotApiKey, setNewBotApiKey] = useState("");
  const [newBotModel, setNewBotModel] = useState("");
  const [newBotFallbackModel, setNewBotFallbackModel] = useState("");
  const [newBotSoul, setNewBotSoul] = useState("");
  const [newBotVisibility, setNewBotVisibility] = useState<"public" | "private">("private");
  const [newBotColor, setNewBotColor] = useState("#0066ff");
  const pageRef = useRef<HTMLDivElement>(null);

  const allBots = [...BOTS, ...customBots];

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("madbots:custom-bots") || "[]");
      if (Array.isArray(saved)) setCustomBots(saved);
    } catch {}
  }, []);

  useEffect(() => {
    const o: Record<string, Last> = {};
    for (const b of allBots) {
      try {
        const m = JSON.parse(localStorage.getItem(`madbots:chat:${b.id}`) || "[]");
        if (m.length) o[b.id] = m[m.length - 1];
      } catch {}
    }
    setLast(o);
  }, [activeBotId, customBots.length]);

  const handleAddBot = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBotName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);
    const created: Bot = {
      id,
      name,
      tagline: newBotDescription.trim() || "Custom AI assistant ready to help.",
      initial: name.charAt(0).toUpperCase(),
      color: newBotColor,
      level: "medium",
      customConfig: {
        apiKey: newBotApiKey.trim(),
        model: newBotModel.trim() || "gemini-3.5-flash",
        fallbackModel: newBotFallbackModel.trim() || "gemini-3.1-flash-lite",
        soul: newBotSoul.trim(),
        visibility: newBotVisibility,
      },
    };
    const next = [...customBots, created];
    setCustomBots(next);
    try {
      localStorage.setItem("madbots:custom-bots", JSON.stringify(next));
    } catch {}
    setNewBotName("");
    setNewBotDescription("");
    setNewBotApiKey("");
    setNewBotModel("");
    setNewBotFallbackModel("");
    setNewBotSoul("");
    setNewBotVisibility("private");
    setShowAddModal(false);
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out", clearProps: "transform,opacity" } });
      tl.fromTo(".hero-word", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.07 })
        .fromTo(
          ".hero-squiggle",
          { strokeDasharray: 140, strokeDashoffset: 140 },
          { strokeDashoffset: 0, duration: 0.5, ease: "power2.inOut" },
          "-=0.2"
        )
        .fromTo(
          ".bot-card",
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.08 },
          "-=0.25"
        );

      gsap.utils.toArray<SVGElement>(".doodle-float").forEach((el, i) => {
        gsap.to(el, {
          y: i % 2 === 0 ? -7 : 7,
          rotation: i % 2 === 0 ? "+=4" : "-=4",
          duration: 2.8 + (i % 3) * 0.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.15,
        });
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={pageRef}
      className="h-dvh w-full flex flex-col relative overflow-hidden bg-[var(--ui-bg)] text-[var(--ui-text)] selection:bg-black selection:text-white antialiased font-sans"
    >
      {/* Persistent Global MaDbotS Header (never disappears; pushes up 5px when drawer opens) */}
      <MainHeader
        isChatOpen={Boolean(activeBotId) || showSettings}
        onHomeClick={() => {
          setActiveBotId(null);
          setShowSettings(false);
        }}
        onSettingsClick={() => {
          setActiveBotId(null);
          setShowSettings(true);
        }}
      />

      {/* Home Content Underneath (overflow locked when drawer is open to prevent background bounce) */}
      <div
        className={`flex-1 min-h-0 relative ${
          activeBotId || showSettings ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        {/* Subtle Tally hand-drawn playful background vector doodles */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40">
          <svg className="doodle-float absolute top-[20%] right-8 w-8 h-8 text-[#FF2B85] stroke-current fill-none stroke-[3] stroke-linecap-round" viewBox="0 0 24 24">
            <line x1="5" x2="19" y1="19" y2="5" />
          </svg>
          <svg className="doodle-float absolute bottom-12 right-4 w-14 h-14 text-zinc-400 stroke-current fill-none stroke-[1.5] rotate-12" viewBox="0 0 40 40">
            <path d="M8 32 C 16 30, 24 24, 28 12 M20 10 L29 11 L28 20" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg className="doodle-float absolute bottom-[28%] left-8 w-20 h-20 text-zinc-400 stroke-current fill-none -rotate-6" viewBox="0 0 64 64" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M32 10 L32 18" />
            <circle cx="32" cy="8" r="2.5" />
            <rect x="18" y="18" width="28" height="24" rx="6" ry="6" />
            <circle cx="26" cy="28" r="2.5" fill="currentColor" />
            <circle cx="38" cy="28" r="2.5" fill="currentColor" />
            <path d="M27 35 Q32 39 37 35" />
            <path d="M13 28 L18 28" />
            <path d="M46 28 L51 28" />
            <path d="M24 42 L24 48 L40 48 L40 42" />
          </svg>
          <svg className="doodle-float absolute bottom-[36%] right-10 w-12 h-12 text-zinc-400 stroke-current fill-none rotate-12" viewBox="0 0 40 40" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 8 C10 8 9 12 9 15 C9 18 6 19 4 20 C6 21 9 22 9 25 C9 28 10 32 14 32" />
            <path d="M26 8 C30 8 31 12 31 15 C31 18 34 19 36 20 C34 21 31 22 31 25 C31 28 30 32 26 32" />
          </svg>
          <svg className="doodle-float absolute bottom-[18%] left-16 w-16 h-16 text-zinc-400 stroke-current fill-none rotate-3" viewBox="0 0 48 48" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 14 C10 9 14 6 24 6 C34 6 38 9 38 18 C38 27 34 30 24 30 C20 30 17 31 12 34 C13 31 13 29 12 28 C10 25 10 20 10 14 Z" />
            <circle cx="19" cy="18" r="1.5" fill="currentColor" />
            <circle cx="24" cy="18" r="1.5" fill="currentColor" />
            <circle cx="29" cy="18" r="1.5" fill="currentColor" />
          </svg>
          <svg className="doodle-float absolute bottom-[10%] left-[45%] w-14 h-10 text-zinc-400 stroke-current fill-none -rotate-12" viewBox="0 0 48 32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 6 L4 16 L14 26" />
            <path d="M20 28 L28 4" />
            <path d="M34 6 L44 16 L34 26" />
          </svg>
          <svg className="doodle-float absolute bottom-[24%] right-[28%] w-7 h-7 text-[#FF2B85] stroke-current fill-none stroke-[2] stroke-linecap-round" viewBox="0 0 24 24">
            <path d="M12 2 L12 22 M2 12 L22 12 M5 5 L19 19 M5 19 L19 5" />
          </svg>
          <svg className="doodle-float absolute bottom-[44%] left-[22%] w-5 h-5 text-zinc-400 stroke-current fill-none stroke-[1.8] stroke-linecap-round" viewBox="0 0 24 24">
            <path d="M12 3 Q12 12 3 12 Q12 12 12 21 Q12 12 21 12 Q12 12 12 3 Z" fill="none" />
          </svg>
        </div>

        {/* Main Hero & AI Agents List */}
        <main className="relative z-10 w-full pt-6 pb-16 flex flex-col px-1">
          <div className="pb-4 text-left px-2" style={{ paddingBottom: "16px" }}>
            <h1 className="text-[15px] font-bold tracking-tight text-[var(--ui-text)] flex items-center gap-1.5 font-headline">
              <span className="hero-word">Available LLM Agents</span>
              <span className="hero-word inline-flex items-center text-[#FF2B85]">
                <span className="material-symbols-outlined text-[18px] font-bold">arrow_downward</span>
              </span>
            </h1>
          </div>

          <div className="flex flex-col pb-24 w-full" style={{ gap: "8px" }}>
            {allBots.map((bot) => {
              const lastMsg = last[bot.id];
              const isMacro = bot.id === "madrix-macros";
              const isBhima = bot.id === "bhima-coach";
              const badgeLabel = isMacro ? "Nutrition" : isBhima ? "Fitness" : "Coding";
              const tagIcon = isMacro ? "restaurant" : isBhima ? "fitness_center" : "code";
              const tagText = isMacro ? "Food DB" : isBhima ? "Strength" : "TypeScript";

              return (
                <button
                  key={bot.id}
                  type="button"
                  onClick={() => setActiveBotId(bot.id)}
                  className="bot-card group relative w-full text-left bg-[var(--ui-card)] border-2 border-[var(--ui-border)] hover:border-zinc-500 pl-[10px] pr-2.5 py-2.5 rounded-2xl transition-all duration-150 cursor-pointer active:scale-[0.99] block shadow-[0_6px_14px_-2px_rgba(0,0,0,0.12),0_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_18px_-2px_rgba(0,0,0,0.45)]"
                  style={{
                    borderRadius: "20px",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {bot.avatar ? (
                        <img
                          src={bot.avatar}
                          alt={bot.name}
                          className="w-[66px] h-[66px] rounded-2xl object-cover shadow-sm border border-zinc-300 dark:border-zinc-600"
                        />
                      ) : (
                        <div
                          className="w-[66px] h-[66px] rounded-2xl flex items-center justify-center font-bold text-white text-2xl shadow-sm"
                          style={{ background: bot.color }}
                        >
                          {bot.initial}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[var(--ui-card)] rounded-full flex items-center justify-center shadow-xs">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-2 mb-1 min-w-0">
                        <span className="text-[16px] font-bold text-[var(--ui-text)] truncate font-headline">
                          {bot.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded border border-[var(--ui-border)] bg-[var(--ui-sheet)] text-[var(--ui-muted)] text-[10px] font-semibold shrink-0">
                          {badgeLabel}
                        </span>
                      </div>
                      <p className="font-body text-[10.5px] text-[var(--ui-muted)] font-normal line-clamp-2 leading-tight">
                        {bot.tagline}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </main>
      </div>

      {/* Floating Bottom-Center Navbar (40% width, rounded corners, light black shadow) */}
      {!activeBotId && !showSettings && (
        <nav
          aria-label="Bottom action bar"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 w-[40%] min-w-[165px]"
        >
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-full py-3 px-4 rounded-full bg-[var(--ui-card)] border border-[var(--ui-border)] text-[var(--ui-text)] font-bold text-[13.5px] flex items-center justify-center gap-2 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.14), 0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <span className="material-symbols-outlined text-[18px] text-[#0066ff]">add_circle</span>
            <span className="truncate font-headline">Add Agent</span>
          </button>
        </nav>
      )}

      {/* Add Bot Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs px-4 py-6"
          onClick={() => setShowAddModal(false)}
        >
          <form
            onSubmit={handleAddBot}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-2xl bg-[var(--ui-card)] border border-[var(--ui-border)] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--ui-text)] font-headline">Add New Agent</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ui-muted)] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Agent Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ui-muted)] mb-1">
                  Agent Name
                </label>
                <input
                  type="text"
                  required
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  placeholder="e.g. Study Buddy"
                  className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] px-3 py-2 text-[16px] text-[var(--ui-text)] focus:outline-none focus:border-[#0066ff]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ui-muted)] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={newBotDescription}
                  onChange={(e) => setNewBotDescription(e.target.value)}
                  placeholder="Brief description of what this agent does..."
                  className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] px-3 py-2 text-[16px] text-[var(--ui-text)] focus:outline-none focus:border-[#0066ff]"
                />
              </div>

              {/* API Key with explicit warning */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ui-muted)] mb-1">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={newBotApiKey}
                  onChange={(e) => setNewBotApiKey(e.target.value)}
                  placeholder="AIza... or AQ..."
                  className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] px-3 py-2 text-[16px] text-[var(--ui-text)] focus:outline-none focus:border-[#0066ff]"
                />
                <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Note: Don&apos;t use the same API key for this agent — use a separate key to isolate rate limits.
                </p>
              </div>

              {/* Model & Fallback Model */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ui-muted)] mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={newBotModel}
                    onChange={(e) => setNewBotModel(e.target.value)}
                    placeholder="Enter model ID"
                    className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] px-3 py-2 text-[16px] font-mono text-[var(--ui-text)] focus:outline-none focus:border-[#0066ff]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ui-muted)] mb-1">
                    Fallback Model
                  </label>
                  <input
                    type="text"
                    value={newBotFallbackModel}
                    onChange={(e) => setNewBotFallbackModel(e.target.value)}
                    placeholder="Enter fallback model ID"
                    className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] px-3 py-2 text-[16px] font-mono text-[var(--ui-text)] focus:outline-none focus:border-[#0066ff]"
                  />
                </div>
              </div>

              {/* soul.md Instructions */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ui-muted)] mb-1">
                  soul.md (System Instructions)
                </label>
                <textarea
                  rows={5}
                  value={newBotSoul}
                  onChange={(e) => setNewBotSoul(e.target.value)}
                  placeholder={`# Soul & System Instructions\n\n## 1. Identity\nDefine who this bot is, its tone, and persona...\n\n## 2. Scope & Rules\nList what topics it should answer and what to refuse...\n\n## 3. Response Format\nSpecify how replies should be structured...`}
                  className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] px-3 py-2 text-[16px] font-mono text-[var(--ui-text)] focus:outline-none focus:border-[#0066ff] resize-y"
                />
              </div>

              {/* Public / Private Visibility */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ui-muted)] mb-1.5">
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--ui-sheet)] p-1 border border-[var(--ui-border)]">
                  <button
                    type="button"
                    onClick={() => setNewBotVisibility("public")}
                    className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      newBotVisibility === "public"
                        ? "bg-[#0066ff] text-white shadow-xs"
                        : "text-[var(--ui-muted)]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">public</span>
                    <span>Public</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewBotVisibility("private")}
                    className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      newBotVisibility === "private"
                        ? "bg-zinc-900 dark:bg-zinc-700 text-white shadow-xs"
                        : "text-[var(--ui-muted)]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">lock</span>
                    <span>Private</span>
                  </button>
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ui-muted)] mb-1.5">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {["#0066ff", "#ff2b85", "#10b981", "#f59e0b", "#8b5cf6"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewBotColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        newBotColor === c ? "scale-115 ring-2 ring-offset-2 ring-zinc-400" : ""
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-[#0066ff] hover:bg-[#0050cb] text-white font-bold text-sm transition-all active:scale-98 cursor-pointer"
            >
              Create Agent
            </button>
          </form>
        </div>
      )}

      {/* Chat Drawer sliding up over bottom 10px of MainHeader */}
      {activeBotId && (
        <ChatDrawer
          key={activeBotId}
          botId={activeBotId}
          onClose={() => setActiveBotId(null)}
        />
      )}

      {/* Settings Drawer sliding up over bottom 10px of MainHeader (zero white flash) */}
      {showSettings && (
        <SettingsDrawer onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
