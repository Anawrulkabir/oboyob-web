import type { NextConfig } from "next";

// Files the slip PDF reads from disk at runtime, which build tracing misses.
const SLIP_FILES = [
  "./assets/fonts/**",
  "./public/images/logo.png",
  "./node_modules/harfbuzzjs/dist/*.wasm",
  "./node_modules/pdfkit/js/data/**",
];

const nextConfig: NextConfig = {
  // The payment-slip PDF (lib/slip-pdf.ts): keep these as plain Node packages
  // (pdfkit reads its font data from disk, harfbuzzjs loads a .wasm file) and
  // ship the Bangla fonts with the functions that render slips.
  serverExternalPackages: ["pdfkit", "harfbuzzjs", "nodemailer"],
  outputFileTracingIncludes: {
    "/order/**": SLIP_FILES,
    "/admin/**": SLIP_FILES,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Supabase Storage public buckets
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
