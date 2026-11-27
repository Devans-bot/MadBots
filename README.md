# MaDbotS ⚡

> **A high-speed, mobile-first & desktop-ready suite of hyper-specialized AI persona bots powered by a hybrid TypeScript + Groq LPU + Google Gemini pipeline.**

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Groq Fast Inference](https://img.shields.io/badge/Groq-LPU%20Inference-f55036?style=flat-square)](https://groq.com/)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20DB-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)

---

## ✨ Features

- **4 Specialized Built-In AI Agents:**
  - **Macro-Chief (`madrix-macros`)** — Personal nutrition & macro tracker with a hybrid JSON-parser + deterministic TypeScript calculator pipeline, local + Supabase food DBs, and live DB editing.
  - **Bhima Coach (`bhima-coach`)** — Desi *Akhada* & gym coach for hypertrophy, powerlifting cues, 1RM calculations, BMI, and high-protein Indian meal plans.
  - **Dexter (`madrix-codes`)** — Senior full-stack & systems engineer for C++17/20, Python, JavaScript/TypeScript, OOP, DSA complexity analysis, and bug fixes.
  - **Rehab-Rishi (`madrix-rehab`)** — Calm sports physiotherapist for injury recovery, joint mobility drills, and pain-free exercise swaps.
- **Custom Agent Builder (`AddAgentDrawer`):** Create custom bots from the homescreen or desktop sidebar with custom names, taglines, accent colors, `soul.md` system instructions, dedicated API keys, and primary/fallback models stored in `localStorage`.
- **Responsive Dual Experience:**
  - **Mobile PWA UI:** Discord DM-inspired chat drawer (`ChatDrawer`) with swipe-to-close gesture physics, dynamic top header (`MainHeader`) that swaps to the active bot's avatar & name, liquid-glass multi-line input capsule, thin scrollbar, and a full-screen **Bot Profile Page** (`BotProfileView`) when tapping the bot info header.
  - **Desktop Split Workspace (`DesktopWorkspace`):** Multi-pane desktop dashboard with agent sidebar, live chat stream, and integrated settings.
- **Voice Chat (STT + TTS):**
  - Tap the mic to record speech, with a real-time animated neon-blue equalizer pulse while speaking (`useVoiceChat`), transcribed via **Groq Whisper** (`/api/stt`).
  - Listen to any bot response or auto-speak voice replies via **Groq Orpheus TTS** (`/api/tts`) with per-bot voices (`troy`, `austin`, `hannah`, `daniel`).
- **Skills Menu (`⚡` Thunder Button):** Opens an in-chat **Skills** popup featuring **Verify Macros**, which triggers 4-pass verification & database cross-checking.
- **Private Starred Bookmarks:** Double-tap or click `☆` to save messages in `localStorage`. Starred history is automatically excluded from `/api/chat` payloads so saved notes never pollute the model's context window.
- **Graph-Grid Depth & Typography:** `.madbots-graph-grid` background depth across splash screen, home, chat, and profile views; **Josefin Sans** for user message bubbles, **Rubik** for bold bot text/headings/tables, and **Nunito** for regular/thin bot text.
- **Settings & PWA:** Persistent Light/Dark theme toggle, per-bot thinking depth (`minimal`, `low`, `medium`, `high`), and installable PWA manifest.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js `15.5.29` (App Router) |
| **UI & State** | React `19.0.0`, TypeScript `5` |
| **Styling** | Tailwind CSS `v4` (`@tailwindcss/postcss`), custom CSS variables & thin scrollbars |
| **Animations** | GSAP `3.15.1` (splash screen, drawer slide physics, floating home doodles) |
| **Markdown & Tables** | `react-markdown` `10.1.0` + `remark-gfm` `4.0.1` + custom `CodeBlock` |
| **Database** | Supabase (`@supabase/supabase-js` `2.119.2`) + local `.txt` macro databases |
| **Primary LLM & Voice** | Groq LPU API (`qwen/qwen3.8-27b`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `whisper-large-v3-turbo`, Orpheus TTS) |
| **Fallback LLM** | Google Gemini (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`) |
| **Fonts & Icons** | Google Fonts (`Plus Jakarta Sans`, `Inter`, `Josefin Sans`, `Rubik`, `Nunito`, `Poppins`, `JetBrains Mono`, `Silkscreen`), Material Symbols Outlined |

---

## 📁 Files & Folders Structure

```text
madbots/
├── public/                                     # Static PWA icons & bot avatars
│   ├── avatars/                                # Avatar images for built-in bots
│   └── icon-512.jpg                            # App icon
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts                   # POST /api/chat -> delegates to runLLMPipeline()
│   │   │   ├── stt/route.ts                    # POST /api/stt -> Groq whisper-large-v3-turbo transcription
│   │   │   └── tts/route.ts                    # POST /api/tts -> Groq Orpheus TTS per-bot voice synthesis
│   │   ├── chat/[id]/page.tsx                  # Standalone direct chat route by bot ID
│   │   ├── settings/page.tsx                   # Standalone settings route
│   │   ├── webview/page.tsx                    # Embedded WebView route
│   │   ├── globals.css                         # Tailwind v4 theme, fonts, .madbots-graph-grid, thin scrollbar
│   │   ├── layout.tsx                          # Root layout, Google Fonts links, theme pre-paint script, SplashScreen
│   │   ├── manifest.ts                         # Dynamic PWA web manifest
│   │   └── page.tsx                            # Mobile homescreen + DesktopWorkspace switcher + BotProfileView
│   ├── bots/
│   │   ├── bhima-coach/
│   │   │   ├── groqBhima.ts                    # Groq completion handler for Bhima Coach
│   │   │   ├── prompt.ts                       # System prompt loader for Bhima Coach
│   │   │   └── soul.md                         # Persona rules, Hinglish tone & fitness scope
│   │   ├── madrix-codes/
│   │   │   ├── groqDexter.ts                   # Groq completion handler for Dexter
│   │   │   ├── prompt.ts                       # System prompt loader for Dexter
│   │   │   └── soul.md                         # Persona rules, C++/Python/JS & DSA Big-O rules
│   │   ├── madrix-rehab/
│   │   │   ├── groqRehab.ts                    # Groq completion handler for Rehab-Rishi
│   │   │   ├── prompt.ts                       # System prompt loader for Rehab-Rishi
│   │   │   └── soul.md                         # Physio persona, mobility & pain-free lift swap rules
│   │   └── madrix-macros/
│   │       ├── burger_king_selected_macros.txt # Burger King India nutrition database
│   │       ├── personal_food_macros.txt        # Primary personal food macro database
│   │       ├── personal_food_macros.txt.bak    # Automatic backup updated on DB edits
│   │       ├── groqMacro.ts                    # Groq fallback handler with tool-calling support
│   │       ├── macro_parser_soul.md            # Tiny (<150 token) strict JSON food-log parser prompt
│   │       ├── prompt.ts                       # Conditional prompt builder (loads BK DB only on trigger words)
│   │       ├── soul.md                         # Macro-Chief persona, formatting & calculation rules
│   │       └── tools.ts                        # `update_personal_food_db` tool definition & atomic file writer
│   ├── components/
│   │   ├── AddAgentDrawer.tsx                  # Slide-up modal/drawer to create custom bots
│   │   ├── BotProfileView.tsx                  # Full-screen Bot Profile page (big icon, name, bio, CTA)
│   │   ├── ChatDrawer.tsx                      # Mobile Discord-style chat sheet, Skills popup, voice pulse, liquid-glass input
│   │   ├── ChatMarkdown.tsx                    # Markdown & table renderer (Rubik bold, Nunito body, accent borders)
│   │   ├── ChatSkeletonList.tsx                # Loading skeleton shown when restoring starred chats
│   │   ├── CodeBlock.tsx                       # Syntax-formatted code block with copy button
│   │   ├── DesktopWorkspace.tsx                # Multi-pane desktop split UI & integrated settings
│   │   ├── MainHeader.tsx                      # Global header (MaDbotS* on home, active bot avatar/name in chat)
│   │   ├── SettingsDrawer.tsx                  # Mobile settings drawer (theme + bot thinking depth sliders)
│   │   ├── SplashScreen.tsx                    # Startup splash animation with Silkscreen typewriter tagline
│   │   ├── icons.tsx                           # Shared SVG/icon helpers
│   │   └── webview.tsx                         # WebView helper component
│   └── lib/
│       ├── LLMpipline.tsx                      # Central orchestrator: Hybrid Macro fast-path -> Groq -> Gemini fallback
│       ├── bots.ts                             # Built-in bot registry (id, name, tagline, color, level, avatar)
│       ├── calculateMacros.ts                  # Deterministic TypeScript macro calculator + Supabase/local DB cache
│       ├── formatReply.ts                      # Reply sanitizer (`cleanReply`)
│       ├── gemini.ts                           # Google Gemini API client with retry & 429/503 model switching
│       ├── prompts.ts                          # Unified prompt map (`PROMPTS`) for built-in bots
│       ├── settings.tsx                        # React context for theme & per-bot thinking levels
│       ├── skills.ts                           # Deterministic `runVerifyMacrosSkill` multi-pass verifier
│       ├── supabase.ts                         # Supabase admin/client helpers
│       └── useVoiceChat.ts                     # Client hook for mic recording, speaking detection, STT & TTS playback
├── package.json
└── tsconfig.json
```

---

## 🔄 Request Pipeline & Model Loading

All chat requests from both mobile (`ChatDrawer`) and desktop (`DesktopWorkspace`) hit `POST /api/chat`, which calls `runLLMPipeline()` in `src/lib/LLMpipline.tsx`.

### 1. Stage-by-Stage Execution Flow

```text
Client (ChatDrawer / DesktopWorkspace)
   │  (Strips starred bookmarks; sends active turns + botId + level)
   ▼
POST /api/chat ──► runLLMPipeline()
   │
   ├─► [1] Skill Check: Is message `verify-macros`?
   │        └─► runVerifyMacrosSkill() (src/lib/skills.ts)
   │
   ├─► [2] Macro-Chief Hybrid Fast-Path (`botId === "madrix-macros"`)
   │        ├─► Step A: `openai/gpt-oss-20b` + `macro_parser_soul.md`
   │        │           (JSON extraction only — NO .txt DBs sent to LLM)
   │        ├─► Step B: `calculateMeals()` in `src/lib/calculateMacros.ts`
   │        │           (Deterministic lookup + math in <1ms)
   │        └─► If `unmatched.length === 0` ──► Return Markdown table immediately!
   │
   ├─► [3] Stage 1: Primary Groq LPU Handler (4-turn sliding window)
   │        ├─ madrix-macros : `qwen/qwen3.8-27b` ──► `openai/gpt-oss-120b` ──► `openai/gpt-oss-20b`
   │        ├─ bhima-coach   : `openai/gpt-oss-120b` ──► `openai/gpt-oss-20b`
   │        ├─ madrix-codes  : `openai/gpt-oss-20b` ──► `qwen/qwen3.8-27b`
   │        └─ madrix-rehab  : `openai/gpt-oss-120b` ──► `openai/gpt-oss-20b`
   │
   └─► [4] Stage 2: Google Gemini Fallback (`generateWithFallback` in `src/lib/gemini.ts`)
            └─► `gemini-3.5-flash-lite` ──► `gemini-3.1-flash-lite`
                (Skips 429 rate-limited models and retries transient 5xx errors up to 3 attempts)
```

### 2. Model Loading & Rate-Limit Isolation

- **Per-Bot Groq Keys:** Each built-in bot reads its own dedicated environment variable first (`GROQ_API_KEY_MACROS`, `GROQ_API_KEY_BHIMA`, `GROQ_API_KEY_DEXTER`, `GROQ_API_KEY_REHAB`) and falls back to `GROQ_API_KEY` if unset. This isolates free-tier RPM/TPM buckets across bots.
- **Custom Bots:** Custom agents created via `AddAgentDrawer` can supply their own `apiKey`, `model`, `fallbackModel`, and `soul` in `customConfig`.
- **Voice Pipeline:**
  - **STT (`/api/stt`):** Sends recorded `recording.webm` audio to Groq `whisper-large-v3-turbo`.
  - **TTS (`/api/tts`):** Strips markdown tables/code blocks (`toSpokenText`, capped at ~195 chars for Orpheus free-tier limits) and synthesizes speech using Groq Orpheus with bot-specific voices.

---

## 🥗 Macro-Chief (`madrix-macros`) — Deep Dive

Macro-Chief is architected to eliminate LLM arithmetic errors, minimize token usage (~80% reduction), and respond in sub-second latency by separating **messy text parsing** from **database lookup and math**.

### 1. The Hybrid 3-Step Pipeline

1. **Step 1 — Tiny JSON Parser (`openai/gpt-oss-20b`):**
   - `tryHybridMacrosPipeline()` in `src/lib/LLMpipline.tsx` sends **only** `src/bots/madrix-macros/macro_parser_soul.md` (~150 tokens) and the user's message to `openai/gpt-oss-20b` (`temperature: 0`, `include_reasoning: false`, `reasoning_effort: "low"`, `response_format: { type: "json_object" }`).
   - The parser never sees the food `.txt` databases. Its sole job is fixing spelling/unit typos (e.g., `"banan 8-gm"` → `banana, 80, g`; `"20hm"` → `20, g`; `"chikecn"` → `chicken breast`; `"soyachunsk"` → `soya chunks`), grouping meals, and returning strict JSON (`{ meals: [{ meal, items: [{ name, qty, unit }] }] }`).
   - Requests asking for explanations, DB edits (`add`, `update`, `delete`), or `isNonMeal` queries bypass the fast-path and go directly to the full LLM handler.

2. **Step 2 — Deterministic TypeScript Calculator (`src/lib/calculateMacros.ts`):**
   - `calculateMeals(parsed)` loads food entries from **Supabase** (if configured) or falls back to local files (`personal_food_macros.txt` and `burger_king_selected_macros.txt`), caching the merged `Map<string, MacroEntry>` in memory with a **5-minute TTL**.
   - **Alias Resolution (`ALIASES`):** Normalizes common shorthand (`milk` → `whole milk`, `egg`/`eggs`/`boiled egg` → `whole egg`, `soya` → `soya chunks (dry)`, `chicken` → `chicken breast (raw)`, `rice` → `cooked rice`, `dal` → `cooked dal`, `goat`/`mutton` → `goat meat (cooked)`, `chana` → `roasted chana`).
   - **Strict Personal Tracking Rules:**
     - **Zero-Protein Rule (`ZERO_PROTEIN_KEYWORDS`):** `cooked rice`, `rice`, `cooked dal`, `dal`, and `maggi` always count **0 g protein** (calories only).
     - **Weight Basis Rules:** Soya chunks use **dry** weight; chicken breast uses **raw** weight; liquids scale per `100ml`; countable items (eggs, rotis, burgers) scale per `count`/`serving`.

3. **Step 3 — Direct Markdown Rendering (Zero Return LLM Call):**
   - If every parsed item matches the database (`unmatched.length === 0`), `calculateMeals()` formats and returns the exact `### Nutritional Breakdown` Markdown table and `**Final Result: ...**` summary directly in `<1 ms`—skipping any second LLM call.
   - If any food item is missing from both databases (`unmatched.length > 0`), or if the user asks to update the DB, execution falls through to `callGroqMacroChief()` (`groqMacro.ts`), which loads `soul.md`, `personal_food_macros.txt`, and conditionally `burger_king_selected_macros.txt` (only when BK keywords appear in `prompt.ts`).

### 2. Live Database Tool Calling (`tools.ts`)

Macro-Chief exposes the `update_personal_food_db` function tool in both Groq (`GROQ_MACROS_TOOLS`) and Gemini (`MACROS_TOOLS`). When asked to add or modify a food entry:
- It creates/updates a `.bak` backup (`personal_food_macros.txt.bak`).
- It updates or appends the row in `personal_food_macros.txt` atomically and clears the in-memory DB cache (`clearMacroDbCache()`).

### 3. `verify-macros` Skill (`src/lib/skills.ts` & `ChatDrawer.tsx`)

Accessible either by typing `verify-macros` or tapping the **Skills (`⚡`)** button → **Verify Macros** in the chat input bar:
- Runs `runVerifyMacrosSkill()` / 4-pass independent calculation verification and database cross-checking before confirming totals.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.18+ or 20+
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Groq API Keys (separate keys isolate rate limits per bot)
GROQ_API_KEY=your_default_groq_key
GROQ_API_KEY_MACROS=your_groq_key
GROQ_MODEL_MACROS=qwen/qwen3.8-27b

GROQ_API_KEY_BHIMA=your_groq_key
GROQ_MODEL_BHIMA=openai/gpt-oss-120b

GROQ_API_KEY_DEXTER=your_groq_key
GROQ_MODEL_DEXTER=openai/gpt-oss-20b

GROQ_API_KEY_REHAB=your_groq_key
GROQ_MODEL_REHAB=openai/gpt-oss-120b

# Google Gemini (Fallback Engine)
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite

# Optional Supabase (Macro DB sync)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3099](http://localhost:3099).

### 4. Production Build
```bash
npm run build
npm run start
```

---

## 📄 License
Private & Proprietary — Built for high-speed personal productivity.
