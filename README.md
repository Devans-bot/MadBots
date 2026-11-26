# MaDbotS ⚡

> **A high-speed, mobile-first suite of hyper-specialized AI persona bots powered by a dual-engine Groq + Gemini pipeline.**

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Groq Fast Inference](https://img.shields.io/badge/Groq-LPU%20Inference-f55036?style=flat-square)](https://groq.com/)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)

---

## 📖 Overview

**MaDbotS** is a Progressive Web Application (PWA) built for lightning-fast, purpose-driven interactions with domain-specific AI agents. Unlike generic chatbots that suffer from hallucination, excessive verbosity, and slow response times, MaDbotS pairs each bot with a strict **`soul.md` specification**, local knowledge databases, function-calling tools, and sub-second inference speeds.

### Core Philosophy
1. **Strict Brevity & Zero Fluff:** Every bot enforces strict output constraints (e.g., line-1 direct answers, no greetings, no generic sycophancy, and hard stops).
2. **Speed-First Inference:** Primary inference runs on Groq's LPUs for near-instant responses (`~0.5s–1.2s`), backed by Google's Gemini models for automated failover.
3. **Tactile Mobile UX:** Designed from the ground up as a native mobile experience, featuring gesture-driven bottom sheets, spring physics, dynamic auto-resizing textareas, and Discord-inspired DM layouts.

---

## 🤖 The Bots (Detailed Profiles)

MaDbotS ships with **3 hyper-specialized built-in agents**, each isolated with its own `soul.md`, dedicated Groq/Gemini API keys, and strict domain guardrails.

### 1. Macro-Chief (`madrix-macros`) — *Personal Nutrition Intelligence*
- **Tagline:** *"Counting every gram of protein from your thali to your shaker."*
- **Primary Engine:** `qwen/qwen3.8-27b` (Groq) → Fallbacks: `openai/gpt-oss-120b` → `openai/gpt-oss-20b` → `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite`.
- **Core Capabilities:**
  - **Exact Meal Calculation:** Parses natural language, shorthand, and partial servings (e.g., *"half burger"*, *"1.5x"*, *"3/6 nuggets"*) and scales macros proportionally.
  - **Local Database Priority:** Reads `personal_food_macros.txt` first (overrides generic estimates), followed by `burger_king_selected_macros.txt` (conditionally loaded only when BK triggers appear), and external lookup only as a last resort.
  - **Personal Tracking Rules:** Strictly enforces personal rules such as **0 g protein** for cooked rice, cooked dal, and Maggi (counting calories only), dry/raw weights for soya chunks, and raw weights for chicken breast.
  - **Live Database Tool Calling (`update_personal_food_db`):** Tell Macro-Chief to add or update a food item (e.g., *"Update paneer to 280 kcal and 20g protein per 100g"*), and it safely updates `personal_food_macros.txt` row-by-row while maintaining a `.bak` backup.
  - **Deterministic Verification (`verify-macros`):** Typing `verify-macros` runs a multi-pass verification skill that reads both databases twice, extracts items to JSON, and sums calories/protein across 4 independent permutations to award a blue **Verified** badge.
- **Output Style:** Plain text `-` bullets, line-1 breakdown start, inline notes only, hard stop after `Daily Total:`.

### 2. Bhima Coach (`bhima-coach`) — *Desi Akhada & Gym Uncle Coach*
- **Tagline:** *"Your akhada uncle for PRs, BMI, and high-protein khurak."*
- **Primary Engine:** `openai/gpt-oss-120b` (Groq) → Fallbacks: `openai/gpt-oss-20b` → `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite`.
- **Persona & Vibe:** Speaks like a caring yet strict veteran *Desi Akhada Ustad / Guruji*—blending Indian-accented Hinglish (*"beta"*, *"shera"*, *"pehelwan"*, *"khurak"*, *"mehnat"*) with evidence-based sports science.
- **Authorized Domains & Capabilities:**
  - **Hypertrophy Training:** Optimal weekly set volume, intensity (RPE/RIR), mechanical tension, and exercise selection.
  - **Powerlifting:** Coaching, bracing cues, and peaking for the Big Three (**Squat, Bench Press, Deadlift**).
  - **1RM & PR Calculator:** Instant estimated 1-Rep Max calculations using Epley / Brzycki formulas.
  - **BMI & High-Protein Indian Diet:** Actionable desi meal splits (*paneer, soya, eggs, chicken, whey*).
- **Strict Scope Guardrail:** Refuses any non-fitness questions (e.g., coding, politics, trivia) in-character: *"Arre beta, main Bhima-Coach hoon—akhada aur gym ka ustad! Yeh sab baatein chhodo aur fitness, diet, ya workout ke sawaal poochho!"*
- **Output Style:** Under 150 words, tight bullets, line-1 action, ends immediately after final bullet or a 5-word punchline.

### 3. Dexter (`madrix-codes`) — *Senior Full-Stack & Systems Nerd*
- **Tagline:** *"DexterCodes: Clumsy with cables, sharp with syntax. What's broken?"*
- **Primary Engine:** `openai/gpt-oss-20b` (Groq) → Fallbacks: `qwen/qwen3.8-27b` → `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite`.
- **Persona & Vibe:** Brilliant, caffeinated dark-mode coder with subtle 3–5 word clumsy nerd quirks (e.g., *\*adjusts glasses\**) paired with razor-sharp technical accuracy.
- **Authorized Domains & Capabilities:**
  - **Supported Languages:** Idiomatic **C++ (C++17/20, STL)**, **Python**, and **JavaScript / TypeScript (ES6+, async/await, Node/DOM)**.
  - **OOP & Architecture:** Encapsulation, Abstraction, Inheritance, Polymorphism, and clean system design.
  - **DSA & Complexity:** Arrays, Trees, Graphs, Heaps, DP, Two Pointers, Sliding Window—always accompanied by **Time & Space Big-O Complexity** (`O(n log n)`).
  - **Bug Fixing:** Fixed code first, followed by 1–2 concise bullets explaining the root cause.
- **Strict Scope Guardrail:** Refuses non-coding topics in-character: *"404 Error: Topic not found in my brain! 😅 I'm Dexter—I only speak in C++, Python, JavaScript, DSA, and bugs."*

---

## ➕ Add Bot Feature (Custom Agent Builder)

Users can create and launch their own custom AI bots directly from the homescreen using the **Add New Agent** modal (`+` button):

| Field | Description | Behavior / Default |
| :--- | :--- | :--- |
| **Agent Name** | Display name for your bot (e.g., *"Study Buddy"*) | Required; automatically generates an initial badge |
| **Description** | Short tagline shown on the homescreen bot card | Required; defaults to *"Custom AI assistant ready to help."* |
| **Gemini API Key** | Dedicated API key for this custom bot | Optional (falls back to default `.env` key). Includes warning to use a separate key to isolate rate limits |
| **Model** | Primary Gemini model ID | Defaults to `gemini-3.5-flash` |
| **Fallback Model** | Backup model ID if primary fails or hits quota | Defaults to `gemini-3.1-flash-lite` |
| **`soul.md` Instructions** | Multiline system prompt defining identity, tone, rules, and output formatting | Injected as `systemInstruction` on every chat turn |
| **Visibility** | Toggle between **Public** and **Private** | Visual badge & configuration metadata |
| **Accent Color** | 5 preset color swatches (`#0066ff`, `#ff2b85`, `#10b981`, `#f59e0b`, `#8b5cf6`) | Themes the bot's avatar badge and send button |

Custom bots are saved immediately to `localStorage` and open directly in the same gesture-driven `ChatDrawer` as built-in bots.

---

## 📱 App Usability & UX Guide

MaDbotS is engineered for effortless one-handed mobile usability and desktop speed:

1. **Homescreen Dashboard:**
   - Full-width bot cards with enlarged `66px` avatars, concise taglines, and instant tap-to-open drawers (with background scroll locking so the homescreen never bounces).
   - Quick `+` action to add custom agents and a clean header (`28px` MaDbotS logo + Settings gear).

2. **Gesture-Driven Bottom Sheets (`ChatDrawer` & `SettingsDrawer`):**
   - **Drag & Swipe Physics:** Pull down on the top drag handle bar to dismiss drawers smoothly with velocity tracking.
   - **Refined Framing:** Features `30px` rounded top corners framed by a crisp, non-glow off-white border across both light and dark modes.

3. **Dynamic Auto-Resizing Input Box:**
   - Starts compact as a single line (`38px`) and **grows automatically** line-by-line as you type or press Enter, capped cleanly at **3 lines (`88px`)**, then shrinks back when lines are deleted.

4. **Discord-Style Chat Feed & Metrics:**
   - **Clear Visual Separation:** Bot replies feature a subtle left accent border; user messages have no left border.
   - **Bold Typography & Timing:** Bot names render in bold **Plus Jakarta Sans** (matching the MaDbotS brand header) alongside response timing (`⚡ 0.85s`) and `AGENT` / `Verified` badges on the exact same line.
   - **Quick Actions:** One-tap **Copy** button and **Star** bookmark button aligned at the top-right of every message.

5. **Private Starred Bookmarks (`localStorage` Isolation):**
   - Double-tap or click the ⭐ icon on any message to bookmark it.
   - Starred messages persist locally across reloads for quick reference, **and are automatically stripped out of `/api/chat` requests** so saved notes never pollute the AI's context window or waste tokens.
   - If saved messages exist on startup, a 1-second skeleton loader runs; otherwise, chats load instantaneously.

6. **Settings & Theme Controls:**
   - **Theme Toggle:** Persistent Light & Dark mode switching.
   - **Thinking Depth Sliders:** Adjust reasoning depth (`minimal`, `low`, `medium`, `high`) per bot with unified blue sliders (`#0066ff`).

7. **PWA Installability:**
   - Open in Safari (iOS) or Chrome (Android/Desktop) and select **Add to Home Screen** / **Install App** for full-screen standalone usage with custom splash animation.

---

## 🔍 Innerview: How It Works

### High-Level Request Flow

```
User Message (PWA Client — starred messages excluded)
       │
       ▼
Next.js App Router API (`/api/chat`)
       │
       ├─► 1. Specialized Skill Check (`verify-macros` deterministic cross-check)
       │
       ├─► 2. Stage 1: Primary Inference (Groq LPUs)
       │       ├─ Macro-Chief : qwen/qwen3.8-27b
       │       ├─ Bhima Coach : openai/gpt-oss-120b
       │       └─ Dexter      : openai/gpt-oss-20b
       │       (Includes 4-turn sliding window & conditional menu injection)
       │
       ├─► 3. Stage 2: Automatic Retry on Rate Limit / Transient Errors (413 / 429)
       │
       └─► 4. Stage 3: Fallback Engine (Google Gemini)
               ├─ Secondary : gemini-3.5-flash-lite
               └─ Fallback  : gemini-3.1-flash-lite
```

### Rate Limits Reference (All Configured Models)

| Model | Provider | Role in App | Free Tier Limits | Paid / Dev Tier |
| :--- | :--- | :--- | :--- | :--- |
| **`qwen/qwen3.8-27b`** | Groq | Macro-Chief (Primary), Dexter (Fallback) | 30 RPM · 1,000 RPD · 7,000–8,000 TPM · 200k TPD | 1,000 RPM · 250k TPM |
| **`openai/gpt-oss-120b`** | Groq | Bhima Coach (Primary), Macro-Chief (Fallback) | 30 RPM · 1,000 RPD · 8,000 TPM · 200k TPD | 1,000 RPM · 250k TPM |
| **`openai/gpt-oss-20b`** | Groq | Dexter (Primary), Bhima & Macro (Fallback) | 30 RPM · 1,000 RPD · 8,000 TPM · 200k TPD | 1,000 RPM · 250k TPM |
| **`gemini-3.5-flash-lite`** | Google | Secondary Fallback & `verify-macros` | 15 RPM · 500 RPD · 250,000 TPM | Pay-as-you-go |
| **`gemini-3.1-flash-lite`** | Google | Final Fallback & `verify-macros` | 15 RPM · 500 RPD · 250,000 TPM | Pay-as-you-go |

### Rate-Limit & Performance Engineering
- **4-Turn Context Slicing:** Only the most recent active turns are sent to Groq, preventing rolling 60-second TPM limit exhaustion (7k–8k TPM ceiling on free tier).
- **Conditional Menu Loading:** `burger_king_selected_macros.txt` is only injected into Macro-Chief's system prompt when Burger King keywords are detected, saving ~2,500+ tokens per standard message.
- **Atomic File Writes:** `update_personal_food_db` performs targeted row-level replacements rather than rewriting entire files, preventing truncation from model output limits.

---

## 📁 Project Structure

```
madbots/
├── public/                     # Icons, PWA assets, and bot avatars
│   ├── avatars/                # Avatars for Dexter, Bhima, and Macro-Chief
│   └── icon-512.jpg            # High-res PWA application icon
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts   # Core chat dispatch & dual-engine fallback router
│   │   ├── chat/[id]/page.tsx  # Standalone chat route
│   │   ├── globals.css         # Tailwind v4 styles, off-white frames & theme tokens
│   │   ├── layout.tsx          # Root layout & PWA viewport settings
│   │   ├── manifest.ts         # Next.js web application manifest
│   │   └── page.tsx            # Homescreen bot cards & Add New Agent modal
│   ├── bots/                   # Bot souls, custom Groq handlers & tools
│   │   ├── bhima-coach/        # Bhima Coach prompt, soul & Groq client
│   │   ├── madrix-codes/       # Dexter prompt, soul & Groq client
│   │   └── madrix-macros/      # Macro-Chief prompt, soul, tools & local databases
│   │       ├── burger_king_selected_macros.txt
│   │       ├── personal_food_macros.txt
│   │       ├── groqMacro.ts
│   │       ├── prompt.ts
│   │       └── tools.ts
│   ├── components/
│   │   ├── ChatDrawer.tsx      # Interactive iOS gesture bottom sheet for chat
│   │   ├── MainHeader.tsx      # Sticky brand header & navigation
│   │   ├── SettingsDrawer.tsx  # Interactive drawer for bot sliders & preferences
│   │   └── SplashScreen.tsx    # App startup splash screen
│   └── lib/
│       ├── bots.ts             # Bot definitions & metadata
│       ├── gemini.ts           # Google Gemini API client & fallback logic
│       └── skills.ts           # Deterministic verify-macros skill
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.18+ or 20+
- npm or pnpm

### 1. Clone & Install
```bash
git clone https://github.com/Devans-bot/MadBots.git
cd MadBots
npm install
```

### 2. Configure Environment Variables
Create a `.env` or `.env.local` file in the root directory:
```env
# Groq API Keys (Primary Fast Inference - separate keys isolate rate limits)
GROQ_API_KEY_MACROS=your_groq_key
GROQ_MODEL_MACROS=qwen/qwen3.8-27b

GROQ_API_KEY_BHIMA=your_groq_key
GROQ_MODEL_BHIMA=openai/gpt-oss-120b

GROQ_API_KEY_DEXTER=your_groq_key
GROQ_MODEL_DEXTER=openai/gpt-oss-20b

# Google Gemini API Keys (Secondary Fallback & Skills)
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3099](http://localhost:3099) in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 15.5](https://nextjs.org/) (App Router)
- **UI Library:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Animation:** [GSAP 3](https://greensock.com/gsap/)
- **Icons & Typography:** Google Material Symbols Outlined, Plus Jakarta Sans
- **Inference Engines:** Groq API (LPU Inference) & Google Generative AI (Gemini)

---

## 📄 License
Private & Proprietary — Built for high-speed personal productivity.
