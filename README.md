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

**MaDbotS** is a progressive web application (PWA) built for lightning-fast, purpose-driven interactions with domain-specific AI agents. Unlike generic chatbots that suffer from hallucination, excessive verbosity, and slow response times, MaDbotS pairs each bot with a strict **"Soul" specification**, a dedicated local knowledge database, tool-calling capabilities, and sub-second inference speeds.

### Core Philosophy
1. **Strict Brevity & Zero Fluff:** Every bot enforces strict response constraints (e.g., direct line-1 calculations, no greetings, no generic apologies, no unsolicited advice).
2. **Speed-First Inference:** Primary inference is offloaded to Groq's LPUs for near-instant responses, backed by Google's Gemini models for automated failover.
3. **Tactile Mobile UX:** Designed from the ground up as a native mobile experience, featuring gesture-driven bottom sheets, spring physics, dynamic auto-resizing textareas, and Discord-style DM layouts.

---

## 🤖 The Bots

| Bot | Persona | Core Focus | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Macro-Chief** (`madrix-macros`) | Personal Nutrition Intelligence | Daily meal macro calculation & diet database | Exact calorie/protein tracking, 0g protein rules for staple carbs (rice/dal/Maggi), live row-level database updates (`update_personal_macro_db`), multi-pass `verify-macros` skill. |
| **Bhima Coach** (`bhima-coach`) | Old-School Akhada Coach | Heavy lifting, PR progression, hypertrophy | Progressive overload logs, biomechanics form fixes, high-protein Indian diet enforcement, tough-love accountability without generic hype. |
| **Dexter** (`madrix-codes`) | Senior Full-Stack & Systems Engineer | Architecture, debugging, systems code | Minimal production-ready code snippets, root cause debugging, strict typing, zero pleasantries or boilerplate fluff. |

---

## ✨ Features

### 1. Mobile-First Interaction Design
- **Gesture Bottom Sheets (`ChatDrawer` & `SettingsDrawer`):** Fluid touch-enabled drawer with pull-to-dismiss physics, drag velocity detection, and snap points.
- **Dynamic Input Box:** Auto-expanding textarea that grows smoothly from 1 line to a maximum of 3 lines (`88px`) as you type and shrinks back down when deleting text.
- **Discord-Inspired Message Feed:** Clean message rows with avatar grouping, distinct bot left borders, response timing metrics (`⚡ 0.85s`), verified badges, and quick copy triggers.
- **Client-Side Star Bookmarking:** Double-tap or star any message to bookmark it. Starred messages are saved in browser `localStorage` and never inflate model context windows.
- **Off-White Minimalist Frame:** Elegant 30px rounded top corners with a crisp, non-glow off-white frame in both light and dark modes.

### 2. PWA & Standalone Capability
- Installable on iOS (Safari Add to Home Screen) and Android (Chrome PWA).
- Custom splash screen with typing brand animation, standalone manifest, and custom app icons.

### 3. Settings & Customization
- Adjust model thinking meters (`minimal`, `low`, `medium`, `high`).
- Theme toggle supporting persistent Light & Dark modes.
- Support for custom bot configurations and custom API key injection.

---

## 🔍 Innerview: How It Works

### High-Level Architecture

```
User Message (PWA Client)
       │
       ▼
Next.js App Router API Route (`/api/chat`)
       │
       ├─► 1. Specialized Skills Check (e.g., `verify-macros` cross-verification)
       │
       ├─► 2. Stage 1: Primary Inference (Groq LPUs)
       │       - Macro-Chief: Qwen 2.5 32B / Llama 3.3 70B Versatile
       │       - Bhima Coach: Llama 3.3 70B Versatile
       │       - Dexter: Llama 3.3 70B Versatile
       │       - Auto-tool calling (e.g. `update_personal_macro_db`)
       │
       ├─► 3. Stage 2: Automatic Retry on Rate Limit (413 / 429 TPM)
       │
       └─► 4. Stage 3: Fallback Engine (Google Gemini)
               - Secondary: `gemini-3.5-flash-lite`
               - Fallback: `gemini-3.1-flash-lite`
```

### 1. Dual-Engine Resilience Pipeline
To guarantee continuous availability without breaking rate limits:
- **Groq Primary Engine:** Handles 95%+ of traffic with ultra-low latency (<1.2s roundtrip).
- **Token Budget Guard:** Recent conversation history is sliced to the last 4 turns, and large menus (like the 280-line Burger King database) are conditionally injected only when relevant triggers are detected (`bk`, `whopper`, `burger king`).
- **Automatic Multi-Tier Fallback:** If Groq encounters temporary rate limits (413 Payload Too Large or 429 TPM exhaustion), the request automatically falls back to Google Gemini (`gemini-3.5-flash-lite` → `gemini-3.1-flash-lite`) without user disruption.

### 2. Persona Engine (`soul.md`)
Every bot has its own `soul.md` markdown document defining:
- Personality quirks, tone constraints, and vocabulary.
- Strict output formats (e.g., `- [Food]: [Calories] kcal, [Protein] g protein`).
- Exclusion rules and priority data hierarchy.

### 3. Tool Calling & Atomic Database Sync
When Macro-Chief is instructed to update food items (e.g., *"Update paneer to 280 kcal and 20g protein"*):
1. The model invokes the structured function `update_personal_macro_db`.
2. The server executes row-level replacement in `personal_food_macros.txt`.
3. An automatic backup (`personal_food_macros.txt.bak`) is verified before changes are committed to disk.

### 4. Deterministic Macro Verification (`verify-macros`)
Typing `verify-macros` activates a multi-stage skill:
1. Re-reads both nutrition databases twice from disk to confirm cache integrity.
2. Extracts itemized components into structured JSON.
3. Computes calorie and protein sums across four independent permutations.
4. Awards a blue **Verified** badge if and only if all calculation passes match deterministically.

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
│   │   ├── globals.css         # Tailwind v4 styles, custom frames & theme tokens
│   │   ├── layout.tsx          # Root layout & PWA viewport settings
│   │   ├── manifest.ts         # Next.js web application manifest
│   │   └── page.tsx            # Main dashboard & active bot list
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
│       └── skills.ts           # Verification and auxiliary bot skills
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
Create a `.env.local` file in the root directory:
```env
# Groq API Key (Primary Fast Inference)
GROQ_API_KEY=your_groq_api_key

# Google Gemini API Key (Secondary Fallback Engine)
GEMINI_API_KEY=your_gemini_api_key

# Optional Model Overrides
GROQ_MODEL=llama-3.3-70b-versatile
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
- **Inference Engines:** Groq SDK (LPU Inference) & Google Generative AI (Gemini)

---

## 📄 License
Private & Proprietary — Developed with precision for personal productivity.
