"use client";

import React, { useEffect, useRef, useState } from "react";
import { LEVELS, type Bot, type Level } from "@/lib/bots";
import { useSettings } from "@/lib/settings";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { useVoiceChat } from "@/lib/useVoiceChat";

type Msg = {
  role: "user" | "model";
  text: string;
  t: number;
  verified?: boolean;
  starred?: boolean;
  responseTime?: string;
  isError?: boolean;
  retryPrompt?: string;
};

type AgentMeta = {
  modelBadge: string;
  tierBadge: string;
  roleTitle: string;
  latencyText: string;
  statusColor: string;
  tagLeft: string;
  accentType: "blue" | "pink";
  suggestions: { icon: string; iconColor: string; label: string }[];
};

const AGENT_META: Record<string, AgentMeta> = {
  "madrix-macros": {
    modelBadge: "Qwen 3.8 27B",
    tierBadge: "Pro Active",
    roleTitle: "Personal Nutrition Intelligence",
    latencyText: "180ms response",
    statusColor: "bg-emerald-500",
    tagLeft: "Macros & DB",
    accentType: "blue",
    suggestions: [
      { icon: "restaurant", iconColor: "text-[#0050cb]", label: "200g chicken breast + 150g cooked rice" },
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
    tagLeft: "PRs & Khurak",
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
    tagLeft: "<> TypeScript / C++",
    accentType: "blue",
    suggestions: [
      { icon: "auto_fix_high", iconColor: "text-[#0050cb]", label: "Explain workgroup shared memory" },
      { icon: "grid_4x4", iconColor: "text-[#b7004f]", label: "Two-sum optimal O(n) in C++" },
      { icon: "speed", iconColor: "text-[#5a5959]", label: "Fix React hydration mismatch" },
    ],
  },
  "madrix-rehab": {
    modelBadge: "GPT-OSS 120B",
    tierBadge: "Pro Active",
    roleTitle: "Sports Physio & Rehab Specialist",
    latencyText: "110ms response",
    statusColor: "bg-emerald-500",
    tagLeft: "Physio & Rehab",
    accentType: "blue",
    suggestions: [
      { icon: "healing", iconColor: "text-[#0050cb]", label: "Shoulder pain during bench press" },
      { icon: "accessibility_new", iconColor: "text-[#b7004f]", label: "Lower back tightness after deadlifts" },
      { icon: "directions_run", iconColor: "text-[#5a5959]", label: "Knee pain on squats" },
    ],
  },
};

const THINKING_STOPS: { level: Level; label: string; short: string; width: string; name: string }[] = [
  { level: "minimal", label: "Low • Quick responses", short: "Quick fixes", width: "8%", name: "Low" },
  { level: "low", label: "Medium • Balanced speed", short: "Balanced logic", width: "38%", name: "Medium" },
  { level: "medium", label: "High • Extended reasoning", short: "Deep analysis", width: "72%", name: "High" },
  { level: "high", label: "Max • Maximum depth", short: "Formal depth", width: "100%", name: "Max" },
];

interface DesktopWorkspaceProps {
  agents: Bot[];
  onAddAgentClick: () => void;
}

export function DesktopWorkspace({ agents, onAddAgentClick }: DesktopWorkspaceProps) {
  const { s, setTheme, setLevel } = useSettings();
  const isDarkMode = s.theme === "dark";

  const [activeView, setActiveView] = useState<"workspace" | "settings">("workspace");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [msgsByAgent, setMsgsByAgent] = useState<Record<string, Msg[]>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [savePillText, setSavePillText] = useState("Saved! ✓");
  const [isSaveHighlighted, setIsSaveHighlighted] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usedVoiceRef = useRef(false);
  const sendVoiceRef = useRef<(spokenText: string) => void>(() => {});

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 5000);
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

  const triggerSavePill = (label = "Saved! ✓") => {
    setSavePillText(label);
    setIsSaveHighlighted(true);
    setTimeout(() => setIsSaveHighlighted(false), 1200);
  };

  // Load starred history for selected agent from localStorage
  useEffect(() => {
    if (!selectedAgentId) return;
    if (msgsByAgent[selectedAgentId]) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`madbots:chat:${selectedAgentId}`) || "[]");
      if (Array.isArray(saved)) {
        setMsgsByAgent((prev) => ({ ...prev, [selectedAgentId]: saved }));
      }
    } catch {
      setMsgsByAgent((prev) => ({ ...prev, [selectedAgentId]: [] }));
    }
  }, [selectedAgentId, msgsByAgent]);

  // Auto-scroll chat viewport when messages change
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [msgsByAgent, selectedAgentId, busy]);

  // Dynamic 1-to-3 line textarea resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 88)}px`;
  }, [text]);

  const activeAgent = selectedAgentId ? agents.find((a) => a.id === selectedAgentId) ?? null : null;
  const activeMeta: AgentMeta | null = activeAgent
    ? AGENT_META[activeAgent.id] ?? {
      modelBadge: activeAgent.customConfig?.model || "Gemini 3.5",
      tierBadge: activeAgent.customConfig?.visibility === "public" ? "Public" : "Private",
      roleTitle: "Custom AI Agent",
      latencyText: "150ms response",
      statusColor: "bg-emerald-500",
      tagLeft: "Custom",
      accentType: "blue",
      suggestions: [{ icon: "auto_fix_high", iconColor: "text-[#0050cb]", label: "Help me get started" }],
    }
    : null;

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tagline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeMessages = activeAgent ? msgsByAgent[activeAgent.id] ?? [] : [];

  const toggleStar = (idx: number) => {
    if (!activeAgent) return;
    const current = msgsByAgent[activeAgent.id] ?? [];
    const target = current[idx];
    if (!target) return;
    const willBeStarred = !target.starred;
    const updated = current.map((m, i) => {
      if (i === idx) return { ...m, starred: willBeStarred };
      if (willBeStarred && target.role === "model" && i === idx - 1 && current[i]?.role === "user") {
        return { ...m, starred: true };
      }
      if (willBeStarred && target.role === "user" && i === idx + 1 && current[i]?.role === "model") {
        return { ...m, starred: true };
      }
      return m;
    });
    setMsgsByAgent((prev) => ({ ...prev, [activeAgent.id]: updated }));
    try {
      const starredOnly = updated.filter((m) => m.starred);
      localStorage.setItem(`madbots:chat:${activeAgent.id}`, JSON.stringify(starredOnly));
    } catch { }
  };

  const sendMessage = async (overrideText?: string, baseMessages?: Msg[], forceVoice = false) => {
    if (!activeAgent) return;
    const q = (overrideText ?? text).trim();
    if (!q || busy) return;
    const wasVoice = forceVoice || (!overrideText && usedVoiceRef.current);
    usedVoiceRef.current = false;
    setText("");

    const current = baseMessages ?? (msgsByAgent[activeAgent.id] ?? []);
    const next: Msg[] = [...current, { role: "user", text: q, t: Date.now() }];
    setMsgsByAgent((prev) => ({ ...prev, [activeAgent.id]: next }));
    setBusy(true);

    let reply = "Unable to reach agent. Please try again.";
    let verified = false;
    let responseTime: string | undefined;
    let isError = false;

    try {
      const activeUnstarredHistory = next.filter((m) => !m.starred);
      const messagesToSend =
        activeUnstarredHistory.length > 0 ? activeUnstarredHistory.slice(-4) : [{ role: "user", text: q }];

      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: activeAgent.id,
          level: s.levels[activeAgent.id],
          messages: messagesToSend,
          customConfig: activeAgent.customConfig,
        }),
      });

      const raw = await r.text();
      let d: any = null;
      try {
        d = JSON.parse(raw);
      } catch {
        // Non-JSON error response
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
        ...(isError ? { isError: true, retryPrompt: q } : {}),
      },
    ];
    setMsgsByAgent((prev) => ({ ...prev, [activeAgent.id]: all }));
    setBusy(false);
    if (wasVoice && !isError && reply) {
      speakText(reply, `desk-${activeAgent.id}-${all.length - 1}`, activeAgent.id);
    }
    try {
      const starredOnly = all.filter((m) => m.starred);
      localStorage.setItem(`madbots:chat:${activeAgent.id}`, JSON.stringify(starredOnly));
    } catch { }
  };
  sendVoiceRef.current = (spokenText: string) => {
    sendMessage(spokenText, undefined, true);
  };

  const handleRetry = (errorMsgIdx: number, prompt: string) => {
    if (!activeAgent || busy) return;
    const current = msgsByAgent[activeAgent.id] ?? [];
    const pruned = current.filter((_, idx) => {
      if (idx === errorMsgIdx) return false;
      if (idx === errorMsgIdx - 1 && current[idx]?.role === "user" && current[idx]?.text === prompt) return false;
      return true;
    });
    sendMessage(prompt, pruned);
  };

  const handleResetDefaults = () => {
    setTheme("light");
    agents.forEach((a) => setLevel(a.id, a.level));
    triggerSavePill("Defaults restored");
  };

  return (
    <div
      className={`font-['Inter',sans-serif] text-[15px] antialiased min-h-screen selection:bg-[#ffd9df] selection:text-[#3f0017] transition-colors duration-200 ${isDarkMode ? "bg-[#141618] text-[#f4f4f6]" : "bg-[#f9f9f8] text-[#1a1c1c]"
        }`}
    >
      {/* Persistent Global Header (Solid opaque, no status-bar blur) */}
      <header
        className={`fixed top-0 left-0 right-0 h-16 shadow-[0_1px_8px_rgba(0,0,0,0.03)] z-50 transition-colors ${isDarkMode ? "bg-[#1c1f24] border-b border-[#2a3040]" : "bg-white"
          }`}
      >
        <div className="w-full px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                setActiveView("workspace");
                setSelectedAgentId(null);
              }}
              className="flex items-center gap-2 select-none group cursor-pointer"
            >
              <img
                src="/icon-512.jpg"
                alt="MaDbotS"
                className="w-7 h-7 rounded-[7px] object-cover border border-zinc-300 dark:border-zinc-600 shadow-xs"
              />
              <span
                className={`font-['Plus_Jakarta_Sans',sans-serif] text-[20px] leading-7 tracking-tight font-bold ${isDarkMode ? "text-white" : "text-[#1a1c1c]"
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
                className={`px-2.5 py-1.5 rounded-lg text-[14px] transition-colors cursor-pointer ${activeView === "workspace"
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
                className={`px-2.5 py-1.5 rounded-lg text-[14px] transition-colors cursor-pointer ${activeView === "settings"
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
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${isDarkMode
                  ? "text-zinc-400 hover:bg-[#2a3040] hover:text-white"
                  : "text-[#424656] hover:bg-[#f3f4f3] hover:text-[#1a1c1c]"
                  }`}
                title="Search"
              >
                <span className="material-symbols-outlined text-[20px]">search</span>
              </button>
              <button
                type="button"
                onClick={onAddAgentClick}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${isDarkMode
                  ? "text-zinc-400 hover:bg-[#2a3040] hover:text-white"
                  : "text-[#424656] hover:bg-[#f3f4f3] hover:text-[#1a1c1c]"
                  }`}
                title="Add new agent"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
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
            {/* LEFT COLUMN: Agents Directory (390px fixed width) */}
            <aside
              className={`flex-shrink-0 flex flex-col relative z-10 shadow-[1px_0_12px_rgba(0,0,0,0.03)] w-[390px] ${isDarkMode ? "bg-[#1c1f24]" : "bg-white"
                }`}
            >
              {/* Subtle Doodle Accents */}
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
                className={`p-6 pb-4 relative flex flex-col gap-1 z-10 backdrop-blur-sm ${isDarkMode ? "bg-[#1c1f24]/80" : "bg-white/80"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`font-['Plus_Jakarta_Sans',sans-serif] text-[17px] leading-tight font-extrabold tracking-tight ${isDarkMode ? "text-white" : "text-[#1a1c1c]"
                          }`}
                      >
                        Talk. Think.
                      </span>
                      <span
                        className={`relative font-['Plus_Jakarta_Sans',sans-serif] text-[17px] leading-tight font-extrabold tracking-tight ml-0.5 ${isDarkMode ? "text-white" : "text-[#1a1c1c]"
                          }`}
                      >
                        Build.
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
                      onClick={() => setSearchQuery("")}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${isDarkMode
                        ? "bg-[#2a3040] text-zinc-300 hover:bg-[#353d52]"
                        : "bg-[#f3f4f3] hover:bg-[#eeeeed] text-[#424656]"
                        }`}
                      title="Filter agents"
                    >
                      <span className="material-symbols-outlined text-[19px]">filter_list</span>
                    </button>
                    <button
                      type="button"
                      onClick={onAddAgentClick}
                      className="w-8 h-8 rounded-lg bg-[#0050cb] text-white flex items-center justify-center shadow-sm hover:brightness-110 transition-all cursor-pointer"
                      title="Add new agent"
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
                    className={`w-full pl-9 pr-8 py-2 text-[13px] rounded-lg focus:outline-none transition-all placeholder:text-[#5a5959] shadow-inner ${isDarkMode
                      ? "bg-[#141618] text-white focus:bg-[#191c21]"
                      : "bg-[#f3f4f3] text-[#1a1c1c] focus:bg-white"
                      }`}
                    placeholder="Search conversations & agents..."
                    type="text"
                  />
                  <span
                    className={`absolute right-2.5 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "bg-[#2a3040] text-zinc-400" : "bg-[#eeeeed] text-[#5a5959]"
                      }`}
                  >
                    /
                  </span>
                </div>
              </div>

              {/* Agent Feed List */}
              <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2 relative z-10">
                {filteredAgents.map((agent) => {
                  const meta = AGENT_META[agent.id] ?? {
                    modelBadge: agent.customConfig?.model || "Gemini 3.5",
                    statusColor: "bg-emerald-500",
                    tagLeft: "Custom",
                    accentType: "blue" as const,
                  };
                  const isSelected = agent.id === activeAgent?.id;
                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`group relative p-3.5 rounded-[10px] cursor-pointer transition-all duration-200 ${isSelected
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
                          {agent.avatar ? (
                            <img
                              alt={agent.name}
                              src={agent.avatar}
                              className="w-11 h-11 rounded-full object-cover shadow-sm ring-1 ring-[#d1d5db]"
                            />
                          ) : (
                            <div
                              className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white shadow-sm ring-1 ring-[#d1d5db]"
                              style={{ background: agent.color }}
                            >
                              {agent.initial}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${meta.statusColor} rounded-full ring-2 ring-white`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h3
                                className={`font-['Plus_Jakarta_Sans',sans-serif] text-[14.5px] leading-tight font-bold truncate ${isDarkMode ? "text-white" : "text-[#1a1c1c]"
                                  }`}
                              >
                                {agent.name}
                              </h3>
                            </div>
                          </div>

                          <p
                            className={`text-[12.5px] leading-snug font-medium truncate mb-2.5 ${isDarkMode ? "text-zinc-400" : "text-[#424656]"
                              }`}
                          >
                            {agent.tagline}
                          </p>

                          <div className="flex items-center justify-between pt-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold ${isDarkMode ? "bg-[#2a3040] text-zinc-200" : "bg-[#eeeeed] text-[#1a1c1c]"
                                }`}
                            >
                              {meta.tagLeft}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* RIGHT COLUMN: Empty State OR Live Chat Screen */}
            <section
              className={`flex-1 flex flex-col min-w-0 relative overflow-hidden ${isDarkMode ? "bg-[#141618]" : "bg-[#f9f9f8]"
                }`}
            >
              {!activeAgent || !activeMeta ? (
                /* Empty State on Page Load */
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center select-none">
                  <div className="relative mb-5">
                    <div
                      className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm border ${isDarkMode
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
                    className={`font-['Plus_Jakarta_Sans',sans-serif] text-[22px] font-bold tracking-tight ${isDarkMode ? "text-white" : "text-[#1a1c1c]"
                      }`}
                  >
                    Select an agent to explore
                  </h2>
                  <p className="text-[14px] text-[#5a5959] mt-1.5 max-w-sm">
                    Pick an agent from the left directory to start a live conversation.
                  </p>
                </div>
              ) : (
                <>
                  {/* Chat Header Bar */}
                  <header
                    className={`h-16 px-6 backdrop-blur-md flex items-center justify-between z-20 shadow-[0_1px_8px_rgba(0,0,0,0.02)] ${isDarkMode ? "bg-[#1c1f24]/90 border-b border-[#2a3040]" : "bg-white/90"
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
                            className={`font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-extrabold truncate ${isDarkMode ? "text-white" : "text-[#1a1c1c]"
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

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveView("settings")}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${isDarkMode
                          ? "bg-[#2a3040] text-zinc-200 hover:bg-[#353d52]"
                          : "bg-[#f3f4f3] hover:bg-[#eeeeed] text-[#424656]"
                          }`}
                        title="Agent tuning"
                      >
                        <span className="material-symbols-outlined text-[18px]">tune</span>
                      </button>
                    </div>
                  </header>

                  {/* Chat Stream Messages Area */}
                  <div ref={viewportRef} className="flex-1 overflow-y-auto p-6 space-y-5 max-w-4xl w-full mx-auto pb-48">
                    {activeMessages.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-[14px] text-[#5a5959]">
                          Start chatting with <strong className={isDarkMode ? "text-white" : "text-[#1a1c1c]"}>{activeAgent.name}</strong>
                        </p>
                        <p className="text-[12.5px] text-[#5a5959] mt-1">{activeAgent.tagline}</p>
                      </div>
                    ) : (
                      activeMessages.map((msg, idx) => {
                        const isUser = msg.role === "user";
                        const timeStr = new Date(msg.t).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        if (isUser) {
                          return (
                            <div key={idx} className="flex justify-end">
                              <div className="max-w-[78%] bg-[#1e2022] text-white px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md">
                                <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                <span className="block text-right text-[10px] text-gray-400 mt-1.5">
                                  {timeStr}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={idx} className="flex items-start gap-3.5 max-w-[92%]">
                            {activeAgent.avatar ? (
                              <img
                                alt={activeAgent.name}
                                src={activeAgent.avatar}
                                className="w-7 h-7 rounded-full object-cover ring-1 ring-[#d1d5db] flex-shrink-0 mt-1"
                              />
                            ) : (
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-1"
                                style={{ background: activeAgent.color }}
                              >
                                {activeAgent.initial}
                              </div>
                            )}
                            <div
                              className={`flex-1 p-5 rounded-2xl rounded-tl-sm shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-l-2 border-[#0066ff] space-y-2.5 ${isDarkMode ? "bg-[#1c1f24]" : "bg-white"
                                }`}
                            >
                              <div className="flex items-center justify-between gap-2 pb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[15px] text-[#0066ff]">
                                    {activeAgent.name}
                                  </span>
                                  {msg.verified && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#0066ff]/15 text-[#0066ff] text-[10px] font-bold">
                                      <span className="material-symbols-outlined text-[11px]">verified</span>
                                      Verified
                                    </span>
                                  )}
                                  {msg.responseTime && (
                                    <span className="text-[11px] font-mono text-[#5a5959]">
                                      ⚡ {msg.responseTime}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 relative">
                                  <button
                                    type="button"
                                    onClick={() => toggleStar(idx)}
                                    className="p-1 rounded hover:bg-black/5 text-[14px] cursor-pointer"
                                    title="Bookmark locally"
                                  >
                                    {msg.starred ? "⭐" : "☆"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setOpenMenuIdx((prev) => (prev === idx ? null : idx))}
                                    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#5a5959] cursor-pointer"
                                    title="Message actions"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">more_vert</span>
                                  </button>
                                  {openMenuIdx === idx && (
                                    <div
                                      className={`absolute right-0 top-7 z-40 min-w-[110px] rounded-xl border shadow-lg p-1 flex flex-col gap-0.5 ${isDarkMode
                                        ? "bg-[#1c1f24] border-[#2a3040]"
                                        : "bg-white border-[#e2e2e2]"
                                        }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard?.writeText(msg.text).catch(() => { });
                                          setCopiedIdx(idx);
                                          setTimeout(() => setCopiedIdx(null), 1500);
                                          setOpenMenuIdx(null);
                                        }}
                                        className={`w-full px-2.5 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-2 cursor-pointer text-left ${isDarkMode
                                          ? "text-zinc-100 hover:bg-[#2a3040]"
                                          : "text-[#1a1c1c] hover:bg-[#f3f4f3]"
                                          }`}
                                      >
                                        <span className="material-symbols-outlined text-[14px]">
                                          {copiedIdx === idx ? "done" : "content_copy"}
                                        </span>
                                        <span>{copiedIdx === idx ? "Copied" : "Copy"}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          speakText(msg.text, `desk-${activeAgent.id}-${idx}`, activeAgent.id);
                                          setOpenMenuIdx(null);
                                        }}
                                        className={`w-full px-2.5 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-2 cursor-pointer text-left ${isDarkMode
                                          ? "text-zinc-100 hover:bg-[#2a3040]"
                                          : "text-[#1a1c1c] hover:bg-[#f3f4f3]"
                                          }`}
                                      >
                                        <span className="material-symbols-outlined text-[14px] text-[#0066ff]">
                                          {speakingId === `desk-${activeAgent.id}-${idx}` ? "stop_circle" : "volume_up"}
                                        </span>
                                        <span>
                                          {speakingId === `desk-${activeAgent.id}-${idx}` ? "Stop" : "Listen"}
                                        </span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className={isDarkMode ? "text-zinc-100" : "text-[#1a1c1c]"}>
                                <ChatMarkdown content={msg.text} accentColor={activeAgent.color} />
                              </div>
                              <div className="flex items-center justify-between pt-0.5">
                                {msg.isError && msg.retryPrompt ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRetry(idx, msg.retryPrompt!)}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-[#5a5959] hover:text-[#0066ff] hover:bg-[#0066ff]/10 transition-colors cursor-pointer disabled:opacity-40"
                                    title="Retry message"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">refresh</span>
                                    <span>Retry</span>
                                  </button>
                                ) : (
                                  <span />
                                )}
                                <span className="text-[10.5px] text-[#5a5959]">{timeStr}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {busy && (
                      <div className="flex items-center gap-2 text-[13px] text-[#5a5959] pl-10">
                        <span className="w-2 h-2 rounded-full bg-[#0066ff] animate-pulse" />
                        <span>{activeAgent.name} is thinking...</span>
                      </div>
                    )}
                  </div>

                  {/* Docked Interactive Input Section */}
                  <div className="absolute bottom-4 left-6 right-6 max-w-4xl mx-auto flex flex-col gap-2 z-30">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1">
                      {activeMeta.suggestions.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => sendMessage(chip.label)}
                          disabled={busy}
                          className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center gap-1.5 flex-shrink-0 cursor-pointer disabled:opacity-40 ${isDarkMode
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

                    <div
                      className={`relative backdrop-blur-xl p-2 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] ring-1 flex items-end gap-2 ${isDarkMode ? "bg-[#1c1f24]/95 ring-[#2a3040]" : "bg-white/95 ring-[#e2e2e2]/60"
                        }`}
                    >
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder={`Ask ${activeAgent.name}...`}
                        className={`flex-1 bg-transparent py-2 px-2 text-[14px] focus:outline-none placeholder:text-[#5a5959] resize-none min-h-[38px] max-h-[88px] overflow-y-auto ${isDarkMode ? "text-white" : "text-[#1a1c1c]"
                          }`}
                      />

                      <button
                        type="button"
                        onClick={toggleRecording}
                        disabled={busy || transcribing}
                        title={recording ? "Listening... tap to stop" : "Tap to speak"}
                        className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer disabled:opacity-40 ${recording
                          ? "bg-red-500 text-white shadow-md ring-4 ring-red-500/30"
                          : transcribing
                            ? "bg-amber-500/20 text-amber-500 animate-pulse"
                            : isDarkMode
                              ? "hover:bg-[#2a3040] text-zinc-400 hover:text-white"
                              : "hover:bg-[#f3f4f3] text-[#5a5959] hover:text-[#1a1c1c]"
                          }`}
                      >
                        {recording && (
                          <span className="absolute inset-0 rounded-xl ring-2 ring-red-500 animate-ping opacity-75 pointer-events-none" />
                        )}
                        <span className="material-symbols-outlined text-[20px] relative z-10">
                          {recording ? "stop" : transcribing ? "graphic_eq" : "mic"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => sendMessage()}
                        disabled={busy || !text.trim()}
                        className="w-10 h-10 rounded-xl bg-[#0050cb] hover:bg-[#0066ff] disabled:opacity-40 text-white flex items-center justify-center shadow-md hover:scale-[1.03] active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {toastMsg && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-[85vw] px-3.5 py-1.5 rounded-full bg-zinc-900/90 dark:bg-zinc-800/95 text-white border border-white/10 shadow-md text-[11.5px] font-medium whitespace-nowrap truncate flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="truncate">{toastMsg}</span>
                </div>
              )}
            </section>
          </div>
        </main>
      )}

      {/* VIEW 2: SETTINGS PAGE */}
      {activeView === "settings" && (
        <>
          <main className={`w-full pt-16 min-h-screen ${isDarkMode ? "bg-[#141618]" : "bg-[#f9f9f8]"}`}>
            <div className="w-full max-w-4xl mx-auto px-6 lg:px-10 py-10">
              <div className="flex items-center justify-between mb-4">
                <nav className="flex items-center gap-1 text-[#5a5959] text-[14px] font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveView("workspace")}
                    className={`flex items-center gap-1 transition-colors group cursor-pointer ${isDarkMode ? "hover:text-white" : "hover:text-[#1a1c1c]"
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
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${isDarkMode ? "bg-[#2a3040] text-zinc-300" : "bg-[#eeeeed] text-[#5a5959]"
                    }`}
                >
                  System v2.4.9
                </span>
              </div>

              <div className="relative mb-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h1
                        className={`font-['Plus_Jakarta_Sans',sans-serif] text-[56px] leading-[64px] tracking-[-0.03em] font-extrabold ${isDarkMode ? "text-white" : "text-[#1a1c1c]"
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

                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full shadow-sm ${isDarkMode ? "bg-[#1c1f24]" : "bg-[#f3f4f3]"
                      }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#0066ff] animate-pulse" />
                    <span className={`text-[12px] font-medium ${isDarkMode ? "text-zinc-300" : "text-[#424656]"}`}>
                      Local State Synced
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                {/* MaDbotS Config */}
                <section
                  className={`rounded-xl p-6 md:p-10 shadow-sm relative overflow-hidden transition-all duration-200 ${isDarkMode ? "bg-[#1c1f24]" : "bg-white"
                    }`}
                >
                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#ffd9df] flex items-center justify-center text-[#b7004f]">
                        <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
                      </div>
                      <div>
                        <h2
                          className={`font-['Plus_Jakarta_Sans',sans-serif] text-[20px] font-semibold ${isDarkMode ? "text-white" : "text-[#1a1c1c]"
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

                  <div
                    className={`flex items-center justify-between p-4 rounded-xl ${isDarkMode ? "bg-[#141618]" : "bg-[#f3f4f3]"
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-[#2a3040] text-zinc-200" : "bg-[#eeeeed] text-[#424656]"
                          }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">dark_mode</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[14px] font-semibold ${isDarkMode ? "text-white" : "text-[#1a1c1c]"}`}>
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
                        setTheme(isDarkMode ? "light" : "dark");
                        triggerSavePill("Theme updated");
                      }}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${isDarkMode ? "bg-[#0066ff]" : "bg-[#e2e2e2]"
                        }`}
                      role="switch"
                      type="button"
                    >
                      <span className="sr-only">Toggle dark night mode</span>
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out mt-1 ${isDarkMode ? "translate-x-6" : "translate-x-1"
                          }`}
                      />
                    </button>
                  </div>
                </section>

                {/* Agent Cards */}
                {agents.map((agent) => {
                  const meta = AGENT_META[agent.id] ?? {
                    modelBadge: agent.customConfig?.model || "Gemini 3.5",
                    tierBadge: "Custom",
                    roleTitle: "Custom AI Agent",
                    latencyText: "150ms response",
                    accentType: "blue" as const,
                  };
                  const currentLevel = s.levels[agent.id] || agent.level;
                  const currentIdx = Math.max(0, LEVELS.indexOf(currentLevel));
                  const isBlue = meta.accentType === "blue";
                  const activeColor = isBlue ? "#0066ff" : "#e40a65";
                  const stopMeta = THINKING_STOPS[currentIdx];

                  return (
                    <section
                      key={agent.id}
                      className={`rounded-xl p-6 md:p-10 shadow-sm relative overflow-hidden transition-all duration-200 ${isDarkMode ? "bg-[#1c1f24]" : "bg-white"
                        }`}
                    >
                      <div
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 bg-gradient-to-r from-transparent ${isBlue ? "via-[#dae1ff]/20" : "via-[#ffd9df]/20"
                          } to-transparent`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            {agent.avatar ? (
                              <img
                                alt={agent.name}
                                src={agent.avatar}
                                className="w-14 h-14 rounded-xl object-cover bg-[#eeeeed] shadow-sm p-0.5"
                              />
                            ) : (
                              <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
                                style={{ background: agent.color }}
                              >
                                {agent.initial}
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
                                className={`font-['Plus_Jakarta_Sans',sans-serif] text-[20px] font-bold ${isDarkMode ? "text-white" : "text-[#1a1c1c]"
                                  }`}
                              >
                                {agent.name}
                              </h3>
                              <span
                                className={`text-[12px] px-2 py-0.5 rounded-md font-semibold ${isBlue ? "bg-[#dae1ff] text-[#001849]" : "bg-[#ffd9df] text-[#3f0017]"
                                  }`}
                              >
                                {meta.tierBadge}
                              </span>
                            </div>
                            <p className="text-[13px] text-[#5a5959] mt-0.5">{meta.roleTitle}</p>
                          </div>
                        </div>

                        <div
                          className={`flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-lg ${isDarkMode ? "bg-[#141618]" : "bg-[#f3f4f3]"
                            }`}
                        >
                          <span className="material-symbols-outlined text-[16px]" style={{ color: activeColor }}>
                            bolt
                          </span>
                          <span className={`text-[12px] font-medium ${isDarkMode ? "text-zinc-300" : "text-[#424656]"}`}>
                            {meta.latencyText}
                          </span>
                        </div>
                      </div>

                      <div className={`rounded-xl p-4 md:p-6 ${isDarkMode ? "bg-[#141618]" : "bg-[#f3f4f3]"}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold ${isDarkMode ? "text-white" : "text-[#1a1c1c]"
                                }`}
                            >
                              Thinking level
                            </span>
                            <span className="text-base select-none">💡</span>
                          </div>
                          <span
                            className="text-[12px] px-2.5 py-1 rounded-full font-semibold text-white shadow-sm transition-all duration-200"
                            style={{ background: activeColor }}
                          >
                            {stopMeta.label}
                          </span>
                        </div>

                        <div className="relative py-4">
                          <div
                            className={`h-2 w-full rounded-full overflow-hidden ${isDarkMode ? "bg-[#2a3040]" : "bg-[#e2e2e2]"
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
                              const isActive = idx === currentIdx;
                              const alignClass =
                                idx === 0 ? "text-left" : idx === 3 ? "text-right" : "text-center";
                              return (
                                <button
                                  key={stop.name}
                                  type="button"
                                  onClick={() => {
                                    setLevel(agent.id, stop.level);
                                    triggerSavePill(`${agent.name} updated`);
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

              {/* Bottom Action Bar */}
              <div
                className={`mt-16 pt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 rounded-xl shadow-sm ${isDarkMode ? "bg-[#1c1f24]" : "bg-white"
                  }`}
              >
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${isSaveHighlighted
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
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-[14px] font-medium transition-colors cursor-pointer ${isDarkMode
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
            className={`w-full py-10 border-t ${isDarkMode
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
