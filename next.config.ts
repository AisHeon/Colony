import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Postgres/PGlite drivers are native-ish and must never be bundled for the browser.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // The serverless PGlite fallback needs its SQL and WASM assets in the bundle.
  outputFileTracingIncludes: {
    "/*": ["./db/*.sql", "./node_modules/@electric-sql/pglite/dist/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
