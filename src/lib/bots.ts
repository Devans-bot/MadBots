export const LEVELS = ["minimal", "low", "medium", "high"] as const;
export type Level = (typeof LEVELS)[number];
export type CustomBotConfig = {
  apiKey?: string;
  model?: string;
  fallbackModel?: string;
  soul?: string;
  visibility?: "public" | "private";
};

export type Bot = {
  id: string;
  name: string;
  tagline: string;
  initial: string;
  color: string;
  level: Level;
  avatar?: string;
  customConfig?: CustomBotConfig;
};

// Public bot info. Add more bots by adding an object here AND a prompt in prompts.ts.
export const BOTS: Bot[] = [
  {
    id: "madrix-macros",
    name: "Macro-Chief",
    tagline: "Counting every gram of protein from your thali to your shaker.",
    initial: "M",
    color: "#e5372d",
    level: "low",
    avatar: "/avatars/madrix-macros.jpg",
  },
  {
    id: "bhima-coach",
    name: "Bhima Coach",
    tagline: "Your akhada uncle for PRs, BMI, and high-protein khurak.",
    initial: "B",
    color: "#f59e0b",
    level: "medium",
    avatar: "/avatars/bhima-coach.jpg",
  },
  {
    id: "madrix-codes",
    name: "Dexter",
    tagline: "DexterCodes: Clumsy with cables, sharp with syntax. What’s broken?",
    initial: "D",
    color: "#2563eb",
    level: "medium",
    avatar: "/avatars/dexter.jpg",
  },
  {
    id: "madrix-rehab",
    name: "Rehab-Rishi",
    tagline: "Calm sports physio for injury recovery, mobility & pain-free lift swaps.",
    initial: "R",
    color: "#0ea5e9",
    level: "medium",
    avatar: "/avatars/madrix-rehab.jpg",
  },
];
