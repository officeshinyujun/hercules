import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "hercules", "better-sqlite3"],
};

export default nextConfig;
