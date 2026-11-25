"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BOTS, type Bot } from "@/lib/bots";
import { useSettings } from "@/lib/settings";
import { ChatSkeletonList } from "./ChatSkeletonList";

type Msg = { role: "user" | "model"; text: string; t: number; verified?: boolean };

interface ChatDrawerProps {
  botId: string;
  onClose: () => void;
}

export function ChatDrawer({ botId, onClose }: ChatDrawerProps) {
  const [bot, setBot] = useState<Bot>(() => BOTS.find((b) => b.id === botId) ?? BOTS[0]);
  const { s } = useSettings();

  useEffect(() => {
    const builtIn = BOTS.find((b) => b.id === botId);
    if (builtIn) {
      setBot(builtIn);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem("madbots:custom-bots") || "[]") as Bot[];
      const found = saved.find((b) => b.id === botId);
      if (found) setBot(found);
    } catch {}
  }, [botId]);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loadingSkeleton, setLoadingSkeleton] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const drawerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragDeltaYRef = useRef<number>(0);
  const isClosingRef = useRef(false);

  const key = `madbots:chat:${bot.id}`;

  // Load saved messages & run 2-second skeleton timer
  useEffect(() => {
    try {
      setMsgs(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch {}
    setLoadingSkeleton(true);
    const timer = setTimeout(() => {
      setLoadingSkeleton(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [key]);

  // Animate drawer slowly upwards from bottom to top on mount
  useEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    const tween = gsap.fromTo(
      el,
      { y: "100%" },
      { y: 0, duration: 0.65, ease: "power3.out" }
    );
    return () => {
      tween.kill();
    };
  }, []);

  // Scroll to latest message once skeleton finishes or new message arrives
  useEffect(() => {
    if (!loadingSkeleton) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [msgs, busy, loadingSkeleton]);

  const animateClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    const el = drawerRef.current;
    if (!el) {
      onClose();
      return;
    }
    gsap.to(el, {
      y: "100%",
      duration: 0.45,
      ease: "power3.in",
      onComplete: () => {
        onClose();
      },
    });
  };

  // Swipe / Drag handlers on the horizontal handle bar
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isClosingRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartYRef.current = e.clientY;
    dragDeltaYRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null || isClosingRef.current) return;
    const delta = Math.max(0, e.clientY - dragStartYRef.current);
    dragDeltaYRef.current = delta;
    if (drawerRef.current) {
      gsap.set(drawerRef.current, { y: delta });
    }
  };

  const handlePointerUp = () => {
    if (dragStartYRef.current === null || isClosingRef.current) return;
    const delta = dragDeltaYRef.current;
    dragStartYRef.current = null;
    dragDeltaYRef.current = 0;

    if (delta > 55) {
      animateClose();
    } else if (delta > 3) {
      // Snap back smoothly
      if (drawerRef.current) {
        gsap.to(drawerRef.current, { y: 0, duration: 0.25, ease: "power2.out" });
      }
    } else {
      // Simple tap/click on the horizontal bar closes drawer
      animateClose();
    }
  };

  const send = async (overrideText?: string) => {
    const q = (overrideText ?? text).trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", text: q, t: Date.now() }];
    setMsgs(next);
    setText("");
    setBusy(true);

    let reply = "Something went wrong. Try again.";
    let verified = false;
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: bot.id,
          level: s.levels[bot.id],
          messages: next,
          customConfig: bot.customConfig,
        }),
      });
      const d = await r.json();
      if (d.reply) reply = d.reply;
      if (d.verified) verified = true;
    } catch {}

    const all: Msg[] = [...next, { role: "model", text: reply, t: Date.now(), verified }];
    setMsgs(all);
    setBusy(false);
    try {
      localStorage.setItem(key, JSON.stringify(all.slice(-100)));
    } catch {}
  };

  const copyText = (txt: string, idx: number) => {
    navigator.clipboard?.writeText(txt);
    setCopiedId(idx);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const sampleChips =
    bot.id === "madrix-macros"
      ? ["100g oats & 300ml milk", "2 whole eggs and 150g cooked rice", "verify-macros"]
      : bot.id === "bhima-coach"
      ? ["Desi Push/Pull/Legs split", "Calculate my 1RM (100kg x 5)", "High-protein vegetarian diet"]
      : ["Explain Binary Search in C++", "Debug my Python loop", "OOP 4 pillars in JS"];

  const botRowBg =
    bot.id === "madrix-macros"
      ? "bg-[#ecfdf5]/85 dark:bg-emerald-500/12 border-l-[3px] border-l-emerald-500 backdrop-blur-md" // Faded green
      : bot.id === "bhima-coach"
      ? "bg-[#fff7ed]/85 dark:bg-orange-500/12 border-l-[3px] border-l-orange-500 backdrop-blur-md" // Faded orange
      : "bg-[#ebf3ff]/85 dark:bg-blue-500/12 border-l-[3px] border-l-[#0066ff] backdrop-blur-md"; // Faded blue

  const botAccentColor =
    bot.id === "madrix-macros"
      ? "#10b981"
      : bot.id === "bhima-coach"
      ? "#f97316"
      : "#0066ff";

  const isTypingActive = text.trim().length > 0;

  return (
    <div
      ref={drawerRef}
      data-testid="chat-sheet"
      className="absolute inset-x-0 top-[53px] bottom-0 z-30 flex flex-col bg-transparent overflow-visible select-none"
    >
      {/* Neon gradient top frame */}
      <div className="flex-1 min-h-0 flex flex-col rounded-t-[26px] pt-[2px] px-[1.5px] pb-0 madbots-chat-neon-frame max-w-3xl w-full mx-auto">
        <section
          aria-label={`Chat with ${bot.name}`}
          className="flex-1 min-h-0 flex flex-col relative overflow-hidden rounded-t-[24.5px] bg-[var(--ui-card)] madbots-graph-grid"
        >
          {/* Top Draggable Handle + Sticky Bot Header */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="shrink-0 z-30 pt-1 pb-2.5 touch-none cursor-grab active:cursor-grabbing"
          >
            {/* Centered Horizontal Swipe Bar */}
            <div className="flex justify-center">
              <button
                type="button"
                data-testid="ios-swipe-bar"
                aria-label="Swipe down or click to close chat"
                className="group w-36 h-6 flex items-center justify-center rounded-full focus:outline-none"
              >
                <span className="w-14 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-400 transition-colors" />
              </button>
            </div>

            {/* Bot Info Header */}
            <div className="w-[95%] mx-auto flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl bg-[var(--ui-card)]/95 backdrop-blur-md border border-[var(--ui-border)] shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  {bot.avatar ? (
                    <img
                      src={bot.avatar}
                      alt={bot.name}
                      className="w-9 h-9 rounded-xl object-cover shadow-sm border border-zinc-300 dark:border-zinc-600"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm"
                      style={{ background: bot.color }}
                    >
                      {bot.initial}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#28c840] border border-white dark:border-zinc-900" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-[15px] text-[var(--ui-text)] leading-tight tracking-tight truncate font-headline">
                    {bot.name}
                  </span>
                  <span className="text-[11px] text-[var(--ui-muted)] truncate">
                    {loadingSkeleton ? "Syncing thread..." : bot.tagline}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                Active
              </span>
            </div>
          </div>

          {/* Scrollable Message Viewport (Discord DM Layout, 4px right/side gap) */}
          <div className="flex-1 min-h-0 w-full pt-2 pb-36 overflow-y-auto select-text pl-1 pr-[4px]">
            {loadingSkeleton ? (
              <ChatSkeletonList botId={bot.id} />
            ) : (
              <div className="flex flex-col items-start gap-[4px] w-full pb-6">
                {msgs.length === 0 && (
                  <div className="w-full flex flex-col items-start px-3 py-6 text-left">
                    <div className="mb-3">
                      {bot.avatar ? (
                        <img
                          src={bot.avatar}
                          alt={bot.name}
                          className="w-16 h-16 rounded-full object-cover shadow-sm border border-zinc-300 dark:border-zinc-600"
                        />
                      ) : (
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-2xl shadow-sm"
                          style={{ background: bot.color }}
                        >
                          {bot.initial}
                        </div>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-[var(--ui-text)] font-headline">{bot.name}</h2>
                    <p
                      className="text-[13.5px] font-normal text-[var(--ui-muted)] mt-1"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      This is the beginning of your direct message history with {bot.name}. {bot.tagline}
                    </p>
                  </div>
                )}

                {msgs.length > 0 && (
                  <div className="w-full flex items-center gap-2 px-1 my-1.5">
                    <div className="flex-1 h-px bg-[var(--ui-border)]" />
                    <span className="text-[10.5px] font-semibold text-[var(--ui-muted)] shrink-0">
                      Today
                    </span>
                    <div className="flex-1 h-px bg-[var(--ui-border)]" />
                  </div>
                )}

                {msgs.map((msg, idx) => {
                  const timeStr = new Date(msg.t).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const isUser = msg.role === "user";

                  return (
                    <article
                      key={idx}
                      data-testid={isUser ? "chat-box-user" : "chat-box-bot"}
                      className={`group w-full flex items-start gap-3 p-1 rounded-r-lg rounded-l-[3px] backdrop-blur-md transition-colors text-left ${
                        isUser
                          ? "bg-[#f2f3f5]/85 dark:bg-zinc-500/15 border-l-[3px] border-l-zinc-400 dark:border-l-zinc-500"
                          : botRowBg
                      }`}
                    >
                      {/* Left Circular Avatar */}
                      <div className="shrink-0 pt-0.5">
                        {isUser ? (
                          <div className="w-9 h-9 rounded-full bg-zinc-800 dark:bg-zinc-700 text-white flex items-center justify-center shadow-xs">
                            <span className="material-symbols-outlined text-[18px]">person</span>
                          </div>
                        ) : bot.avatar ? (
                          <img
                            src={bot.avatar}
                            alt={bot.name}
                            className="w-9 h-9 rounded-full object-cover border border-zinc-300 dark:border-zinc-600 shadow-xs"
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xs"
                            style={{ background: bot.color }}
                          >
                            {bot.initial}
                          </div>
                        )}
                      </div>

                      {/* Right Content Column */}
                      <div className="flex-1 min-w-0 flex flex-col items-start text-left">
                        {/* Author Header Line */}
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap leading-none">
                            <span
                              className={`font-semibold text-[14px] leading-none ${
                                isUser
                                  ? "text-[var(--ui-text)]"
                                  : "text-[#0066ff] dark:text-[#66a3ff]"
                              }`}
                            >
                              {isUser ? "You" : bot.name}
                            </span>
                            {!isUser && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[4px] bg-[#5865F2] text-white text-[9.5px] font-bold tracking-wide uppercase leading-none">
                                BOT
                              </span>
                            )}
                            {!isUser && msg.verified && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#0066ff]/15 text-[#0066ff] dark:text-[#66a3ff] border border-[#0066ff]/25 text-[9.5px] font-bold leading-none">
                                <span className="material-symbols-outlined text-[11px]">verified</span>
                                <span>Verified</span>
                              </span>
                            )}
                            <span className="text-[11px] font-normal text-[var(--ui-muted)] tabular-nums leading-none">
                              Today at {timeStr}
                            </span>
                          </div>

                          {!isUser && (
                            <button
                              type="button"
                              onClick={() => copyText(msg.text, idx)}
                              aria-label="Copy message"
                              className="opacity-70 hover:opacity-100 px-1.5 py-0.5 rounded text-[11px] text-[var(--ui-muted)] hover:text-[var(--ui-text)] hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1 transition-all cursor-pointer shrink-0"
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {copiedId === idx ? "check" : "content_copy"}
                              </span>
                              <span className="text-[10px] font-medium">
                                {copiedId === idx ? "Copied" : "Copy"}
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Message Text (Poppins Regular) */}
                        <div
                          className="w-full min-w-0 mt-1 space-y-2 text-left text-[13.5px] font-normal leading-relaxed text-[var(--ui-text)]"
                          style={{ fontFamily: "var(--font-poppins)" }}
                        >
                          {msg.text.split(/(```[\s\S]*?```)/g).map((segment, segIdx) => {
                            if (segment.startsWith("```") && segment.endsWith("```")) {
                              const lines = segment.slice(3, -3).split("\n");
                              const lang = lines[0]?.trim() || "CODE";
                              const codeBody = (lines[0]?.trim() ? lines.slice(1) : lines).join("\n").trim();
                              return (
                                <div
                                  key={segIdx}
                                  className="bg-[#f3f4f3] dark:bg-[#12151c] border border-[var(--ui-border)] rounded-lg overflow-hidden my-1"
                                >
                                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#e8e8e7] dark:bg-[#191d26] border-b border-[var(--ui-border)]">
                                    <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--ui-muted)]">
                                      {lang}
                                    </span>
                                  </div>
                                  <pre className="font-mono text-[12px] leading-relaxed text-[var(--ui-text)] p-3 overflow-x-auto">
                                    <code>{codeBody}</code>
                                  </pre>
                                </div>
                              );
                            }
                            const trimmed = segment.trim();
                            if (!trimmed) return null;
                            return (
                              <div key={segIdx} className="space-y-1">
                                {trimmed.split("\n").map((line, lineIdx) => {
                                  const cleanLine = line.trimEnd();
                                  if (!cleanLine.trim()) {
                                    return <div key={lineIdx} className="h-1.5" />;
                                  }

                                  // Bullet line (- ... or • ...)
                                  const bulletMatch = cleanLine.match(/^(\s*)[-*•]\s+(.*)$/);
                                  if (bulletMatch) {
                                    const indent = bulletMatch[1].length >= 2;
                                    const body = bulletMatch[2];
                                    const isSubtotal = /subtotal/i.test(body);
                                    const colonIdx = body.indexOf(":");
                                    return (
                                      <div
                                        key={lineIdx}
                                        className={`flex items-start gap-2 ${indent ? "pl-4" : "pl-1.5"}`}
                                      >
                                        <span className="text-[var(--ui-muted)] select-none leading-relaxed">•</span>
                                        <span className={isSubtotal ? "font-semibold" : ""}>
                                          {colonIdx > 0 && colonIdx < 40 ? (
                                            <>
                                              <span className="font-medium text-[var(--ui-text)]">
                                                {body.slice(0, colonIdx + 1)}
                                              </span>
                                              <span>{body.slice(colonIdx + 1)}</span>
                                            </>
                                          ) : (
                                            body
                                          )}
                                        </span>
                                      </div>
                                    );
                                  }

                                  // Section heading line (e.g. "Meal 1:" or "Daily Total:" or "Daily Total")
                                  const isSectionHeader =
                                    /^(Meal\s+\d+.*|Daily Total.*|Workout.*|Day\s+\d+.*|Problem Breakdown.*|Solution.*|Complexity Check.*):?$/i.test(
                                      cleanLine.trim()
                                    ) || /^[A-Z][A-Za-z0-9\s\-/()]{1,42}:$/.test(cleanLine.trim());

                                  if (isSectionHeader) {
                                    return (
                                      <div
                                        key={lineIdx}
                                        className="font-semibold text-[13.5px] text-[var(--ui-text)] pt-1"
                                      >
                                        {cleanLine.trim()}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div key={lineIdx} className="whitespace-pre-wrap">
                                      {cleanLine}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </article>
                  );
                })}

                {busy && (
                  <div className={`w-full flex items-center gap-2.5 p-1 rounded-lg text-left ${botRowBg}`}>
                    <span className="flex items-center gap-1 pl-1" aria-hidden="true">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5865F2] animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5865F2] animate-bounce [animation-delay:120ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5865F2] animate-bounce [animation-delay:240ms]" />
                    </span>
                    <span
                      className="text-[12.5px] font-normal text-[var(--ui-muted)]"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      {bot.name} is typing...
                    </span>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>

          {/* Docked Bottom Light Liquid-Glass Interaction Unit */}
          <div className="absolute bottom-0 left-0 right-0 z-30 w-full px-3 pt-4 pb-safe bg-gradient-to-t from-white/95 via-white/85 to-transparent dark:from-[#161922]/95 dark:via-[#161922]/85 pointer-events-none">
            <div className="mx-auto max-w-xl flex flex-col gap-2 pointer-events-auto">
              {/* Light Glass Suggestion Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar select-none">
                {sampleChips.map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={loadingSkeleton || busy}
                    onClick={() => send(chip)}
                    className="px-3 py-1 rounded-[14px] bg-white/75 dark:bg-[#1e2330]/80 backdrop-blur-md hover:bg-white dark:hover:bg-[#252b3b] disabled:opacity-40 text-[var(--ui-text)] text-[11.5px] font-medium border border-zinc-200/80 dark:border-zinc-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Light Liquid-Glass Squircle Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-center gap-2 rounded-[20px] bg-white/80 dark:bg-[#1e2330]/85 backdrop-blur-xl px-2.5 py-1.5 border-[1.5px] transition-all duration-200"
                style={{
                  borderColor: isTypingActive ? botAccentColor : "rgba(212, 212, 216, 0.85)",
                  boxShadow: isTypingActive
                    ? `0 8px 28px -4px ${botAccentColor}35, inset 0 1px 1px rgba(255,255,255,0.9)`
                    : "0 8px 24px -4px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.9)",
                }}
              >
                <button
                  type="button"
                  aria-label="Close drawer"
                  onClick={animateClose}
                  className="w-8 h-8 rounded-[14px] text-[var(--ui-muted)] hover:text-[var(--ui-text)] hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all shrink-0 active:scale-90 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
                </button>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={loadingSkeleton}
                  placeholder={`Ask ${bot.name}...`}
                  className="flex-1 bg-transparent border-0 text-[13.5px] font-normal text-[var(--ui-text)] placeholder-[var(--ui-muted)] focus:outline-none focus:ring-0 px-1 py-1.5 disabled:opacity-50"
                  style={{ fontFamily: "var(--font-poppins)" }}
                />
                <button
                  type="submit"
                  disabled={busy || loadingSkeleton || !text.trim()}
                  aria-label="Send message"
                  className="w-9 h-9 rounded-[14px] disabled:opacity-35 text-white flex items-center justify-center transition-all shrink-0 active:scale-90 shadow-sm cursor-pointer"
                  style={{ backgroundColor: botAccentColor }}
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
