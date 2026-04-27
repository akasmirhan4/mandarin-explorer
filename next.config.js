/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {};

export default config;

// Enable Cloudflare bindings (env, KV, etc.) inside `next dev`.
// No-op outside the Workers/dev environment.
if (process.env.NODE_ENV === "development") {
  const { initOpenNextCloudflareForDev } = await import(
    "@opennextjs/cloudflare"
  );
  await initOpenNextCloudflareForDev();
}
