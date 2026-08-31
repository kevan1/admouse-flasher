/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "admouse.net", pathname: "/img/**" }],
  },
};

module.exports = nextConfig;
