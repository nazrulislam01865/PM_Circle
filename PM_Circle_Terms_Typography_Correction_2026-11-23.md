# Terms and Conditions typography correction — 2026-11-23

Source: Archive 12.zip. Reference: PM_Circle_Design_Guidelines (1)(6).html.

- Terms page H1: shared `--pm-guide-text-h1` (32–49.6px at a 16px root), rather than a separate legal title scale.
- Terms section H2: shared `--pm-guide-text-h2` (24–32px), rather than the 18px card-title scale.
- Contents-panel label: shared `--pm-guide-text-h4` (16px, weight 650) rather than 14px metadata.
- Body paragraphs remain 16px / 1.6; metadata and links remain 14px.
- No content, routes, controllers, queries, migrations, shared components, enrollment or legal text changed.
- This patch is scoped to `resources/css/pm-terms.css` and the Terms regression test.
- The source ZIP excludes stale Vite assets, runtime caches and local session files. Run `npm ci && npm run types:check && npm run build`, followed by `php artisan optimize:clear`.
- A browser-based pixel comparison should be performed after rebuilding in the user's environment; source-level checks do not establish pixel parity.
