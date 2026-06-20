import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server build (.next/standalone) for Docker.
  output: "standalone",
};

export default nextConfig;
