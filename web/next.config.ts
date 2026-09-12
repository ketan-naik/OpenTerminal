import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// API requests are proxied by web/app/api/[...path]/route.ts instead of a
// rewrite here, so the shared API key can be attached server-side. See
// web/lib/api-key.ts.
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
