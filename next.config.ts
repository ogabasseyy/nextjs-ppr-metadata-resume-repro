import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cache Components (formerly experimental.ppr + dynamicIO) — top-level in 16.2.9.
  // Enables Partial Prerendering: a static shell is prerendered at build time
  // and dynamic holes are streamed / resumed at request time.
  cacheComponents: true,
  // Docs say this "fully disables streaming metadata". But the app-page template's
  // no-UA branch still forces the STREAMING metadata tree shape when the PPR shell
  // is prerendered at build time, while a non-empty runtime UA renders the BLOCKING
  // shape. The two tree shapes differ (hidden <div> wrapper vs direct
  // <__next_metadata_boundary__>), so the PPR resume aborts. (#93401)
  htmlLimitedBots: /.*/,
};

export default nextConfig;
