# Next.js PPR metadata resume mismatch — minimal public repro

Minimal reproduction of the **PPR / Cache Components metadata resume mismatch**
tracked in [vercel/next.js#93401](https://github.com/vercel/next.js/issues/93401)
(fix PR [#94630](https://github.com/vercel/next.js/pull/94630), related
[#92087](https://github.com/vercel/next.js/issues/92087)).

Under `cacheComponents` + a PPR route with an async `generateMetadata`, the
**build-time (no-UA) shell is prerendered with the streaming-metadata tree
shape** (metadata boundary wrapped in a hidden `<div>`), while a **runtime
request renders the blocking-metadata shape** (`<__next_metadata_boundary__>`
emitted directly). React's PPR resume sees two different tree shapes and aborts,
falling back to client rendering — and **the page's `<title>`/OG/canonical tags
never land in the initial `<head>` for browser requests** (SEO-visible).

## Versions

```
next     16.2.9   (stock npm registry — NOT patched)
react    19.2.0
react-dom 19.2.0
node     v24 (also observed on 23.x)
config   cacheComponents: true, htmlLimitedBots: /.*/
```

## Reproduce (3 commands)

```bash
pnpm install          # or npm install
pnpm build
pnpm start            # serves on http://localhost:3210
```

Then, in another terminal:

```bash
pnpm repro:check      # node repro-check.mjs
```

…or probe manually:

```bash
# Browser UA — metadata is STREAMED (title missing from initial <head>)
curl -sS -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' \
  http://localhost:3210/product/abc | grep -o '<head>.*</head>' | grep -c '<title>'

# Googlebot UA — metadata is BLOCKING (title present in initial <head>)
curl -sS -A 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Safari/537.36' \
  http://localhost:3210/product/abc | grep -o '<head>.*</head>' | grep -c '<title>'
```

## Observed vs. expected

**Observed** — the server log emits the resume mismatch on every browser-UA
request (deterministic, 5/5), digest is stable per build:

```
⨯ Error: Expected the resume to render <div> in this slot but instead it
  rendered <__next_metadata_boundary__>. The tree doesn't match so React will
  fallback to client rendering.
  digest: '3627264437'   // varies per build
```

`repro:check` output:

```
browser  : { status: 200, titleInHead: false, hiddenMetadataWrapper: true }
googlebot: { status: 200, titleInHead: true,  hiddenMetadataWrapper: false }
```

| Request UA | `<title>` in initial `<head>` | Metadata shape          |
| ---------- | ----------------------------- | ----------------------- |
| Browser    | **missing**                   | streamed via `<div hidden>` → resume aborts → client fallback |
| Googlebot  | present                       | blocking                |

**Expected** — a route configured to "fully disable streaming metadata"
(`htmlLimitedBots: /.*/`) should use a **consistent metadata tree shape** across
the prerender (no-UA) path and runtime requests, so the PPR resume succeeds and
the `<title>`/OG/canonical tags are present in the initial `<head>` for every UA.

## Why the shape diverges

The app-page template picks streaming vs. blocking metadata per request:

```ts
const serveStreamingMetadata =
  botType && isRoutePPREnabled
    ? false
    : !userAgent            // ← the no-UA prerender/export path forces STREAMING
      ? true
      : shouldServeStreamingMetadata(userAgent, htmlLimitedBots);
```

- **Build / export (no UA)** → `!userAgent` → `true` → shell postponed with the
  **streaming** metadata shape (hidden `<div>` wrapper).
- **Runtime, non-empty UA, `htmlLimitedBots: /.*/`** →
  `shouldServeStreamingMetadata(ua, /.*/)` → `false` → **blocking** shape.

The prerendered shell and the resumed runtime tree therefore disagree, so React
falls back to client rendering. See #93401 for the analysis and #94630 for the
proposed fix.

## What's in this repo

- `app/product/[id]/page.tsx` — PPR route with `generateStaticParams` (so the
  shell is prerendered at build), an async `generateMetadata` reading `params`,
  and a Suspense-wrapped uncached `RuntimeMarker` (the postponed hole that gets
  resumed). The cached lookup (`lib/data.ts`, `'use cache'`) is read inside the
  postponed boundary.
- `app/layout.tsx` / `app/globals.css` — also includes the sibling static-fallback
  pattern from **#92087**: a `position: absolute` PPR fallback hidden via a
  `:has()` selector once the streamed content arrives, plus a small `'use client'`
  interactive header. That path is edge-CPU-throttle sensitive and is **not**
  reproducible via local `next start` (see note below).
- `next.config.ts` — `cacheComponents: true`, `htmlLimitedBots: /.*/`.
- `repro-check.mjs` — automated probe (`pnpm repro:check [baseUrl]`).

## Live deployment

Deployed to Vercel — curl the deployed URL with the two UAs above to see the
same divergence in production. See the repo's deployment link.

## Note on #92087 (edge-only)

The sibling static-fallback + `:has()` + hydrating client chrome pattern
(interactive chrome reconciling against a `position: absolute` static PPR
fallback sibling) produces hydration errors (#418 / #423 / #425) **only on
Vercel's edge resume under CPU contention/throttle**. We could not reproduce it
via local `next start` (matches our production experience). The layout here is
the minimal substrate for that scenario; the deployed URL is the place to
exercise it under real edge conditions.

## Links

- Issue: https://github.com/vercel/next.js/issues/93401
- Fix PR: https://github.com/vercel/next.js/pull/94630
- Related (edge hydration): https://github.com/vercel/next.js/issues/92087
