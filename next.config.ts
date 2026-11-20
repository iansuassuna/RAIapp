import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Habilita forbidden()/unauthorized() — usado para bloquear acesso a eixos de outros membros.
    authInterrupts: true,
  },
};

export default nextConfig;
