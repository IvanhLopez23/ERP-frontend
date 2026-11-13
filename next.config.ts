import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Las fotos viven en el backend y se sirven por /api/media; no usamos el
    // optimizador de Next para no depender de `sharp`.
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
