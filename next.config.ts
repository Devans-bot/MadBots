import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/chat": [
      "./src/bots/madrix-macros/*.txt",
      "./src/bots/madrix-macros/*.md",
      "./src/bots/bhima-coach/*.md",
      "./src/bots/madrix-codes/*.md",
      "./src/bots/madrix-rehab/*.md",
    ],
  },
};

export default nextConfig;
