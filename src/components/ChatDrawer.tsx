"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { BOTS, type Bot } from "@/lib/bots";
import { cleanReply } from "@/lib/formatReply";
import { useSettings } from "@/lib/settings";
import { ChatSkeletonList } from "./ChatSkeletonList";
import { ChatMarkdown } from "./ChatMarkdown";
import { CodeBlock } from "./CodeBlock";
import { useVoiceChat } from "@/lib/useVoiceChat";
import { MacroChiefV2Controls } from "./MacroChiefV2Overlay";

type Msg = {
  role: "user" | "model";
  text: string;
  t: number;
  verified?: boolean;
  responseTime?: string;
  starred?: boolean;
  isError?: boolean;
  retryPrompt?: string;
  computedItems?: unknown[];
  loggedToToday?: boolean;
};

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
    } catch { }
  }, [botId]);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loadingSkeleton, setLoadingSkeleton] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [placeholderHint, setPlaceholderHint] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string }>>([]);
  const [mounted, setMounted] = useState(false);
  const lastTapRef = useRef<{ [idx: number]: number }>({});
  const usedVoiceRef = useRef(false);
  const sendVoiceRef = useRef<(spokenText: string) => void>(() => {});

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  };

  const { recording, isUserSpeaking, transcribing, speakingId, toggleRecording, speakText, stopSpeaking } = useVoiceChat({
    onTranscriptUpdate: (spokenText) => {
      usedVoiceRef.current = true;
      setText(spokenText);
    },
    onAutoSend: (spokenText) => {
      sendVoiceRef.current(spokenText);
    },
    onError: showToast,
  });

  const toggleStar = (idx: number) => {
    const target = msgs[idx];
    if (!target) return;
    const willBeStarred = !target.starred;

    const updated = msgs.map((m, i) => {
      if (i === idx) {
        return { ...m, starred: willBeStarred };
      }
      // If starring a bot response, also star its corresponding user message
      if (willBeStarred && target.role === "model" && i === idx - 1 && msgs[i]?.role === "user") {
        return { ...msgs[i], starred: true };
      }
      // If starring a user prompt, also star its immediate reply if present
      if (willBeStarred && target.role === "user" && i === idx + 1 && msgs[i]?.role === "model") {
        return { ...msgs[i], starred: true };
      }
      return m;
    });

    setMsgs(updated);

    // Persist ONLY starred messages in localStorage
    try {
      const starredOnly = updated.filter((m) => m.starred);
      localStorage.setItem(key, JSON.stringify(starredOnly));
    } catch { }

    if (willBeStarred) {
      showToast("Starred! Saved locally.");
    } else {
      showToast("Unstarred message.");
    }
  };

  const handleDoubleTap = (idx: number) => {
    const now = Date.now();
    const last = lastTapRef.current[idx] || 0;
    if (now - last < 350) {
      toggleStar(idx);
      lastTapRef.current[idx] = 0;
    } else {
      lastTapRef.current[idx] = now;
    }
  };

  const drawerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragDeltaYRef = useRef<number>(0);
  const isClosingRef = useRef(false);

  const key = `madbots:chat:${bot.id}`;

  // Dynamically resize textarea height to fit content (grows on Enter/wrap up to 3 lines, shrinks on delete)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, 38), 88);
    el.style.height = `${nextHeight}px`;
  }, [text]);

  const scrollToBottom = (smooth = true) => {
    const el = viewportRef.current;
    if (!el) return;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  };

  // Load only starred messages from storage on mount & run 1-second skeleton timer ONLY if there are starred messages
  useEffect(() => {
    let hasStarred = false;
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "[]");
      const starred = stored.filter((m: Msg) => m.starred);
      setMsgs(starred);
      hasStarred = starred.length > 0;
    } catch { }

    if (hasStarred) {
      setLoadingSkeleton(true);
      const timer = setTimeout(() => {
        setLoadingSkeleton(false);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setLoadingSkeleton(false);
    }
  }, [key]);

  // Animate drawer slowly upwards from bottom to top on mount
  useEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    const tween = gsap.fromTo(
      el,
      { y: "100%" },
      {
        y: 0,
        duration: 0.65,
        ease: "power3.out",
        onComplete: () => {
          scrollToBottom(false);
        },
      }
    );
    return () => {
      tween.kill();
    };
  }, []);

  // Only auto-scroll when the user sends a message (do NOT auto-scroll when an agent replies)
  useEffect(() => {
    if (!loadingSkeleton && msgs.length > 0 && msgs[msgs.length - 1]?.role === "user") {
      scrollToBottom(true);
    }
  }, [msgs.length, loadingSkeleton]);

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

  const send = async (overrideText?: string, baseMsgs?: Msg[], forceVoice = false) => {
    const q = (overrideText ?? text).trim();
    if (!q || busy) return;
    const wasVoice = forceVoice || (!overrideText && usedVoiceRef.current);
    usedVoiceRef.current = false;
    const sourceMsgs = baseMsgs ?? msgs;
    const next: Msg[] = [...sourceMsgs, { role: "user", text: q, t: Date.now() }];
    setMsgs(next);
    setText("");
    setBusy(true);

    let reply = "Unable to reach agent. Please try again.";
    let verified = false;
    let responseTime: string | undefined;
    let isError = false;
    let computedItems: unknown[] | undefined;
    try {
      // Saved/starred chats are stored only in localStorage for user viewing,
      // and NOT sent to the model for response generation.
      const activeUnstarredHistory = next.filter((m) => !m.starred);
      const messagesToSend =
        activeUnstarredHistory.length > 0 ? activeUnstarredHistory.slice(-4) : [{ role: "user", text: q }];
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: bot.id,
          level: s.levels[bot.id],
          messages: messagesToSend,
          customConfig: bot.customConfig,
        }),
      });
      const raw = await r.text();
      let d: any = null;
      try {
        d = JSON.parse(raw);
      } catch {
        // Non-JSON response (e.g., Vercel 500/504 HTML or plain text)
      }

      if (!d) {
        isError = true;
        reply = "Connection issue. Please try again.";
        showToast("Connection issue. Please try again.");
      } else {
        if (d.reply && String(d.reply).trim()) {
          reply = d.reply;
          if (/servers are busy|timed out/i.test(reply)) {
            isError = true;
          }
        } else if (d.error) {
          isError = true;
          reply = "Unable to respond right now. Please try again.";
        } else {
          isError = true;
          reply = "Received empty response. Please try again.";
        }
        if (d.verified) verified = true;
        if (d.responseTime) responseTime = d.responseTime;
        if (Array.isArray(d.computedItems) && d.computedItems.length > 0) {
          computedItems = d.computedItems;
        }
        if (typeof d.placeholderHint === "string" && d.placeholderHint) {
          setPlaceholderHint(d.placeholderHint);
        } else {
          setPlaceholderHint(null);
        }

        if (Array.isArray(d.fallbackEvents) && d.fallbackEvents.length > 0) {
          showToast("Primary busy, switching to backup...");
        }

        if (!r.ok) {
          isError = true;
          reply = "Unable to reach agent. Please try again.";
          showToast("Service unavailable. Please retry.");
        }
      }
    } catch {
      isError = true;
      reply = "Network error. Unable to reach agent.";
      showToast("Network error. Please try again.");
    }

    const all: Msg[] = [
      ...next,
      {
        role: "model",
        text: reply,
        t: Date.now(),
        verified,
        responseTime,
        ...(computedItems ? { computedItems } : {}),
        ...(isError ? { isError: true, retryPrompt: q } : {}),
      },
    ];
    setMsgs(all);
    setBusy(false);
    if (wasVoice && !isError && reply) {
      speakText(reply, `msg-${all.length - 1}`, bot.id);
    }
    try {
      // Persist ONLY starred messages in localStorage
      const starredOnly = all.filter((m) => m.starred);
      localStorage.setItem(key, JSON.stringify(starredOnly));
    } catch { }
  };
  sendVoiceRef.current = (spokenText: string) => {
    send(spokenText, undefined, true);
  };

  const handleRetry = (errorMsgIdx: number, prompt: string) => {
    if (busy) return;
    const pruned = msgs.filter((_, idx) => {
      if (idx === errorMsgIdx) return false;
      if (idx === errorMsgIdx - 1 && msgs[idx]?.role === "user" && msgs[idx]?.text === prompt) return false;
      return true;
    });
    send(prompt, pruned);
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
        : bot.id === "madrix-rehab"
          ? ["Shoulder pain during bench press", "Lower back tightness after deadlifts", "Knee pain on squats"]
          : ["Explain Binary Search in C++", "Debug my Python loop", "OOP 4 pillars in JS"];

  const botRowBg =
    bot.id === "madrix-macros"
      ? "bg-white dark:bg-[#1c1f24] border-r-[3px] border-r-emerald-500 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
      : bot.id === "bhima-coach"
        ? "bg-white dark:bg-[#1c1f24] border-r-[3px] border-r-orange-500 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
        : bot.id === "madrix-rehab"
          ? "bg-white dark:bg-[#1c1f24] border-r-[3px] border-r-sky-500 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
          : "bg-white dark:bg-[#1c1f24] border-r-[3px] border-r-[#0066ff] shadow-[0_2px_12px_rgba(0,0,0,0.03)]";

  const botAccentColor =
    bot.id === "madrix-macros"
      ? "#10b981"
      : bot.id === "bhima-coach"
        ? "#f97316"
        : bot.id === "madrix-rehab"
          ? "#0ea5e9"
          : "#0066ff";

  const isTypingActive = text.trim().length > 0;

  return (
    <div
      ref={drawerRef}
      data-testid="chat-sheet"
      className="absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+45px)] bottom-0 z-30 flex flex-col bg-transparent overflow-visible select-none"
    >
      {/* Top frame */}
      <div className="flex-1 min-h-0 flex flex-col rounded-t-[22px] pt-0 px-0 pb-0 max-w-3xl w-full mx-auto border-t-[3px] border-zinc-200 dark:border-zinc-700/80">
        <section
          aria-label={`Chat with ${bot.name}`}
          className="flex-1 min-h-0 flex flex-col relative overflow-hidden rounded-t-[19px] bg-white dark:bg-[#1a1b1e] madbots-graph-grid"
        >
          {/* Top Draggable Swipe Handle */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="shrink-0 z-30 pt-0 pb-0.5 touch-none cursor-grab active:cursor-grabbing"
          >
            {/* Centered Horizontal Swipe Bar */}
            <div className="flex justify-center">
              <button
                type="button"
                data-testid="ios-swipe-bar"
                aria-label="Swipe down or click to close chat"
                className="group w-36 h-3.5 flex items-center justify-center rounded-full focus:outline-none"
              >
                <span className="w-12 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-400 transition-colors" />
              </button>
            </div>
          </div>

          {bot.id === "madrix-macros" && (
            <MacroChiefV2Controls onSendMessage={(txt) => setText(txt)} />
          )}

          {/* Scrollable Message Viewport (Discord DM Layout, thin scrollbar) */}
          <div
            ref={viewportRef}
            className="flex-1 min-h-0 w-full pt-1 pb-[64px] overflow-y-auto madbots-thin-scrollbar select-text pl-[1px] pr-[4px]"
          >
            {loadingSkeleton ? (
              <ChatSkeletonList botId={bot.id} />
            ) : (
              <div className="flex flex-col items-start gap-[4px] w-full pb-1">
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
                      onClick={() => handleDoubleTap(idx)}
                      className={`group w-full flex flex-col gap-1 py-2 pr-2 pl-[1px] transition-colors text-left cursor-pointer select-text relative ${isUser
                        ? "bg-transparent"
                        : `${botRowBg} rounded-l-lg`
                        }`}
                    >
                      {/* Discord-style Reply Context above Bot Response */}
                      {!isUser && idx > 0 && msgs[idx - 1]?.role === "user" && (
                        <div className="flex items-center gap-1.5 pl-4 text-[11.5px] text-[var(--ui-muted)] leading-none mb-0.5">
                          <span className="w-4 h-2.5 border-l-2 border-t-2 border-zinc-400/50 dark:border-zinc-500/50 rounded-tl-[4px] shrink-0 translate-y-0.5" />
                          <span className="w-3.5 h-3.5 rounded-full bg-[#5865F2] text-white flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[9px] leading-none">person</span>
                          </span>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">@You</span>
                          <span className="truncate opacity-80">{msgs[idx - 1].text}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-3 w-full">
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
                        {/* Author Header Line with bot name, timing on same line, and star + copy on right with pb-[5px] */}
                        <div className="flex items-center justify-between w-full gap-2 pb-[5px]">
                          <div className="flex items-center gap-1.5 flex-wrap leading-none">
                            <span
                              className={`leading-none ${isUser
                                ? "font-semibold text-[14px] text-[var(--ui-text)]"
                                : "font-headline font-bold text-[15.5px] text-[#0066ff] dark:text-[#66a3ff] tracking-tight"
                                }`}
                            >
                              {isUser ? "You" : bot.name}
                            </span>
                            {!isUser && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[4px] bg-[#5865F2] text-white text-[9px] font-bold tracking-wide uppercase leading-none">
                                APP
                              </span>
                            )}
                            {!isUser && msg.verified && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#0066ff]/15 text-[#0066ff] dark:text-[#66a3ff] border border-[#0066ff]/25 text-[9px] font-bold leading-none">
                                <span className="material-symbols-outlined text-[10px]">verified</span>
                                <span>Verified</span>
                              </span>
                            )}
                            <span className="text-[11px] font-normal text-[var(--ui-muted)] tabular-nums leading-none">
                              Today at {timeStr}
                            </span>

                            {/* Response timing on the exact same line as bot name and timestamp */}
                            {!isUser && msg.responseTime && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--ui-muted)] font-mono leading-none select-none pl-0.5">
                                <span className="text-[9px] opacity-75">⚡</span>
                                <span>{msg.responseTime}</span>
                              </span>
                            )}

                            {msg.starred && (
                              <span className="inline-flex items-center text-amber-400 text-[11px] leading-none animate-in zoom-in-75 duration-200" title="Starred & Saved">
                                ⭐
                              </span>
                            )}
                          </div>

                          {/* Star and Three-Dot Menu (Copy + Voice Listen) at top-right */}
                          <div className="flex items-center gap-1 shrink-0 relative">
                            {/* Star Toggle Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStar(idx);
                              }}
                              aria-label={msg.starred ? "Unstar message" : "Star message"}
                              title={msg.starred ? "Unstar & remove from memory" : "Double-tap or click to star and save"}
                              className={`p-0.5 rounded text-[11px] flex items-center justify-center transition-all cursor-pointer ${msg.starred ? "opacity-100 scale-110" : "opacity-35 hover:opacity-100"
                                }`}
                            >
                              <span>{msg.starred ? "⭐" : "☆"}</span>
                            </button>

                            {/* Three-Dot Menu Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuIdx((prev) => (prev === idx ? null : idx));
                              }}
                              aria-label="Message actions"
                              className="opacity-65 hover:opacity-100 p-1 rounded-full text-[var(--ui-muted)] hover:text-[var(--ui-text)] hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer shrink-0"
                            >
                              <span className="material-symbols-outlined text-[16px] leading-none">more_vert</span>
                            </button>

                            {openMenuIdx === idx && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-6 z-40 min-w-[110px] rounded-xl bg-[var(--ui-card)] border border-[var(--ui-border)] shadow-lg p-1 flex flex-col gap-0.5"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    copyText(msg.text, idx);
                                    setOpenMenuIdx(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium text-[var(--ui-text)] hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 cursor-pointer text-left"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    {copiedId === idx ? "check" : "content_copy"}
                                  </span>
                                  <span>{copiedId === idx ? "Copied" : "Copy"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    speakText(msg.text, `msg-${idx}`, bot.id);
                                    setOpenMenuIdx(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium text-[var(--ui-text)] hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 cursor-pointer text-left"
                                >
                                  <span className="material-symbols-outlined text-[14px] text-[#0066ff]">
                                    {speakingId === `msg-${idx}` ? "stop_circle" : "volume_up"}
                                  </span>
                                  <span>{speakingId === `msg-${idx}` ? "Stop" : "Listen"}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Message Text (Josefin Sans bubble for User, Nunito + Rubik bold for Bot) */}
                        <div
                          className={`w-full min-w-0 space-y-2 text-left text-[14px] font-normal text-[var(--ui-text)] ${
                            isUser ? "mt-0.5 leading-[1.45]" : "mt-1 leading-relaxed"
                          }`}
                          style={{ fontFamily: isUser ? "var(--font-josefin)" : "var(--font-nunito)" }}
                        >
                          {(isUser ? msg.text.replace(/\n{2,}/g, "\n") : cleanReply(msg.text))
                            .split(/(```[\s\S]*?```)/g)
                            .map((segment, segIdx) => {
                              if (segment.startsWith("```") && segment.endsWith("```")) {
                                const lines = segment.slice(3, -3).split("\n");
                                const lang = lines[0]?.trim() || "CODE";
                                const codeBody = (lines[0]?.trim() ? lines.slice(1) : lines).join("\n").trim();
                                return <CodeBlock key={segIdx} code={codeBody} language={lang} />;
                              }
                              const trimmed = segment.trim();
                              if (!trimmed) return null;
                              return (
                                <div key={segIdx}>
                                  {isUser ? (
                                    <div className="inline-block max-w-full whitespace-pre-wrap px-3 py-2 rounded-2xl rounded-tl-[4px] bg-[#f2f3f5] dark:bg-[#2b2d31] border border-zinc-200/80 dark:border-white/10 shadow-xs">
                                      {trimmed}
                                    </div>
                                  ) : (
                                    <ChatMarkdown content={trimmed} accentColor={botAccentColor} />
                                  )}
                                </div>
                              );
                            })}

                          {!isUser && msg.computedItems && msg.computedItems.length > 0 && (
                            <button
                              type="button"
                              disabled={msg.loggedToToday}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const r = await fetch("/api/macros/log", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ items: msg.computedItems }),
                                });
                                if (r.ok) {
                                  setMsgs((prev) =>
                                    prev.map((m, i) => (i === idx ? { ...m, loggedToToday: true } : m))
                                  );
                                  showToast("Logged to today's meals!");
                                }
                              }}
                              className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer disabled:opacity-60"
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {msg.loggedToToday ? "check_circle" : "add_task"}
                              </span>
                              <span>{msg.loggedToToday ? "Logged today" : "Log to today's meals"}</span>
                            </button>
                          )}

                          {!isUser && msg.isError && msg.retryPrompt && (
                            <button
                              type="button"
                              onClick={() => handleRetry(idx, msg.retryPrompt!)}
                              disabled={busy}
                              className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-[var(--ui-muted)] hover:text-[#0066ff] hover:bg-[#0066ff]/10 transition-colors cursor-pointer disabled:opacity-40"
                              title="Retry message"
                            >
                              <span className="material-symbols-outlined text-[13px]">refresh</span>
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
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

          {/* Docked Bottom Liquid-Glass Interaction Unit */}
          <div className="absolute bottom-0 left-0 right-0 z-30 w-full px-1 pt-1 pb-1 bg-gradient-to-t from-white/90 via-white/45 to-transparent dark:from-[#1a1b1e]/90 dark:via-[#1a1b1e]/45 pointer-events-none">
            <div className="mx-auto max-w-xl flex flex-col gap-2 pointer-events-auto">

              {/* Unified Voice Amplifier Pulse (shown ONLY when user is actively speaking or TTS is playing) */}
              {(speakingId || isUserSpeaking) && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (speakingId) stopSpeaking();
                      else if (recording) toggleRecording();
                    }}
                    aria-label={speakingId ? "Stop voice playback" : "Stop voice recording"}
                    title={speakingId ? "Tap to stop speaking" : "Tap to stop recording"}
                    className="w-[40%] min-w-[140px] h-9 px-4 rounded-2xl bg-[#0066ff]/12 dark:bg-[#0066ff]/20 backdrop-blur-md border border-[#38bdf8]/40 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform animate-pulse"
                    style={{
                      boxShadow:
                        "0 0 18px rgba(0, 174, 255, 0.45), 0 0 6px rgba(0, 102, 255, 0.3)",
                    }}
                  >
                    {[280, 140, 40, 200, 80, 0, 80, 200, 40, 140, 280].map((delay, idx) => (
                      <span
                        key={idx}
                        className="w-[3px] h-4 rounded-full bg-gradient-to-t from-[#0066ff] via-[#00d4ff] to-[#38bdf8] madbots-amp-bar"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </button>
                </div>
              )}

              {/* Slash Command Hints when typing "/" */}
              {bot.id === "madrix-macros" && text.startsWith("/") && !text.includes(" ") && (
                <div className="mb-1 rounded-2xl bg-white/95 dark:bg-[#1e2028]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.12)] p-1.5 space-y-0.5">
                  {[
                    { cmd: "/Add ", label: "/Add", hint: "Add a food or meal to your table" },
                    { cmd: "/verify-macros", label: "/verify-macros", hint: "Recheck last calculation (4 passes)" },
                    { cmd: "/Update ", label: "/Update", hint: "Update an existing food or brand item" },
                    { cmd: "/Search ", label: "/Search", hint: "Search web for nutrition per 100g" },
                  ]
                    .filter((s) => s.label.toLowerCase().startsWith(text.trim().toLowerCase()))
                    .map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => {
                          setText(s.cmd);
                          textareaRef.current?.focus();
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 text-left cursor-pointer transition-colors"
                      >
                        <span className="text-[12.5px] font-bold text-[#0066ff] shrink-0">{s.label}</span>
                        <span className="text-[11px] text-[var(--ui-muted)] truncate">{s.hint}</span>
                      </button>
                    ))}
                </div>
              )}

              {/* Skills Popup */}
              {skillsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSkillsOpen(false)}
                  />
                  <div className="relative z-50 mb-1 w-64 rounded-2xl bg-white/90 dark:bg-[#1e2028]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-white/15 shadow-[0_12px_36px_rgba(0,0,0,0.16)] p-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-zinc-200/70 dark:border-white/10">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ui-muted)] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-amber-500">bolt</span>
                        Skills
                      </span>
                      <button
                        type="button"
                        onClick={() => setSkillsOpen(false)}
                        className="text-[var(--ui-muted)] hover:text-[var(--ui-text)] p-0.5 rounded-full cursor-pointer"
                        aria-label="Close skills"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={busy || loadingSkeleton}
                      onClick={() => {
                        setSkillsOpen(false);
                        const currentDraft = text.trim();
                        const lastUserMsg = [...msgs].reverse().find((m) => m.role === "user")?.text;
                        if (currentDraft) {
                          setText("");
                          send(
                            `Verify macros for this meal log (run 4 independent calculation passes, double-check against the database, and add "Verified ✓"):\n${currentDraft}`
                          );
                        } else if (lastUserMsg) {
                          send(
                            `Verify macros for my last meal log (run 4 independent calculation passes, double-check every item and total against the database, and add "Verified ✓"):\n${lastUserMsg}`
                          );
                        } else {
                          send(
                            `Verify macros: run 4 independent calculation passes for every macro total and add "Verified ✓" once they all match.`
                          );
                        }
                      }}
                      className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-100/90 dark:hover:bg-white/10 text-left transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[17px]">verified</span>
                      </span>
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-[var(--ui-text)] leading-tight">
                          Verify Macros
                        </div>
                        <div className="text-[10.5px] text-[var(--ui-muted)] leading-snug mt-0.5">
                          4-pass verification &amp; DB cross-check
                        </div>
                      </div>
                    </button>
                  </div>
                </>
              )}

              {/* Liquid-Glass Multi-line Input Capsule */}
              <div
                className="flex items-end gap-1 w-full overflow-hidden rounded-[24px] bg-white/70 dark:bg-[#1e2028]/70 backdrop-blur-md pl-[2px] pr-1 pb-1 pt-1 border border-zinc-300 dark:border-zinc-600/80 transition-all duration-200"
                style={{
                  borderColor: isTypingActive ? `${botAccentColor}99` : undefined,
                  boxShadow: isTypingActive
                    ? `0 10px 32px -4px ${botAccentColor}35, 0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.85)`
                    : "0 10px 32px -4px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.85)",
                }}
              >
                <button
                  type="button"
                  aria-label="Open skills"
                  title="Skills"
                  onClick={() => setSkillsOpen((prev) => !prev)}
                  className={`w-8 h-8 mb-0.5 rounded-[14px] flex items-center justify-center transition-all shrink-0 active:scale-90 cursor-pointer ${
                    skillsOpen
                      ? "bg-amber-500/15 text-amber-500"
                      : "text-[var(--ui-muted)] hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                </button>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (placeholderHint) setPlaceholderHint(null);
                  }}
                  onKeyDown={(e) => {
                    // Prevent form submission on Enter / return key. Enter adds a newline instead.
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.stopPropagation();
                    }
                  }}
                  disabled={loadingSkeleton}
                  placeholder={placeholderHint || `Message @${bot.name}`}
                  className="flex-1 min-w-0 bg-transparent border-0 text-[16px] font-normal text-[var(--ui-text)] placeholder-[var(--ui-muted)] focus:outline-none focus:ring-0 px-1 py-1.5 resize-none min-h-[38px] max-h-[88px] disabled:opacity-50 transition-[height] duration-75 overflow-y-auto leading-[24px]"
                  style={{ fontFamily: "var(--font-poppins)" }}
                />
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={busy || loadingSkeleton || transcribing}
                  aria-label={recording ? "Stop voice recording" : "Voice input"}
                  title={recording ? "Listening... tap to stop" : "Tap to speak"}
                  className={`relative w-9 h-9 mb-0.5 rounded-[14px] flex items-center justify-center transition-all shrink-0 active:scale-90 cursor-pointer disabled:opacity-40 ${
                    recording
                      ? "bg-red-500 text-white shadow-sm ring-4 ring-red-500/30"
                      : transcribing
                      ? "bg-amber-500/20 text-amber-500 animate-pulse"
                      : "text-[var(--ui-muted)] hover:text-[var(--ui-text)] hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  {recording && (
                    <span className="absolute inset-0 rounded-[14px] ring-2 ring-red-500 animate-ping opacity-75 pointer-events-none" />
                  )}
                  <span className="material-symbols-outlined text-[19px] relative z-10">
                    {recording ? "stop" : transcribing ? "graphic_eq" : "mic"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={busy || loadingSkeleton || !text.trim()}
                  aria-label="Send message"
                  className="w-9 h-9 mb-0.5 rounded-[14px] disabled:opacity-35 text-white flex items-center justify-center transition-all shrink-0 active:scale-90 shadow-sm cursor-pointer"
                  style={{ backgroundColor: botAccentColor }}
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Short single-line Toast Popups rendered directly on document.body */}
      {mounted && toasts.length > 0 && typeof document !== "undefined" && createPortal(
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center gap-1.5 max-w-[88vw] pointer-events-none px-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-zinc-900/90 dark:bg-zinc-800/95 text-white border border-white/10 shadow-md text-[11.5px] font-medium whitespace-nowrap truncate max-w-full flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="truncate">{toast.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
