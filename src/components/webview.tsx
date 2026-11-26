"use client";

import React, { useState, useRef } from "react";
import { BOTS, type Bot } from "@/lib/bots";

type WebAgentMeta = {
  bot: Bot;
  modelBadge: string;
  tierBadge: string;
  roleTitle: string;
  latencyText: string;
  statusColor: string;
  timeAgo: string;
  tagLeft: string;
  tagRight?: string;
  unreadCount?: number;
  unreadBg?: string;
  accentType: "blue" | "pink";
  suggestions: { icon: string; iconColor: string; label: string }[];
};

const AGENT_METADATA: Record<string, Omit<WebAgentMeta, "bot">> = {
  "madrix-macros": {
    modelBadge: "Qwen 3.8 27B",
    tierBadge: "Pro Active",
    roleTitle: "Personal Nutrition Intelligence",
    latencyText: "180ms response",
    statusColor: "bg-emerald-500",
    timeAgo: "Just now",
    tagLeft: "Macros & DB",
    tagRight: "180ms",
    unreadCount: 1,
    unreadBg: "bg-[#0066ff] text-white",
    accentType: "blue",
    suggestions: [
      { icon: "restaurant", iconColor: "text-[#0050cb]", label: "200g chicken breast + 200g cooked rice" },
      { icon: "verified", iconColor: "text-[#b7004f]", label: "verify-macros" },
      { icon: "edit_note", iconColor: "text-[#5a5959]", label: "Update paneer to 280 kcal, 20g protein" },
    ],
  },
  "bhima-coach": {
    modelBadge: "GPT-OSS 120B",
    tierBadge: "Standard",
    roleTitle: "Desi Akhada & Strength Coach",
    latencyText: "240ms response",
    statusColor: "bg-amber-400",
    timeAgo: "4m ago",
    tagLeft: "PRs & Khurak",
    tagRight: "240ms",
    unreadCount: 3,
    unreadBg: "bg-[#b7004f] text-white",
    accentType: "pink",
    suggestions: [
      { icon: "fitness_center", iconColor: "text-[#0050cb]", label: "Calculate 1RM for 100kg x 5 bench" },
      { icon: "bolt", iconColor: "text-[#b7004f]", label: "4-day upper/lower hypertrophy split" },
      { icon: "monitor_weight", iconColor: "text-[#5a5959]", label: "Check BMI for 78kg at 5ft 10in" },
    ],
  },
  "madrix-codes": {
    modelBadge: "GPT-OSS 20B",
    tierBadge: "Pro Active",
    roleTitle: "Full-Stack & Systems Specialist",
    latencyText: "92ms response",
    statusColor: "bg-emerald-500",
    timeAgo: "1m ago",
    tagLeft: "<> TypeScript / C++",
    tagRight: "92ms",
    accentType: "blue",
    suggestions: [
      { icon: "auto_fix_high", iconColor: "text-[#0050cb]", label: "Explain workgroup shared memory" },
      { icon: "grid_4x4", iconColor: "text-[#b7004f]", label: "Add spatial hash grid" },
      { icon: "speed", iconColor: "text-[#5a5959]", label: "Benchmark WebGPU FPS" },
    ],
  },
};

const THINKING_STOPS = [
  { label: "Low • Quick responses", short: "Quick fixes", width: "8%", name: "Low" },
  { label: "Medium • Balanced speed", short: "Balanced logic", width: "38%", name: "Medium" },
  { label: "High • Extended reasoning", short: "Deep analysis", width: "72%", name: "High" },
  { label: "Max • Maximum depth", short: "Formal depth", width: "100%", name: "Max" },
];

export default function WebView() {
  const [activeView, setActiveView] = useState<"workspace" | "settings">("workspace");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [inputPlaceholder, setInputPlaceholder] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [extraMessages, setExtraMessages] = useState<Record<string, { text: string; time: string }[]>>({});

  // Settings View State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [thinkingStops, setThinkingStops] = useState<Record<string, number>>({
    "madrix-macros": 1,
    "bhima-coach": 2,
    "madrix-codes": 2,
  });
  const [savePillText, setSavePillText] = useState("Saved! ✓");
  const [isSaveHighlighted, setIsSaveHighlighted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const enrichedAgents: WebAgentMeta[] = BOTS.map((bot) => ({
    bot,
    ...(AGENT_METADATA[bot.id] ?? {
      modelBadge: "Gemini 3.5",
      tierBadge: "Standard",
      roleTitle: "Custom AI Agent",
      latencyText: "150ms response",
      statusColor: "bg-emerald-500",
      timeAgo: "Now",
      tagLeft: "Custom",
      accentType: "blue" as const,
      suggestions: [{ icon: "auto_fix_high", iconColor: "text-[#0050cb]", label: "Summarize my notes" }],
    }),
  }));

  const filteredAgents = enrichedAgents.filter(
    ({ bot }) =>
      bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bot.tagline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeMeta = selectedAgentId
    ? enrichedAgents.find((b) => b.bot.id === selectedAgentId) ?? null
    : null;
  const activeAgent = activeMeta?.bot ?? null;

  const triggerSavePill = (text = "Saved! ✓") => {
    setSavePillText(text);
    setIsSaveHighlighted(true);
    setTimeout(() => setIsSaveHighlighted(false), 1200);
  };

  const handleCopyCode = () => {
    const codeText = `struct Particle {
  position : vec2<f32>,
  velocity : vec2<f32>,
  mass     : f32,
  radius   : f32,
};`;
    navigator.clipboard?.writeText(codeText).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleSend = () => {
    if (!activeAgent) return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setExtraMessages((prev) => ({
      ...prev,
      [activeAgent.id]: [...(prev[activeAgent.id] ?? []), { text: trimmed, time }],
    }));
    setInputValue("");
    setInputPlaceholder(`Dispatching to ${activeAgent.name}...`);
    setTimeout(() => setInputPlaceholder(null), 1500);
  };

  const handleResetDefaults = () => {
    setThinkingStops({
      "madrix-macros": 1,
      "bhima-coach": 2,
      "madrix-codes": 2,
    });
    setIsDarkMode(false);
    triggerSavePill("Defaults restored");
  };

  return (
    <div
      className={`font-['Inter',sans-serif] text-[15px] antialiased min-h-screen selection:bg-[#ffd9df] selection:text-[#3f0017] transition-colors duration-200 ${
        isDarkMode ? "bg-[#141618] text-[#f4f4f6]" : "bg-[#f9f9f8] text-[#1a1c1c]"
      }`}
    >
      {/* Fixed Top Navigation Header (Solid opaque, no status-bar blur) */}
      <header
        className={`fixed top-0 left-0 right-0 h-16 shadow-[0_1px_8px_rgba(0,0,0,0.03)] z-50 transition-colors ${
          isDarkMode ? "bg-[#1c1f24] border-b border-[#2a3040]" : "bg-white"
        }`}
      >
        <div className="w-full px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveView("workspace")}
              className="flex items-center gap-2 select-none group cursor-pointer"
            >
              <img
                src="/icon-512.jpg"
                alt="MaDbotS"
                className="w-7 h-7 rounded-[7px] object-cover border border-zinc-300 shadow-xs"
              />
              <span
                className={`font-['Plus_Jakarta_Sans',sans-serif] text-[20px] leading-7 tracking-tight font-bold ${
                  isDarkMode ? "text-white" : "text-[#1a1c1c]"
                }`}
              >
                MaDbotS
                <span className="text-[#e40a65] font-extrabold ml-0.5 inline-block transition-transform group-hover:rotate-12">
                  *
                </span>
              </span>
            </button>

            <div className={`h-4 w-px ${isDarkMode ? "bg-[#2a3040]" : "bg-[#e2e2e2]"}`} />

            <nav className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveView("workspace")}
                className={`px-2.5 py-1.5 rounded-lg text-[14px] transition-colors cursor-pointer ${
                  activeView === "workspace"
                    ? isDarkMode
                      ? "bg-[#2a3040] text-white font-semibold"
                      : "bg-[#eeeeed] text-[#1a1c1c] font-semibold"
                    : isDarkMode
                    ? "text-zinc-400 font-medium hover:bg-[#2a3040]/50 hover:text-white"
                    : "text-[#424656] font-medium hover:bg-[#f3f4f3] hover:text-[#1a1c1c]"
                }`}
              >
                Agents Workspace
              </button>
              <button
                type="button"
                onClick={() => setActiveView("settings")}
                className={`px-2.5 py-1.5 rounded-lg text-[14px] transition-colors cursor-pointer ${
                  activeView === "settings"
                    ? isDarkMode
                      ? "bg-[#2a3040] text-white font-semibold"
                      : "bg-[#eeeeed] text-[#1a1c1c] font-semibold"
                    : isDarkMode
                    ? "text-zinc-400 font-medium hover:bg-[#2a3040]/50 hover:text-white"
                    : "text-[#424656] font-medium hover:bg-[#f3f4f3] hover:text-[#1a1c1c]"
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveView("workspace");
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                  isDarkMode
                    ? "text-zinc-400 hover:bg-[#2a3040] hover:text-white"
                    : "text-[#424656] hover:bg-[#f3f4f3] hover:text-[#1a1c1c]"
                }`}
                title="Search"
              >
                <span className="material-symbols-outlined text-[20px]">search</span>
              </button>
              <button
                type="button"
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                  isDarkMode
                    ? "text-zinc-400 hover:bg-[#2a3040] hover:text-white"
                    : "text-[#424656] hover:bg-[#f3f4f3] hover:text-[#1a1c1c]"
                }`}
                title="Shortcuts"
              >
                <span className="material-symbols-outlined text-[20px]">keyboard_command_key</span>
              </button>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#0050cb] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* VIEW 1: AGENTS WORKSPACE */}
      {activeView === "workspace" && (
        <main className={`relative pt-16 min-h-screen ${isDarkMode ? "bg-[#141618]" : "bg-[#f9f9f8]"}`}>
          <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
            {/* LEFT COLUMN: Agents Directory / List Pane (390px fixed width) */}
            <aside
              className={`flex-shrink-0 flex flex-col relative z-10 shadow-[1px_0_12px_rgba(0,0,0,0.03)] w-[390px] ${
                isDarkMode ? "bg-[#1c1f24]" : "bg-white"
              }`}
            >
              {/* Subtle Neo-Brutalist Doodle Vector Accents Floating in Background */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 select-none">
                <svg
                  className={`absolute top-20 right-4 w-20 h-20 ${isDarkMode ? "text-zinc-500" : "text-[#1a1c1c]"}`}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                  viewBox="0 0 100 100"
                >
                  <path d="M20,35 Q28,15 50,18 T80,35 Q86,60 50,75 T20,35 Z" strokeDasharray="2 3" />
                  <path d="M42,42 L42,46 M58,42 L58,46" strokeWidth="3" />
                  <path d="M38,58 Q50,66 62,58" />
                </svg>
                <svg
                  className="absolute bottom-24 -left-4 w-28 h-28 text-[#e40a65] opacity-25"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                  viewBox="0 0 120 120"
                >
                  <path d="M30,30 L15,48 L30,66" />
                  <path d="M50,70 L65,26" />
                  <path d="M85,30 L100,48 L85,66" />
                </svg>
                <svg
                  className="absolute top-72 right-6 w-14 h-14 text-[#0066ff] opacity-30 rotate-12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 60 60"
                >
                  <path d="M30,5 L34,22 L51,26 L36,36 L40,53 L27,42 L13,51 L19,34 L6,24 L24,22 Z" />
                </svg>
              </div>

              {/* Left Column Header */}
              <div
                className={`p-6 pb-4 relative flex flex-col gap-1 z-10 backdrop-blur-sm ${
                  isDarkMode ? "bg-[#1c1f24]/80" : "bg-white/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`font-['Plus_Jakarta_Sans',sans-serif] text-[17px] leading-tight font-extrabold tracking-tight ${
                          isDarkMode ? "text-white" : "text-[#1a1c1c]"
                        }`}
                      >
                        Talk. Think.
                      </span>
                      <span
                        className={`relative font-['Plus_Jakarta_Sans',sans-serif] text-[17px] leading-tight font-extrabold tracking-tight ml-0.5 ${
                          isDarkMode ? "text-white" : "text-[#1a1c1c]"
                        }`}
                      >
                        Build.
                        {/* Signature Pink Wavy Doodle Underline */}
                        <svg
                          className="absolute -bottom-2.5 left-0 w-[108%] h-2.5 text-[#e40a65] overflow-visible pointer-events-none"
                          fill="none"
                          viewBox="0 0 54 10"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M1 5.5C4.5 2 8 8 13 4.5C18 1.5 22 8 27 5C32 2 36.5 8 41 5C45.5 2 49.5 7.5 53 4"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeWidth="2.5"
                          />
                        </svg>
                      </span>
                    </div>
                    <span className="text-[12px] font-semibold tracking-[0.02em] text-[#5a5959] mt-2">
                      Active intelligence runtime
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        isDarkMode
                          ? "bg-[#2a3040] text-zinc-300 hover:bg-[#353d52]"
                          : "bg-[#f3f4f3] hover:bg-[#eeeeed] text-[#424656]"
                      }`}
                      title="Filter agents"
                    >
                      <span className="material-symbols-outlined text-[19px]">filter_list</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView("settings")}
                      className="w-8 h-8 rounded-lg bg-[#0050cb] text-white flex items-center justify-center shadow-sm hover:brightness-110 transition-all cursor-pointer"
                      title="Configure agents"
                    >
                      <span className="material-symbols-outlined text-[19px]">edit_square</span>
                    </button>
                  </div>
                </div>

                {/* Minimal Search Box */}
                <div className="mt-2 relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#5a5959] text-[18px]">
                    search
                  </span>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-8 py-2 text-[13px] rounded-lg focus:outline-none transition-all placeholder:text-[#5a5959] shadow-inner ${
                      isDarkMode
                        ? "bg-[#141618] text-white focus:bg-[#191c21]"
                        : "bg-[#f3f4f3] text-[#1a1c1c] focus:bg-white"
                    }`}
                    placeholder="Search conversations & agents..."
                    type="text"
                  />
                  <span
                    className={`absolute right-2.5 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                      isDarkMode ? "bg-[#2a3040] text-zinc-400" : "bg-[#eeeeed] text-[#5a5959]"
                    }`}
                  >
                    /
                  </span>
                </div>
              </div>

              {/* Agent Feed List */}
              <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2 relative z-10">
                {filteredAgents.map(
                  ({ bot, modelBadge, statusColor, timeAgo, tagLeft, tagRight, unreadCount, unreadBg }) => {
                    const isSelected = bot.id === activeAgent?.id;
                    return (
                      <div
                        key={bot.id}
                        onClick={() => setSelectedAgentId(bot.id)}
                        className={`group relative p-3.5 rounded-[10px] cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? isDarkMode
                              ? "bg-[#22262e] shadow-[0_0_0_1.5px_#0066ff,0_4px_16px_rgba(0,102,255,0.22)] translate-x-0.5"
                              : "bg-white shadow-[0_0_0_1.5px_#0066ff,0_4px_16px_rgba(0,102,255,0.16)] translate-x-0.5"
                            : isDarkMode
                            ? "bg-[#171a21] hover:bg-[#22262e]/70"
                            : "bg-white hover:bg-[#f3f4f3]/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            {bot.avatar ? (
                              <img
                                alt={bot.name}
                                src={bot.avatar}
                                className="w-11 h-11 rounded-full object-cover shadow-sm ring-1 ring-[#d1d5db]"
                              />
                            ) : (
                              <div
                                className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white shadow-sm ring-1 ring-[#d1d5db]"
                                style={{ background: bot.color }}
                              >
                                {bot.initial}
                              </div>
                            )}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${statusColor} rounded-full ring-2 ring-white`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h3
                                  className={`font-['Plus_Jakarta_Sans',sans-serif] text-[14.5px] leading-tight font-bold truncate ${
                                    isDarkMode ? "text-white" : "text-[#1a1c1c]"
                                  }`}
                                >
                                  {bot.name}
                                </h3>
                                <span className="px-1.5 py-0.5 rounded bg-[#dae1ff] text-[#001849] text-[10.5px] font-semibold tracking-tight shrink-0">
                                  {modelBadge}
                                </span>
                              </div>
                              <span className="text-[11px] font-medium text-[#5a5959] flex-shrink-0">
                                {timeAgo}
                              </span>
                            </div>

                            <p
                              className={`text-[12.5px] leading-snug font-medium truncate mb-2.5 ${
                                isDarkMode ? "text-zinc-400" : "text-[#424656]"
                              }`}
                            >
                              {bot.tagline}
                            </p>

                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold ${
                                    isDarkMode ? "bg-[#2a3040] text-zinc-200" : "bg-[#eeeeed] text-[#1a1c1c]"
                                  }`}
                                >
                                  {tagLeft}
                                </span>
                                {tagRight && (
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-medium ${
                                      isDarkMode ? "bg-[#1e2330] text-zinc-400" : "bg-[#f3f4f3] text-[#5a5959]"
                                    }`}
                                  >
                                    {tagRight}
                                  </span>
                                )}
                              </div>
                              {unreadCount && (
                                <span
                                  className={`w-5 h-5 flex items-center justify-center rounded-full ${
                                    unreadBg || "bg-[#0066ff] text-white"
                                  } text-[11px] font-bold shadow-sm`}
                                >
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </aside>

            {/* RIGHT COLUMN: Empty State OR Active Chat Screen */}
            <section
              className={`flex-1 flex flex-col min-w-0 relative overflow-hidden ${
                isDarkMode ? "bg-[#141618]" : "bg-[#f9f9f8]"
              }`}
            >
              {!activeAgent || !activeMeta ? (
                /* Empty State on Page Load */
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center select-none">
                  <div className="relative mb-5">
                    <div
                      className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm border ${
                        isDarkMode
                          ? "bg-[#1c1f24] border-[#2a3040] text-[#5b82e8]"
                          : "bg-white border-[#e2e2e2] text-[#0050cb]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[42px]">smart_toy</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#e40a65] text-white flex items-center justify-center shadow-md ring-2 ring-[#f9f9f8]">
                      <span className="material-symbols-outlined text-[17px]">chat_bubble</span>
                    </div>
                  </div>
                  <h2
                    className={`font-['Plus_Jakarta_Sans',sans-serif] text-[22px] font-bold tracking-tight ${
                      isDarkMode ? "text-white" : "text-[#1a1c1c]"
                    }`}
                  >
                    Select an agent to explore
                  </h2>
                  <p className="text-[14px] text-[#5a5959] mt-1.5 max-w-sm">
                    Pick an agent from the left directory to start a conversation or inspect live telemetry.
                  </p>
                </div>
              ) : (
                <>
                  {/* Chat Header Bar */}
                  <header
                    className={`h-16 px-6 backdrop-blur-md flex items-center justify-between z-20 shadow-[0_1px_8px_rgba(0,0,0,0.02)] ${
                      isDarkMode ? "bg-[#1c1f24]/90 border-b border-[#2a3040]" : "bg-white/90"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        {activeAgent.avatar ? (
                          <img
                            alt={activeAgent.name}
                            src={activeAgent.avatar}
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-[#d1d5db]"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ring-1 ring-[#d1d5db]"
                            style={{ background: activeAgent.color }}
                          >
                            {activeAgent.initial}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${activeMeta.statusColor} rounded-full ring-2 ring-white`}
                        />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <h2
                            className={`font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-extrabold truncate ${
                              isDarkMode ? "text-white" : "text-[#1a1c1c]"
                            }`}
                          >
                            {activeAgent.name}
                          </h2>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11.5px] text-emerald-600">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[#5a5959] font-normal">
                            Active •{" "}
                            <span className={`font-medium ${isDarkMode ? "text-zinc-200" : "text-[#1a1c1c]"}`}>
                              {activeMeta.roleTitle}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action tools */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
                          isDarkMode
                            ? "bg-[#2a3040] text-zinc-200 hover:bg-[#353d52]"
                            : "bg-[#f3f4f3] hover:bg-[#eeeeed] text-[#424656]"
                        }`}
                        title="Export conversation"
                      >
                        <span className="material-symbols-outlined text-[16px]">file_download</span>
                        <span className="hidden sm:inline">Export</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveView("settings")}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                          isDarkMode
                            ? "bg-[#2a3040] text-zinc-200 hover:bg-[#353d52]"
                            : "bg-[#f3f4f3] hover:bg-[#eeeeed] text-[#424656]"
                        }`}
                        title="Agent tuning"
                      >
                        <span className="material-symbols-outlined text-[18px]">tune</span>
                      </button>
                      <button
                        type="button"
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                          isDarkMode
                            ? "bg-[#2a3040] text-zinc-200 hover:bg-[#353d52]"
                            : "bg-[#f3f4f3] hover:bg-[#eeeeed] text-[#424656]"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">more_vert</span>
                      </button>
                    </div>
                  </header>

                  {/* Chat Stream Messages Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl w-full mx-auto pb-48">
                    <div className="flex items-center justify-center my-1">
                      <div
                        className={`px-3 py-1 rounded-full text-[11px] font-medium tracking-wide ${
                          isDarkMode ? "bg-[#2a3040] text-zinc-300" : "bg-[#eeeeed] text-[#5a5959]"
                        }`}
                      >
                        Today, 14:28
                      </div>
                    </div>

                    {activeAgent.id === "madrix-codes" && (
                      <>
                        <div className="flex justify-end">
                          <div className="max-w-[78%] bg-[#1e2022] text-white px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md">
                            <p className="text-[14.5px] leading-relaxed text-white selection:bg-[#e40a65]">
                              How do I structure an ultra-fast WebGPU compute shader pipeline for real-time particle
                              simulation with collision detection?
                            </p>
                            <span className="block text-right text-[10px] text-gray-400 mt-1.5">14:28</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3.5 max-w-[92%]">
                          <img
                            alt={activeAgent.name}
                            src={activeAgent.avatar}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-[#d1d5db] flex-shrink-0 mt-1"
                          />
                          <div
                            className={`flex-1 p-5 rounded-2xl rounded-tl-sm shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5 ${
                              isDarkMode ? "bg-[#1c1f24]" : "bg-white"
                            }`}
                          >
                            <p className={`text-[14px] leading-relaxed ${isDarkMode ? "text-zinc-100" : "text-[#1a1c1c]"}`}>
                              *adjusts glasses* Use a{" "}
                              <strong className="font-semibold text-[#0066ff]">ping-pong storage buffer</strong> setup
                              paired with a uniform grid spatial hash to evaluate proximity in{" "}
                              <code className="px-1.5 py-0.5 rounded bg-[#eeeeed] font-mono text-[12px] text-[#1a1c1c] font-semibold">
                                O(N)
                              </code>{" "}
                              time.
                            </p>

                            <div className="rounded-xl overflow-hidden bg-[#121316] text-[#e5e7eb] font-mono text-[12.5px] leading-relaxed shadow-lg">
                              <div className="px-3.5 py-2.5 bg-[#1b1d22] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 mr-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                                  </div>
                                  <span className="font-mono text-[11.5px] text-gray-300 font-semibold tracking-wide">
                                    particle_sim.wgsl
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-[#e2e2e2]/20 text-[#a3b8cc] text-[10px] font-sans font-bold uppercase tracking-wider">
                                    WGSL
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={handleCopyCode}
                                    className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
                                      copiedCode
                                        ? "bg-emerald-700 text-white"
                                        : "bg-[#2b2d35] hover:bg-[#383b45] text-gray-300"
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-[13px]">
                                      {copiedCode ? "done" : "content_copy"}
                                    </span>
                                    <span>{copiedCode ? "Copied!" : "Copy"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="px-2.5 py-1 rounded bg-[#0066ff] hover:bg-[#0050cb] text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                                    <span>Apply Diff</span>
                                  </button>
                                </div>
                              </div>

                              <pre className="p-4 overflow-x-auto text-[12px] leading-5 font-mono select-all">
                                <span className="text-[#f472b6]">struct</span>{" "}
                                <span className="text-[#38bdf8]">Particle</span> {`{\n`}
                                {"  "}position : <span className="text-[#4ade80]">vec2&lt;f32&gt;</span>,{`\n`}
                                {"  "}velocity : <span className="text-[#4ade80]">vec2&lt;f32&gt;</span>,{`\n`}
                                {"  "}mass     : <span className="text-[#4ade80]">f32</span>,{`\n`}
                                {"  "}radius   : <span className="text-[#4ade80]">f32</span>,{`\n`}
                                {`};\n\n`}
                                <span className="text-[#c084fc]">@compute</span>{" "}
                                <span className="text-[#c084fc]">@workgroup_size</span>(64){`\n`}
                                <span className="text-[#f472b6]">fn</span>{" "}
                                <span className="text-[#38bdf8]">main</span>(
                                <span className="text-[#c084fc]">@builtin</span>(global_invocation_id) id :{" "}
                                <span className="text-[#4ade80]">vec3&lt;u32&gt;</span>) {`{\n`}
                                {"  "}
                                <span className="text-[#f472b6]">let</span> idx = id.x;{`\n`}
                                {"  "}
                                <span className="text-[#f472b6]">if</span> (idx &gt;={" "}
                                <span className="text-[#facc15]">arrayLength</span>(&amp;particlesSrc)) {"{ "}
                                <span className="text-[#f472b6]">return</span>; {"}\n"}
                                {"  "}
                                <span className="text-[#f472b6]">var</span> p = particlesSrc[idx];{`\n`}
                                {"  "}p.position += p.velocity * <span className="text-[#a5b4fc]">0.0166</span>;{" "}
                                <span className="text-[#9ca3af]">// 60 FPS delta</span>
                                {`\n`}
                                {"  "}particlesDst[idx] = p;{`\n`}
                                {`}`}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {activeAgent.id === "madrix-macros" && (
                      <>
                        <div className="flex justify-end">
                          <div className="max-w-[78%] bg-[#1e2022] text-white px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md">
                            <p className="text-[14.5px] leading-relaxed text-white">
                              200g raw chicken breast + 150g cooked rice + 1 scoop whey isolate
                            </p>
                            <span className="block text-right text-[10px] text-gray-400 mt-1.5">14:28</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3.5 max-w-[92%]">
                          <img
                            alt={activeAgent.name}
                            src={activeAgent.avatar}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-[#d1d5db] flex-shrink-0 mt-1"
                          />
                          <div
                            className={`flex-1 p-5 rounded-2xl rounded-tl-sm shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3 ${
                              isDarkMode ? "bg-[#1c1f24]" : "bg-white"
                            }`}
                          >
                            <div
                              className={`font-mono text-[13px] leading-relaxed space-y-1 ${
                                isDarkMode ? "text-zinc-100" : "text-[#1a1c1c]"
                              }`}
                            >
                              <p>Meal Breakdown:</p>
                              <p>- 200g raw chicken breast: 240 kcal, 45.0 g protein</p>
                              <p>- 150g cooked rice: 195 kcal, 0 g protein (rice protein excluded)</p>
                              <p>- 1 scoop whey isolate: 120 kcal, 25.0 g protein</p>
                              <p className="pt-1 font-bold text-[#0066ff]">Daily Total: 555 kcal | 70.0 g protein</p>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0066ff]/10 text-[#0066ff] text-[11px] font-bold">
                                <span className="material-symbols-outlined text-[13px]">verified</span>
                                Verified DB
                              </span>
                              <span className="text-[10.5px] text-[#5a5959]">14:28 · ⚡ 0.18s</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {activeAgent.id === "bhima-coach" && (
                      <>
                        <div className="flex justify-end">
                          <div className="max-w-[78%] bg-[#1e2022] text-white px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md">
                            <p className="text-[14.5px] leading-relaxed text-white">
                              Bench press 90kg for 5 reps. What is my estimated 1RM and next week target?
                            </p>
                            <span className="block text-right text-[10px] text-gray-400 mt-1.5">14:28</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3.5 max-w-[92%]">
                          <img
                            alt={activeAgent.name}
                            src={activeAgent.avatar}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-[#d1d5db] flex-shrink-0 mt-1"
                          />
                          <div
                            className={`flex-1 p-5 rounded-2xl rounded-tl-sm shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-2.5 ${
                              isDarkMode ? "bg-[#1c1f24]" : "bg-white"
                            }`}
                          >
                            <ul
                              className={`list-disc pl-5 text-[14px] leading-relaxed space-y-1 ${
                                isDarkMode ? "text-zinc-100" : "text-[#1a1c1c]"
                              }`}
                            >
                              <li>
                                <strong>Estimated 1RM (Epley):</strong> 105 kg
                              </li>
                              <li>
                                <strong>Next Week Target:</strong> 92.5 kg x 5 reps (or 90 kg x 6)
                              </li>
                              <li>
                                <strong>Cue:</strong> Scapula tucked, leg drive locked—no bounce on chest, <em>beta</em>!
                              </li>
                            </ul>
                            <p className="text-[13.5px] font-semibold text-[#e40a65]">Tagda mehnat, shera!</p>
                          </div>
                        </div>
                      </>
                    )}

                    {(extraMessages[activeAgent.id] ?? []).map((msg, idx) => (
                      <div key={idx} className="flex justify-end">
                        <div className="max-w-[78%] bg-[#1e2022] text-white px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md">
                          <p className="text-[14.5px] leading-relaxed text-white">{msg.text}</p>
                          <span className="block text-right text-[10px] text-gray-400 mt-1.5">{msg.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Docked Interactive Input Section */}
                  <div className="absolute bottom-4 left-6 right-6 max-w-4xl mx-auto flex flex-col gap-2 z-30">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1">
                      {activeMeta.suggestions.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setInputValue(chip.label);
                            inputRef.current?.focus();
                          }}
                          className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                            isDarkMode
                              ? "bg-[#1c1f24] hover:bg-[#2a3040] text-zinc-100"
                              : "bg-white hover:bg-[#eeeeed] text-[#1a1c1c]"
                          }`}
                        >
                          <span className={`material-symbols-outlined text-[14px] ${chip.iconColor}`}>
                            {chip.icon}
                          </span>
                          <span>{chip.label}</span>
                        </button>
                      ))}
                    </div>

                    <div
                      className={`relative backdrop-blur-xl p-2 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] ring-1 flex items-center gap-2 ${
                        isDarkMode
                          ? "bg-[#1c1f24]/95 ring-[#2a3040]"
                          : "bg-white/95 ring-[#e2e2e2]/60"
                      }`}
                    >
                      <button
                        type="button"
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer ${
                          isDarkMode
                            ? "bg-[#2a3040] hover:bg-[#353d52] text-zinc-300"
                            : "bg-[#f3f4f3] hover:bg-[#eeeeed] text-[#424656]"
                        }`}
                        title="Attach file or context"
                      >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                      </button>

                      <input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSend();
                        }}
                        placeholder={inputPlaceholder ?? `Ask ${activeAgent.name} or type '/' for commands...`}
                        type="text"
                        className={`flex-1 bg-transparent py-2.5 px-2 text-[14px] focus:outline-none placeholder:text-[#5a5959] ${
                          isDarkMode ? "text-white" : "text-[#1a1c1c]"
                        }`}
                      />

                      <div className="flex items-center gap-1.5 pr-1">
                        <button
                          type="button"
                          className="w-9 h-9 rounded-xl hover:bg-[#f3f4f3]/20 text-[#5a5959] flex items-center justify-center transition-colors cursor-pointer"
                          title="Toggle voice input"
                        >
                          <span className="material-symbols-outlined text-[20px]">mic</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSend}
                          className="w-10 h-10 rounded-xl bg-[#0050cb] hover:bg-[#0066ff] text-white flex items-center justify-center shadow-md hover:scale-[1.03] active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 text-center text-[10.5px] font-semibold text-[#5a5959]">
                      <span>
                        Press{" "}
                        <kbd
                          className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                            isDarkMode ? "bg-[#2a3040] text-zinc-200" : "bg-[#eeeeed] text-[#1a1c1c]"
                          }`}
                        >
                          Return ↵
                        </kbd>{" "}
                        to send
                      </span>
                      <span>•</span>
                      <span>MaDbotS WebView Runtime</span>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      )}

      {/* VIEW 2: SETTINGS PAGE (Converted from HTML + Synced with App Agents) */}
      {activeView === "settings" && (
        <>
          <main className={`w-full pt-16 min-h-screen ${isDarkMode ? "bg-[#141618]" : "bg-[#f9f9f8]"}`}>
            <div className="w-full max-w-4xl mx-auto px-6 lg:px-10 py-10">
              {/* Breadcrumb & Top Editorial Navigation */}
              <div className="flex items-center justify-between mb-4">
                <nav className="flex items-center gap-1 text-[#5a5959] text-[14px] font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveView("workspace")}
                    className={`flex items-center gap-1 transition-colors group cursor-pointer ${
                      isDarkMode ? "hover:text-white" : "hover:text-[#1a1c1c]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">
                      arrow_back
                    </span>
                    <span>Workspace</span>
                  </button>
                  <span>/</span>
                  <span className={`font-semibold ${isDarkMode ? "text-white" : "text-[#1a1c1c]"}`}>
                    Preferences
                  </span>
                </nav>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${
                      isDarkMode ? "bg-[#2a3040] text-zinc-300" : "bg-[#eeeeed] text-[#5a5959]"
                    }`}
                  >
                    System v2.4.9
                  </span>
                </div>
              </div>

              {/* Editorial Header Section */}
              <div className="relative mb-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h1
                        className={`font-['Plus_Jakarta_Sans',sans-serif] text-[56px] leading-[64px] tracking-[-0.03em] font-extrabold ${
                          isDarkMode ? "text-white" : "text-[#1a1c1c]"
                        }`}
                      >
                        Settings
                      </h1>
                      <span className="inline-block text-[#e40a65] text-[28px] font-bold transform rotate-12">
                        ✦
                      </span>
                    </div>
                    <p className="text-[18px] leading-7 text-[#5a5959] max-w-xl">
                      Manage global app preferences and individual AI thinking depth.
                    </p>
                  </div>

                  {/* Quick Status Marker */}
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full shadow-sm ${
                      isDarkMode ? "bg-[#1c1f24]" : "bg-[#f3f4f3]"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#0066ff] animate-pulse" />
                    <span
                      className={`text-[12px] font-medium ${
                        isDarkMode ? "text-zinc-300" : "text-[#424656]"
                      }`}
                    >
                      Local State Synced
                    </span>
                  </div>
                </div>

                {/* Playful Decorative Spark Doodle (SVG) */}
                <svg
                  className="absolute -top-3 right-36 w-10 h-10 text-[#e40a65] opacity-40 pointer-events-none hidden md:block"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 40 40"
                >
                  <path
                    d="M20 4 C20 14 26 20 36 20 C26 20 20 26 20 36 C20 26 14 20 4 20 C14 20 20 14 20 4 Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Main Stacked Content Cards */}
              <div className="flex flex-col gap-6">
                {/* CARD 1: MaDbotS Config */}
                <section
                  className={`rounded-xl p-6 md:p-10 shadow-sm relative overflow-hidden transition-all duration-200 ${
                    isDarkMode ? "bg-[#1c1f24]" : "bg-white"
                  }`}
                >
                  <svg
                    className="absolute top-4 right-6 w-24 h-12 text-[#e40a65]/20 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 100 40"
                  >
                    <path d="M5 25 Q 25 5, 50 25 T 95 25" strokeLinecap="round" />
                    <path d="M20 10 L25 15 M75 30 L80 35" strokeLinecap="round" />
                  </svg>

                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#ffd9df] flex items-center justify-center text-[#b7004f]">
                        <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
                      </div>
                      <div>
                        <h2
                          className={`font-['Plus_Jakarta_Sans',sans-serif] text-[20px] font-semibold ${
                            isDarkMode ? "text-white" : "text-[#1a1c1c]"
                          }`}
                        >
                          MaDbotS Config
                        </h2>
                        <p className="text-[13px] text-[#5a5959]">Environment appearance and interface tuning</p>
                      </div>
                    </div>
                    <span className="text-[12px] text-[#e40a65] bg-[#ffd9df]/50 px-2.5 py-1 rounded-full font-semibold">
                      Global
                    </span>
                  </div>

                  {/* Toggle Row: Dark Night Mode */}
                  <div
                    className={`flex items-center justify-between p-4 rounded-xl ${
                      isDarkMode ? "bg-[#141618]" : "bg-[#f3f4f3]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isDarkMode ? "bg-[#2a3040] text-zinc-200" : "bg-[#eeeeed] text-[#424656]"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">dark_mode</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[14px] font-semibold ${
                              isDarkMode ? "text-white" : "text-[#1a1c1c]"
                            }`}
                          >
                            Dark Night Mode
                          </span>
                          <span className="text-[#5a5959] text-[12px] font-semibold">• Experimental</span>
                        </div>
                        <p className={`text-[13px] ${isDarkMode ? "text-zinc-400" : "text-[#424656]"}`}>
                          Deep graphite theme for late night focus sessions.
                        </p>
                      </div>
                    </div>

                    <button
                      aria-checked={isDarkMode}
                      onClick={() => {
                        setIsDarkMode((prev) => !prev);
                        triggerSavePill("Theme updated");
                      }}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                        isDarkMode ? "bg-[#0066ff]" : "bg-[#e2e2e2]"
                      }`}
                      role="switch"
                      type="button"
                    >
                      <span className="sr-only">Toggle dark night mode</span>
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out mt-1 ${
                          isDarkMode ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </section>

                {/* AGENT CARDS (Synced with MaDbotS Real Agents) */}
                {enrichedAgents.map(({ bot, modelBadge, tierBadge, roleTitle, latencyText, accentType }) => {
                  const currentStop = thinkingStops[bot.id] ?? 1;
                  const isBlue = accentType === "blue";
                  const activeColor = isBlue ? "#0066ff" : "#e40a65";
                  const badgeBg = isBlue ? "bg-[#0066ff] text-white" : "bg-[#e40a65] text-white";
                  const stopMeta = THINKING_STOPS[currentStop];

                  return (
                    <section
                      key={bot.id}
                      className={`rounded-xl p-6 md:p-10 shadow-sm relative overflow-hidden transition-all duration-200 ${
                        isDarkMode ? "bg-[#1c1f24]" : "bg-white"
                      }`}
                    >
                      {/* Top Agent Identity Header */}
                      <div
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 bg-gradient-to-r from-transparent ${
                          isBlue ? "via-[#dae1ff]/20" : "via-[#ffd9df]/20"
                        } to-transparent`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            {bot.avatar ? (
                              <img
                                alt={bot.name}
                                src={bot.avatar}
                                className="w-14 h-14 rounded-xl object-cover bg-[#eeeeed] shadow-sm p-0.5"
                              />
                            ) : (
                              <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
                                style={{ background: bot.color }}
                              >
                                {bot.initial}
                              </div>
                            )}
                            <span
                              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-4 ring-white flex items-center justify-center shadow-sm"
                              style={{ background: activeColor }}
                              title="Agent Online"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3
                                className={`font-['Plus_Jakarta_Sans',sans-serif] text-[20px] font-bold ${
                                  isDarkMode ? "text-white" : "text-[#1a1c1c]"
                                }`}
                              >
                                {bot.name}
                              </h3>
                              <span
                                className={`text-[12px] px-2 py-0.5 rounded-md font-semibold ${
                                  isBlue
                                    ? "bg-[#dae1ff] text-[#001849]"
                                    : "bg-[#ffd9df] text-[#3f0017]"
                                }`}
                              >
                                {tierBadge}
                              </span>
                            </div>
                            <p className="text-[13px] text-[#5a5959] mt-0.5">{roleTitle}</p>
                          </div>
                        </div>

                        <div
                          className={`flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-lg ${
                            isDarkMode ? "bg-[#141618]" : "bg-[#f3f4f3]"
                          }`}
                        >
                          <span
                            className="material-symbols-outlined text-[16px]"
                            style={{ color: activeColor }}
                          >
                            bolt
                          </span>
                          <span
                            className={`text-[12px] font-medium ${
                              isDarkMode ? "text-zinc-300" : "text-[#424656]"
                            }`}
                          >
                            {latencyText}
                          </span>
                        </div>
                      </div>

                      {/* Thinking Level Section */}
                      <div className={`rounded-xl p-4 md:p-6 ${isDarkMode ? "bg-[#141618]" : "bg-[#f3f4f3]"}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold ${
                                isDarkMode ? "text-white" : "text-[#1a1c1c]"
                              }`}
                            >
                              Thinking level
                            </span>
                            <span className="text-base select-none">💡</span>
                          </div>
                          <span
                            className={`text-[12px] px-2.5 py-1 rounded-full font-semibold shadow-sm transition-all duration-200 ${badgeBg}`}
                          >
                            {stopMeta.label}
                          </span>
                        </div>

                        {/* 4-Stop Sliding Meter */}
                        <div className="relative py-4">
                          <div
                            className={`h-2 w-full rounded-full overflow-hidden ${
                              isDarkMode ? "bg-[#2a3040]" : "bg-[#e2e2e2]"
                            }`}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: stopMeta.width,
                                background: activeColor,
                                boxShadow: isBlue
                                  ? "0 0 12px rgba(0,102,255,0.4)"
                                  : "0 0 12px rgba(228,10,101,0.4)",
                              }}
                            />
                          </div>

                          <div className="flex justify-between mt-4 pt-1 select-none">
                            {THINKING_STOPS.map((stop, idx) => {
                              const isActive = idx === currentStop;
                              const alignClass =
                                idx === 0 ? "text-left" : idx === 3 ? "text-right" : "text-center";
                              return (
                                <button
                                  key={stop.name}
                                  type="button"
                                  onClick={() => {
                                    setThinkingStops((prev) => ({ ...prev, [bot.id]: idx }));
                                    triggerSavePill(`${bot.name} updated`);
                                  }}
                                  className={`${alignClass} text-[14px] transition-colors cursor-pointer`}
                                  style={{ color: isActive ? activeColor : "#5a5959" }}
                                >
                                  <span className={`block ${isActive ? "font-bold" : "font-semibold"}`}>
                                    {stop.name}
                                  </span>
                                  <span
                                    className="block text-[12px]"
                                    style={{ color: isActive ? activeColor : "#5a5959" }}
                                  >
                                    {stop.short}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>

              {/* Bottom Action Bar / Controls */}
              <div
                className={`mt-16 pt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 rounded-xl shadow-sm ${
                  isDarkMode ? "bg-[#1c1f24]" : "bg-white"
                }`}
              >
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
                    isSaveHighlighted
                      ? "bg-[#dae1ff] text-[#001849]"
                      : isDarkMode
                      ? "bg-[#141618] text-zinc-300"
                      : "bg-[#f3f4f3] text-[#424656]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[#0066ff] text-[18px]">check_circle</span>
                  <span className="text-[14px] font-medium">{savePillText}</span>
                  <span className="text-[#5a5959] text-[13px]">• Just now</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-[14px] font-medium transition-colors cursor-pointer ${
                      isDarkMode
                        ? "text-zinc-300 hover:bg-[#2a3040]"
                        : "text-[#424656] hover:bg-[#f3f4f3] hover:text-[#1a1c1c]"
                    }`}
                  >
                    Reset Defaults
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerSavePill("Preferences saved")}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0066ff] text-white text-[14px] font-semibold hover:bg-[#0050cb] transition-all active:scale-[0.98] shadow-sm cursor-pointer"
                  >
                    <span>Save Preferences</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </main>

          <footer
            className={`w-full py-10 border-t ${
              isDarkMode
                ? "bg-[#1c1f24] border-[#2a3040] text-zinc-400"
                : "bg-white border-[#eeeeed] text-[#424656]"
            }`}
          >
            <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px]">
              <div className="flex items-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif] text-[20px] font-bold">
                <span className={isDarkMode ? "text-white" : "text-[#1a1c1c]"}>MaDbotS</span>
                <span className="text-[#e40a65]">*</span>
                <span className="font-['Inter',sans-serif] text-[13px] font-normal text-[#5a5959] ml-2">
                  Digital publishing clarity with AI craft.
                </span>
              </div>
              <div className="text-[#5a5959]">© 2025 MaDbotS Studio. Minimalist AI infrastructure.</div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
