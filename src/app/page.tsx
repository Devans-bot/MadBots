"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BOTS, type Bot } from "@/lib/bots";
import { MainHeader } from "@/components/MainHeader";
import { ChatDrawer } from "@/components/ChatDrawer";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { DesktopWorkspace } from "@/components/DesktopWorkspace";
import { AddAgentDrawer } from "@/components/AddAgentDrawer";
import { BotProfileView } from "@/components/BotProfileView";
import { MarketplaceDrawer } from "@/components/MarketplaceDrawer";

type Last = { text: string; t: number };

export default function Home() {
  const [last, setLast] = useState<Record<string, Last>>({});
  const [userBotIds, setUserBotIds] = useState<string[]>([]);
  const [botsLoaded, setBotsLoaded] = useState(false);
  const [customBots, setCustomBots] = useState<Bot[]>([]);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [showBotProfile, setShowBotProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  const allBots = [...BOTS.filter((b) => userBotIds.includes(b.id)), ...customBots];

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bots")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && Array.isArray(d?.botIds)) {
          setUserBotIds(d.botIds);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBotsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("madbots:custom-bots") || "[]");
      if (Array.isArray(saved)) {
        // Never restore API keys from localStorage; session-only in memory
        setCustomBots(
          saved.map((b: Bot) => ({
            ...b,
            customConfig: b.customConfig ? { ...b.customConfig, apiKey: "" } : undefined,
          }))
        );
      }
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

  const handleCreateAgent = (created: Bot) => {
    // Keep apiKey in React state (session memory only); strip apiKey before persisting to localStorage
    const next = [...customBots, created];
    setCustomBots(next);
    try {
      const sanitized = next.map((b) => ({
        ...b,
        customConfig: b.customConfig ? { ...b.customConfig, apiKey: "" } : undefined,
      }));
      localStorage.setItem("madbots:custom-bots", JSON.stringify(sanitized));
    } catch {}
  };

  const handleAddBot = async (botId: string) => {
    const res = await fetch("/api/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botId }),
    });
    if (res.ok) {
      setUserBotIds((prev) => (prev.includes(botId) ? prev : [...prev, botId]));
    }
  };

  const handleRemoveBot = async (botId: string) => {
    const res = await fetch("/api/bots", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botId }),
    });
    if (res.ok) {
      setUserBotIds((prev) => prev.filter((id) => id !== botId));
      if (activeBotId === botId) {
        setActiveBotId(null);
        setShowBotProfile(false);
      }
    }
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
      className="min-h-dvh w-full relative bg-[var(--ui-bg)] text-[var(--ui-text)] selection:bg-black selection:text-white antialiased font-sans"
    >
      {/* DESKTOP MODE UI (WebView Split Dashboard + Integrated Settings) */}
      <div className="hidden md:block w-full min-h-screen">
        <DesktopWorkspace
          agents={allBots}
          onAddAgentClick={() => setShowAddModal(true)}
          onOpenMarketplace={() => setShowMarketplace(true)}
        />
      </div>

      {/* MOBILE MODE UI (Preserved untouched) */}
      <div className="md:hidden h-dvh w-full flex flex-col relative overflow-hidden madbots-graph-grid">
        {/* Persistent Global MaDbotS Header (never disappears; pushes up 5px when drawer opens) */}
        <MainHeader
          isChatOpen={Boolean(activeBotId) || showSettings || showAddModal}
          activeBot={activeBotId ? allBots.find((b) => b.id === activeBotId) ?? null : null}
          onHomeClick={() => {
            setActiveBotId(null);
            setShowBotProfile(false);
            setShowSettings(false);
            setShowAddModal(false);
          }}
          onBotInfoClick={() => {
            if (activeBotId) setShowBotProfile(true);
          }}
          onSettingsClick={() => {
            setActiveBotId(null);
            setShowBotProfile(false);
            setShowAddModal(false);
            setShowSettings(true);
          }}
        />

      {/* Home Content Underneath (overflow locked when drawer is open to prevent background bounce) */}
      <div
        className={`flex-1 min-h-0 relative ${
          activeBotId || showSettings || showAddModal ? "overflow-hidden" : "overflow-y-auto"
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
            {botsLoaded && allBots.length === 0 && (
              <div className="w-full rounded-2xl bg-[var(--ui-card)] border border-[var(--ui-border)] p-6 text-center space-y-3">
                <p className="text-[14px] font-medium text-[var(--ui-muted)]">
                  No bots yet. Add one from the marketplace.
                </p>
                <button
                  type="button"
                  onClick={() => setShowMarketplace(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#0066ff] hover:bg-[#0050cb] text-white text-[13px] font-bold shadow-xs cursor-pointer"
                >
                  Open Marketplace
                </button>
              </div>
            )}
            {allBots.map((bot) => {
              const lastMsg = last[bot.id];
              const isMacro = bot.id === "madrix-macros";
              const isBhima = bot.id === "bhima-coach";
              const isRehab = bot.id === "madrix-rehab";
              const badgeLabel = isMacro ? "Nutrition" : isBhima ? "Fitness" : isRehab ? "Rehab" : "Coding";
              const tagIcon = isMacro ? "restaurant" : isBhima ? "fitness_center" : isRehab ? "healing" : "code";
              const tagText = isMacro ? "Food DB" : isBhima ? "Strength" : isRehab ? "Physio" : "TypeScript";

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

      {/* Floating Bottom-Center Navbar */}
      {!activeBotId && !showSettings && !showAddModal && (
        <nav
          aria-label="Bottom action bar"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => setShowMarketplace(true)}
            className="py-3 px-4 rounded-full bg-[#0066ff] hover:bg-[#0050cb] text-white font-bold text-[13.5px] flex items-center justify-center gap-1.5 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap"
            style={{
              boxShadow: "0 8px 24px rgba(0, 102, 255, 0.25), 0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            <span className="font-headline">Marketplace</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="py-3 px-4 rounded-full bg-[var(--ui-card)] border border-[var(--ui-border)] text-[var(--ui-text)] font-bold text-[13.5px] flex items-center justify-center gap-1.5 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap"
            style={{
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.14), 0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <span className="material-symbols-outlined text-[18px] text-[#0066ff]">add_circle</span>
            <span className="truncate font-headline">Add Agent</span>
          </button>
        </nav>
      )}

      {/* Chat Drawer sliding up over bottom 10px of MainHeader (Mobile only) */}
      {activeBotId && (
        <ChatDrawer
          key={activeBotId}
          botId={activeBotId}
          onClose={() => {
            setShowBotProfile(false);
            setActiveBotId(null);
          }}
        />
      )}

      {/* Bot Profile Page when clicking bot info area on top of chat screen */}
      {showBotProfile && activeBotId && (() => {
        const currentBot = allBots.find((b) => b.id === activeBotId);
        if (!currentBot) return null;
        return (
          <BotProfileView
            bot={currentBot}
            onBack={() => setShowBotProfile(false)}
          />
        );
      })()}

      {/* Settings Drawer sliding up over bottom 10px of MainHeader (Mobile only) */}
      {showSettings && (
        <SettingsDrawer onClose={() => setShowSettings(false)} />
      )}
      </div>

      {/* Slide-Up Add Agent Drawer */}
      {showAddModal && (
        <AddAgentDrawer
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreateAgent}
        />
      )}

      {/* Marketplace Modal */}
      {showMarketplace && (
        <MarketplaceDrawer
          addedBotIds={userBotIds}
          onClose={() => setShowMarketplace(false)}
          onAddBot={handleAddBot}
          onRemoveBot={handleRemoveBot}
        />
      )}
    </div>
  );
}
