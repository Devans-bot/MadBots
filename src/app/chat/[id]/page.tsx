"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import gsap from "gsap";
import { BOTS } from "@/lib/bots";
import { useSettings } from "@/lib/settings";

type Msg = {
  role: "user" | "model";
  text: string;
  t: number;
  verified?: boolean;
  responseTime?: string;
  starred?: boolean;
};

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bot = BOTS.find((b) => b.id === id);
  const { s } = useSettings();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loadingSkeleton, setLoadingSkeleton] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string }>>([]);
  const lastTapRef = useRef<{ [idx: number]: number }>({});

  const showToast = (message: string) => {
    const tid = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id: tid, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== tid));
    }, 4500);
  };

  const toggleStar = (idx: number) => {
    setMsgs((prev) => {
      const target = prev[idx];
      if (!target) return prev;
      const willBeStarred = !target.starred;

      const updated = prev.map((m, i) => {
        if (i === idx) {
          return { ...m, starred: willBeStarred };
        }
        if (willBeStarred && target.role === "model" && i === idx - 1 && prev[i]?.role === "user") {
          return { ...prev[i], starred: true };
        }
        if (willBeStarred && target.role === "user" && i === idx + 1 && prev[i]?.role === "model") {
          return { ...prev[i], starred: true };
        }
        return m;
      });

      try {
        const starredOnly = updated.filter((m) => m.starred);
        localStorage.setItem(key, JSON.stringify(starredOnly));
      } catch { }

      if (willBeStarred) {
        showToast("⭐ Starred! Saved to your chat memory.");
      } else {
        showToast("☆ Unstarred message.");
      }

      return updated;
    });
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
  const end = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const key = `madbots:chat:${id}`;

  // Dynamically resize textarea height to fit content (grows on Enter/wrap up to 3 lines, shrinks on delete)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, 38), 88);
    el.style.height = `${nextHeight}px`;
  }, [text]);

  // Load only starred messages from storage on mount & run 1-second skeleton timer ONLY if there are starred messages
  useEffect(() => {
    let hasStarred = false;
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "[]");
      const starred = stored.filter((m: Msg) => m.starred);
      setMsgs(starred);
      hasStarred = starred.length > 0;
    } catch {}

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

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".chat-sheet",
        { y: 120, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, ease: "power3.out", clearProps: "transform,opacity" }
      );
      gsap.fromTo(
        ".chat-dock",
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out", delay: 0.12, clearProps: "all" }
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!loadingSkeleton) {
      end.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [msgs, busy, loadingSkeleton]);

  if (!bot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white p-6">
        <div className="text-center">
          <p className="text-lg font-bold mb-3">Bot not found</p>
          <Link href="/" className="px-4 py-2 bg-white text-zinc-950 font-bold rounded-full text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const send = async (overrideText?: string) => {
    const q = (overrideText ?? text).trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", text: q, t: Date.now() }];
    setMsgs(next);
    setText("");
    setBusy(true);

    let reply = "Something went wrong. Try again.";
    let verified = false;
    let responseTime: string | undefined;
    try {
      // Saved/starred chats are stored only in localStorage for user viewing,
      // and NOT sent to the model for response generation.
      const activeUnstarredHistory = next.filter((m) => !m.starred);
      const messagesToSend =
        activeUnstarredHistory.length > 0 ? activeUnstarredHistory.slice(-4) : [{ role: "user", text: q }];
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: bot.id, level: s.levels[bot.id], messages: messagesToSend }),
      });
      const d = await r.json();
      if (d.reply && d.reply.trim()) {
        reply = d.reply;
      } else if (d.error) {
        reply = `Error: ${d.error}`;
      } else {
        reply = "Received empty response. Please try again.";
      }
      if (d.verified) verified = true;
      if (d.responseTime) responseTime = d.responseTime;

      if (Array.isArray(d.fallbackEvents) && d.fallbackEvents.length > 0) {
        d.fallbackEvents.forEach((ev: any, idx: number) => {
          setTimeout(() => {
            showToast(`⚠️ [${ev.stage}] ${ev.model}: ${ev.error} ➔ ${ev.nextAction}`);
          }, idx * 600);
        });
      }

      if (!r.ok) {
        showToast(`⚠️ Server error (${r.status}): ${d.reply || d.error || "Request failed"}`);
      }
    } catch (err) {
      showToast(`⚠️ Network error: ${err instanceof Error ? err.message : "Failed to contact chat server"}`);
    }

    const all: Msg[] = [...next, { role: "model", text: reply, t: Date.now(), verified, responseTime }];
    setMsgs(all);
    setBusy(false);
    try {
      const starredOnly = all.filter((m) => m.starred);
      localStorage.setItem(key, JSON.stringify(starredOnly));
    } catch {}
  };

  const copyText = (txt: string, idx: number) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(idx);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const sampleChips =
    bot.id === "madrix-macros"
      ? ["100g oats & 300ml milk", "2 whole eggs and 150g cooked rice", "verify-macros"]
      : bot.id === "bhima-coach"
      ? ["Desi Push/Pull/Legs split", "Calculate my 1RM (100kg x 5)", "High-protein vegetarian diet"]
      : ["Explain Binary Search in C++", "Debug my Python loop", "OOP 4 pillars in JS"];

  return (
    <div
      ref={pageRef}
      className="text-[var(--ui-text)] flex flex-col min-h-screen antialiased select-none font-sans"
      style={{
        background:
          "linear-gradient(rgb(26, 28, 28) 0%, rgb(43, 47, 56) 32%, rgb(229, 232, 236) 75%, rgb(249, 249, 248) 100%)",
        height: "100vh",
        maxHeight: "100dvh",
        overflow: "hidden",
        paddingTop: "0px",
      }}
    >
      {/* Header */}
      <header
        className="w-full px-5 flex items-center justify-between z-20 pt-safe"
        style={{ paddingTop: "15px", paddingBottom: "15px" }}
      >
        <Link href="/" className="flex items-center gap-1 cursor-pointer">
          <span className="text-white font-extrabold text-[22px] tracking-tight font-headline">MaDbotS</span>
          <span className="text-[#ff1493] font-bold text-[24px] leading-none select-none">*</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="Back to Bots"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <Link
            href="/settings"
            aria-label="Settings"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </Link>
        </div>
      </header>

      {/* Main Area: Chat Area (overlays header by 5px) */}
      <main
        className="flex-1 flex flex-col px-0 z-30"
        style={{
          marginTop: "-5px",
          paddingTop: "0px",
          background: "transparent",
          overflow: "hidden",
          flex: "1 1 0%",
          minHeight: 0,
          position: "relative",
        }}
      >
        <div
          className="chat-sheet flex-1 w-full bg-[var(--ui-card)] border-[var(--ui-border)] flex flex-col relative transition-all z-30 px-3 max-w-2xl mx-auto"
          style={{
            borderTopLeftRadius: "28px",
            borderTopRightRadius: "28px",
            boxShadow:
              "rgba(0, 210, 255, 0.45) 0px -8px 24px -4px, rgba(0, 210, 255, 0.3) 0px -2px 10px -1px, rgba(0, 0, 0, 0.08) 0px -8px 28px, rgba(0, 0, 0, 0.14) 0px 16px 36px, rgba(0, 0, 0, 0.05) 0px 2px 10px",
            paddingTop: "12px",
            paddingBottom: "160px",
            backgroundImage:
              "linear-gradient(to right, var(--ui-grid) 1px, transparent 1px), linear-gradient(var(--ui-grid) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            overflowY: "auto",
          }}
        >
          {/* Pill Handle */}
          <div className="bg-[#e2e2e2] rounded-full mx-auto mb-4" style={{ width: "72px", height: "6px" }}></div>

          {/* Bot Info Header in Chat Area (Sticky) */}
          <div className="sticky top-0 z-30 flex items-center justify-between pb-3.5 mb-5 border-b border-[var(--ui-border)] w-full mx-auto px-3 py-2.5 rounded-2xl bg-[var(--ui-card)]/95 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                {bot.avatar ? (
                  <img
                    src={bot.avatar}
                    alt={bot.name}
                    className="w-9 h-9 rounded-xl object-cover shadow-sm border border-white/20"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm border border-white/20"
                    style={{ background: bot.color }}
                  >
                    {bot.initial}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#28c840] border border-white"></span>
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[15px] text-[var(--ui-text)] leading-tight tracking-tight font-headline">
                    {bot.name}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--ui-muted)] truncate max-w-[200px]">{bot.tagline}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Active
              </span>
            </div>
          </div>

          {/* Message Flow */}
          <div className="flex flex-col gap-4 w-full mx-auto" style={{ paddingBottom: "32px" }}>
            {loadingSkeleton ? (
              <div className="flex flex-col gap-5 animate-pulse py-2">
                {/* Skeleton User Message */}
                <div className="flex flex-col items-end w-full pl-12">
                  <div className="h-11 w-48 rounded-2xl rounded-br-sm bg-zinc-200 dark:bg-zinc-700/70" />
                </div>
                {/* Skeleton Bot Reply */}
                <div className="flex flex-col items-start w-full pr-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-zinc-200 dark:bg-zinc-700/70" />
                    <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700/70" />
                  </div>
                  <div className="w-full rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-card-alt)] p-4 space-y-2.5">
                    <div className="h-3.5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700/70" />
                    <div className="h-3.5 w-full rounded bg-zinc-200 dark:bg-zinc-700/70" />
                    <div className="h-3.5 w-5/6 rounded bg-zinc-200 dark:bg-zinc-700/70" />
                  </div>
                </div>
                {/* Skeleton User Message 2 */}
                <div className="flex flex-col items-end w-full pl-12">
                  <div className="h-10 w-36 rounded-2xl rounded-br-sm bg-zinc-200 dark:bg-zinc-700/70" />
                </div>
                {/* Skeleton Bot Reply 2 */}
                <div className="flex flex-col items-start w-full pr-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-zinc-200 dark:bg-zinc-700/70" />
                    <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700/70" />
                  </div>
                  <div className="w-full rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-card-alt)] p-4 space-y-2.5">
                    <div className="h-3.5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700/70" />
                    <div className="h-3.5 w-4/5 rounded bg-zinc-200 dark:bg-zinc-700/70" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {msgs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
                    <span className="material-symbols-outlined text-[48px] text-zinc-300 mb-2">forum</span>
                    <p className="text-sm font-semibold text-zinc-700">Say hello to {bot.name}</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs">{bot.tagline}</p>
                  </div>
                )}

                {msgs.map((msg, idx) => {
              if (msg.role === "user") {
                return (
                  <div
                    key={idx}
                    onClick={() => handleDoubleTap(idx)}
                    className="flex flex-col items-end w-full pl-6 group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {msg.starred && (
                        <span className="text-[12px] text-amber-400">⭐</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(idx);
                        }}
                        className={`px-1 py-0.5 rounded text-[12px] cursor-pointer ${
                          msg.starred ? "text-amber-400 opacity-100" : "opacity-35 hover:opacity-100"
                        }`}
                      >
                        {msg.starred ? "⭐" : "☆"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyText(msg.text, idx);
                        }}
                        aria-label="Copy message"
                        className="opacity-70 hover:opacity-100 px-1.5 py-0.5 rounded text-[11px] text-[var(--ui-muted)] hover:text-white flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {copiedId === idx ? "check" : "content_copy"}
                        </span>
                        <span className="text-[10px] font-medium">
                          {copiedId === idx ? "Copied" : "Copy"}
                        </span>
                      </button>
                    </div>
                    <div className="bg-[#1a1c1c] text-white px-4 py-3 rounded-2xl rounded-br-sm shadow-sm max-w-[88%] text-[14px] leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  onClick={() => handleDoubleTap(idx)}
                  className="flex flex-col items-start w-full pr-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full mb-1.5 pb-[5px]">
                    <div className="flex items-center gap-2">
                      {bot.avatar ? (
                        <img
                          src={bot.avatar}
                          alt={bot.name}
                          className="w-5 h-5 rounded-md object-cover shadow-xs border border-zinc-200"
                        />
                      ) : (
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ background: bot.color }}
                        >
                          <span>{bot.initial}</span>
                        </div>
                      )}
                      <span className="text-[11px] font-semibold text-zinc-500">{bot.name}</span>
                      {msg.responseTime && (
                        <span className="text-[10px] text-[var(--ui-muted)] font-mono flex items-center gap-0.5 leading-none select-none pl-1">
                          <span className="text-[9px] opacity-75">⚡</span>
                          <span>{msg.responseTime}</span>
                        </span>
                      )}
                      {msg.verified && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#0066ff]/10 text-[#0066ff] border border-[#0066ff]/20 text-[10px] font-bold">
                          <span className="material-symbols-outlined text-[12px]">verified</span>
                          <span>Verified</span>
                        </span>
                      )}
                      {msg.starred && (
                        <span className="text-[12px] text-amber-400">⭐</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(idx);
                        }}
                        className={`p-0.5 rounded text-[11px] cursor-pointer ${
                          msg.starred ? "text-amber-400 opacity-100" : "opacity-35 hover:opacity-100"
                        }`}
                      >
                        {msg.starred ? "⭐" : "☆"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyText(msg.text, idx);
                        }}
                        aria-label="Copy message"
                        className="opacity-60 hover:opacity-100 px-1 py-0.5 rounded text-[9.5px] text-[var(--ui-muted)] hover:text-white flex items-center gap-0.5 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[10px] leading-none">
                          {copiedId === idx ? "check" : "content_copy"}
                        </span>
                        <span className="text-[9px] font-medium leading-none">
                          {copiedId === idx ? "Copied" : "Copy"}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div
                    className="bg-[var(--ui-card-alt)] border border-[var(--ui-border)] rounded-2xl p-4 w-full flex flex-col gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                    style={{ borderRadius: "20px" }}
                  >
                    <div className="text-[14px] leading-relaxed text-[var(--ui-text)] font-sans space-y-3">
                      {msg.text.split(/(```[\s\S]*?```)/g).map((segment, segIdx) => {
                        if (segment.startsWith("```") && segment.endsWith("```")) {
                          const lines = segment.slice(3, -3).split("\n");
                          const lang = lines[0]?.trim() || "CODE";
                          const codeBody = (lines[0]?.trim() ? lines.slice(1) : lines).join("\n").trim();
                          return (
                            <div
                              key={segIdx}
                              className="bg-white border border-[#e2e4ea] rounded-xl overflow-hidden shadow-sm my-1"
                            >
                              <div className="flex items-center justify-between px-3.5 py-2 bg-[#f3f4f3] border-b border-[#e8e8e7]">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] border border-[#e0443e]/40" />
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e] border border-[#d89e24]/40" />
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840] border border-[#1aab29]/40" />
                                </div>
                                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-white text-[#727687] border border-[#e2e2e2]">
                                  {lang}
                                </span>
                              </div>
                              <pre className="font-mono text-[12px] leading-relaxed text-[#1a1c1c] p-3.5 overflow-x-auto bg-white">
                                <code>{codeBody}</code>
                              </pre>
                            </div>
                          );
                        }
                        const trimmed = segment.trim();
                        if (!trimmed) return null;
                        return (
                          <div key={segIdx} className="whitespace-pre-wrap">
                            {trimmed}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-end pt-2 border-t border-[#e8e8e7]">
                      <button
                        type="button"
                        onClick={() => copyText(msg.text, idx)}
                        className="py-1 px-2.5 rounded-lg bg-white hover:bg-[#f3f4f3] border border-[#e2e4ea] text-[#1a1c1c] text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[14px] text-[#727687]">
                          {copiedId === idx ? "check" : "content_copy"}
                        </span>
                        <span>{copiedId === idx ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

                {busy && (
                  <div className="flex flex-col items-start w-full pr-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white animate-pulse"
                        style={{ background: bot.color }}
                      >
                        <span>{bot.initial}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-400">{bot.name} is thinking...</span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={end} />
          </div>
        </div>
      </main>

      {/* Docked Bottom Interaction Unit */}
      <div
        className="chat-dock bottom-0 left-0 right-0 z-50 w-full text-white px-4 pt-2 pb-safe fixed"
        style={{
          paddingTop: "14px",
          paddingBottom: "16px",
          background:
            "linear-gradient(rgba(26, 28, 28, 0) 0%, rgba(26, 28, 28, 0.85) 30%, rgba(26, 28, 28, 0.98) 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto max-w-xl flex flex-col gap-2">
          {/* Quick Suggestions Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
            {sampleChips.map((chip, i) => (
              <button
                key={i}
                type="button"
                onClick={() => send(chip)}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 text-white/90 text-[12px] font-medium border border-white/10 whitespace-nowrap transition-all active:scale-95 shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Unit */}
          <div className="flex items-end gap-1.5 bg-white/10 border border-white/15 rounded-[22px] px-1 py-1.5 shadow-sm">
            <button
              type="button"
              aria-label="Add context"
              onClick={() => alert(`Active model: ${bot.name}`)}
              className="w-8 h-8 mb-0.5 rounded-full text-white/70 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-90"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.stopPropagation();
                }
              }}
              placeholder={`Ask ${bot.name}...`}
              className="flex-1 bg-transparent border-0 text-[16px] text-white placeholder-white/50 focus:outline-none focus:ring-0 px-1 py-1.5 resize-none min-h-[38px] max-h-[88px] transition-[height] duration-75 overflow-y-auto leading-[24px]"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={busy || !text.trim()}
              aria-label="Send message"
              className="w-8 h-8 mb-0.5 rounded-full bg-[#0066ff] hover:bg-[#0050cb] disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0 active:scale-90 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            </button>
          </div>
        </div>

        {/* Fallback Error Toast Popups (Test Only) */}
        {toasts.length > 0 && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 max-w-[92vw] sm:max-w-md w-full pointer-events-none px-3">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className="pointer-events-auto w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/95 text-amber-300 border border-amber-500/50 shadow-2xl backdrop-blur-md text-[11.5px] font-mono leading-snug flex items-start gap-2"
              >
                <span className="text-[14px] shrink-0 mt-0.5">⚠️</span>
                <div className="flex-1 min-w-0 break-words">{toast.message}</div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
  );
}
