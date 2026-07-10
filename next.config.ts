import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle for containerized deployment (Cloud Run).
  output: "standalone",
  turbopack: {
    // Keep the Neo4j app root as the Turbopack root (avoids picking up spanner-app lockfile).
    root: path.join(__dirname),
  },
};

export default nextConfig;
