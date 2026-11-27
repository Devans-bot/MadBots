"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { Bot } from "@/lib/bots";

interface AddAgentDrawerProps {
  onClose: () => void;
  onCreate: (created: Bot) => void;
}

export function AddAgentDrawer({ onClose, onCreate }: AddAgentDrawerProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [fallbackModel, setFallbackModel] = useState("");
  const [soul, setSoul] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [color, setColor] = useState("#0066ff");

  const drawerRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragDeltaYRef = useRef<number>(0);
  const isClosingRef = useRef(false);

  // Slide upwards from bottom to top (identical to ChatDrawer & SettingsDrawer)
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
      if (drawerRef.current) {
        gsap.to(drawerRef.current, { y: 0, duration: 0.25, ease: "power2.out" });
      }
    } else {
      animateClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const id =
      trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);
    const created: Bot = {
      id,
      name: trimmedName,
      tagline: description.trim() || "Custom AI assistant ready to help.",
      initial: trimmedName.charAt(0).toUpperCase(),
      color,
      level: "medium",
      customConfig: {
        apiKey: apiKey.trim(),
        model: model.trim() || "gemini-3.5-flash",
        fallbackModel: fallbackModel.trim() || "gemini-3.1-flash-lite",
        soul: soul.trim(),
        visibility,
      },
    };

    onCreate(created);
    animateClose();
  };

  return (
    <div
      ref={drawerRef}
      data-testid="add-agent-sheet"
      className="fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+53px)] bottom-0 z-40 flex flex-col bg-transparent overflow-visible select-none"
    >
      <div className="flex-1 min-h-0 flex flex-col rounded-t-[30px] pt-[2px] px-[1.5px] pb-0 madbots-chat-neon-frame max-w-3xl w-full mx-auto">
        <section
          aria-label="Add New Agent"
          className="flex-1 min-h-0 flex flex-col relative overflow-hidden rounded-t-[28px] bg-[var(--ui-sheet)]"
        >
          {/* Top Draggable Swipe Handle */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="shrink-0 z-30 pt-1 pb-2 touch-none cursor-grab active:cursor-grabbing"
          >
            <div className="flex justify-center">
              <button
                type="button"
                aria-label="Swipe down or click to close Add Agent"
                className="group w-36 h-6 flex items-center justify-center rounded-full focus:outline-none"
              >
                <span className="w-14 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-400 transition-colors" />
              </button>
            </div>

            <div className="w-[95%] mx-auto flex items-center justify-between px-3 py-2 rounded-2xl bg-[var(--ui-card)]/95 border border-[var(--ui-border)]">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
                  style={{ background: color }}
                >
                  {name.trim() ? name.trim().charAt(0).toUpperCase() : "+"}
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-[var(--ui-text)] font-headline leading-tight">
                    Add New Agent
                  </h2>
                  <p className="text-[11px] text-[var(--ui-muted)]">
                    Configure persona, key, and model
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  animateClose();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ui-muted)] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          {/* Scrollable Form Content */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 min-h-0 overflow-y-auto px-4 pt-2 pb-10 space-y-4 select-text"
          >
            <div className="bg-[var(--ui-card)] p-4 rounded-2xl border border-[var(--ui-border)] shadow-sm space-y-3.5">
              {/* Agent Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ui-muted)] mb-1">
                  Agent Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this agent does..."
                  className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] px-3 py-2 text-[16px] text-[var(--ui-text)] focus:outline-none focus:border-[#0066ff]"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ui-muted)] mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza... or AQ..."
                  className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] px-3 py-2 text-[16px] text-[var(--ui-text)] focus:outline-none focus:border-[#0066ff]"
                />
                <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Session-only: your API key is kept in memory for this session only, never saved to localStorage or logged. Use a separate key to isolate rate limits.
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
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Enter model ID"
                    className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] px-3 py-2 text-[15px] font-mono text-[var(--ui-text)] focus:outline-none focus:border-[#0066ff]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ui-muted)] mb-1">
                    Fallback Model
                  </label>
                  <input
                    type="text"
                    value={fallbackModel}
                    onChange={(e) => setFallbackModel(e.target.value)}
                    placeholder="Enter fallback ID"
                    className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] px-3 py-2 text-[15px] font-mono text-[var(--ui-text)] focus:outline-none focus:border-[#0066ff]"
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
                  value={soul}
                  onChange={(e) => setSoul(e.target.value)}
                  placeholder={`# Soul & System Instructions\n\n## 1. Identity\nDefine who this agent is, its tone, and persona...\n\n## 2. Scope & Rules\nList what topics it should answer and what to refuse...\n\n## 3. Response Format\nSpecify how replies should be structured...`}
                  className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-sheet)] px-3 py-2 text-[15px] font-mono text-[var(--ui-text)] focus:outline-none focus:border-[#0066ff] resize-y"
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ui-muted)] mb-1.5">
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--ui-sheet)] p-1 border border-[var(--ui-border)]">
                  <button
                    type="button"
                    onClick={() => setVisibility("public")}
                    className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      visibility === "public"
                        ? "bg-[#0066ff] text-white shadow-xs"
                        : "text-[var(--ui-muted)]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">public</span>
                    <span>Public</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility("private")}
                    className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      visibility === "private"
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
                <div className="flex items-center gap-2.5">
                  {["#0066ff", "#ff2b85", "#10b981", "#f59e0b", "#8b5cf6"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        color === c ? "scale-115 ring-2 ring-offset-2 ring-zinc-400" : ""
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-full bg-[#0066ff] hover:bg-[#0050cb] text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Create Agent</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
