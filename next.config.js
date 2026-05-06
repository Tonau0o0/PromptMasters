/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export for Electron production packaging.
  // `next dev` is unaffected; only `next build` outputs to /out.
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true, // required for static export
  },
};

module.exports = nextConfig;
