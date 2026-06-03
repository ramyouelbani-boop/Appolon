import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // En dev local : forward /api/* vers FastAPI sur localhost:8000.
    // En prod Vercel : pas de rewrite, Vercel route directement vers la
    // serverless function Python dans /web/api/index.py via vercel.json.
    if (process.env.NODE_ENV === "development") {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      return [
        { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
      ];
    }
    return [];
  },
};

export default nextConfig;
