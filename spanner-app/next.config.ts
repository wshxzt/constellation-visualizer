import path from "node:path";
import type { NextConfig } from "next";

const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@google-cloud/spanner"],
  // Include shared UI from the monorepo root in the standalone trace.
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
