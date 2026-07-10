import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle for containerized deployment (Cloud Run).
  output: "standalone",
};

export default nextConfig;
