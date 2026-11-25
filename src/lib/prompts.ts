import { getMacrosPrompt } from "@/bots/madrix-macros/prompt";
import { getCodesPrompt } from "@/bots/madrix-codes/prompt";
import { getBhimaPrompt } from "@/bots/bhima-coach/prompt";

// Server-only: imported by the API route, never by pages, so prompts stay out of the browser bundle.
export const PROMPTS: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  {
    get(_target, prop: string | symbol) {
      if (prop === "madrix-macros") return getMacrosPrompt();
      if (prop === "madrix-codes") return getCodesPrompt();
      if (prop === "bhima-coach") return getBhimaPrompt();
      return "";
    },
  }
);
