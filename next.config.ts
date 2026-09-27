import type { NextConfig } from "next";

const staticExport = process.env.MIRRORCRAFT_STATIC_EXPORT === "1";
const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
const configuredBasePath = process.env.MIRRORCRAFT_PAGES_BASE_PATH;
const pagesBasePath = configuredBasePath ?? (repository ? `/${repository}` : "");

const nextConfig: NextConfig = staticExport
  ? {
      output: "export",
      trailingSlash: true,
      basePath: pagesBasePath,
      assetPrefix: pagesBasePath || undefined,
      images: {
        unoptimized: true,
      },
    }
  : {
      output: "standalone",
    };

export default nextConfig;
