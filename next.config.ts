import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "www.vlr.gg",
      },
      {
        protocol: "https",
        hostname: "vlr.gg",
      },
      {
        protocol: "https",
        hostname: "owcdn.net",
      },
      {
        protocol: "https",
        hostname: "www.owcdn.net",
      },
      {
        protocol: "https",
        hostname: "liquipedia.net",
      },
      {
        protocol: "https",
        hostname: "static.wikia.nocookie.net",
      },
    ],
  },
};

export default nextConfig;
