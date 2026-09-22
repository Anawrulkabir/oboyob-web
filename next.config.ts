import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The payment-slip PDF (lib/slip-pdf.ts): keep these as plain Node packages
  // (pdfkit reads its font data from disk, harfbuzzjs loads a .wasm file) and
  // ship the Bangla fonts with the functions that render slips.
  serverExternalPackages: ["pdfkit", "harfbuzzjs"],
  outputFileTracingIncludes: {
    "/order/**": ["./assets/fonts/**", "./node_modules/harfbuzzjs/dist/*.wasm", "./public/images/logo.png"],
    "/admin/**": ["./assets/fonts/**", "./node_modules/harfbuzzjs/dist/*.wasm", "./public/images/logo.png"],
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
