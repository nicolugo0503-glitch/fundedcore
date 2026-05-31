/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/fundedcore",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};
export default nextConfig;
