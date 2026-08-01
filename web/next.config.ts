import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright is a heavy native dep used only by the local admin ingest route.
  // Keep it external so the bundler doesn't try to trace/bundle it.
  serverExternalPackages: ["playwright"],
};

export default nextConfig;
