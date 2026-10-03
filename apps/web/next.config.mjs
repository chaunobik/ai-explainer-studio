/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
    serverComponentsExternalPackages: [
      "@remotion/bundler",
      "@remotion/renderer",
    ],
  },
};

export default nextConfig;
