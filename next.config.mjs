/** @type {import('next').NextConfig} */
const onVercel = !!process.env.VERCEL;
const nextConfig = {
  reactStrictMode: true,
  ...(onVercel
    ? {}
    : { output: "export", basePath: "/fundedcore", trailingSlash: true, images: { unoptimized: true } }),
};
export default nextConfig;
