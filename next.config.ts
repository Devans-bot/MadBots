import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/chat": ["./src/bots/madrix-macros/*.txt"],
  },
};

export default nextConfig;
