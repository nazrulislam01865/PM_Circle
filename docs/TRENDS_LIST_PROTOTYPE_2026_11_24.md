# Trends list — approved public prototype (2026-11-24)

## Scope
- Rebuilt `/pm-trends` using PublicLayout, the shared homepage offer/header/footer, the existing legal banner, approved guide controls and centralized design tokens.
- Three exact visible sample report titles, summaries, topic labels and displayed date (22 Nov 2026). The sample notice distinguishes them from live research. All images are local WebP crops from the supplied high-resolution screenshot, using HomePhoto fallback.
- Search is local and initialized from the existing `?search=` URL. Topic and saved-only filters combine, report count updates, empty states are explicit. Saved reports use the existing detail-page localStorage key, with safe handling when storage is unavailable. No new API calls, DB queries, migrations or AI generation.
- Existing article detail layout and all five legacy article URLs remain unchanged. The new sample reports open through the existing detail route, with short illustrative educational bodies. Older articles remain accessible by their original URLs but are not listed in the new three-report prototype. Exact deep source URLs were not supplied; the source names are reproduced and links go to the respective source website (PMI, Bdjobs, Scrum Guides), not an asserted exact source article.
- The shared header only gains an `aria-current` marker for the Trends list; the new active styling is scoped to this page. Authenticated member shell is preserved. No changes to existing careers or article stylesheet. The previously removed footer mockup attribution is not restored.

## Design roles
- Existing centralized Inter, 16px body, 14px metadata/controls, 24px report heading, shared banner H1, guide line height, palette, spacing, card radius, controls and focus.
- Four semantic centralized report tokens: reading rail 57.5rem, photo width 15rem, title tracking -.04em, row inset 1.125rem (derived from spacing tokens).
- Two-column desktop filters and rows; single-column mobile layout. No independent font family or hardcoded page stylesheet color or font size.

## Verification
- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 271 passed, 0 failed (267 existing + 4 new).
- TypeScript transpile syntax checks for all five changed TS/TSX modules passed. Full type check not run (dependencies missing).
- Isolated Chromium content preview with compiled project CSS, updated source CSS and supplied guide Inter: 1680, 1050, 768, 390, 320px, no horizontal overflow, three local images load. At 1680px: list 920px, thumbnails 240x150px, body 16px, report headings 24px, first row 187px. Compared against reference normalized to 1680px. Header/footer were not rendered in isolated preview.
- `npm run build`: unavailable (`vp: not found`); Laravel full runtime not verified. Original compiled assets retained. Install dependencies if needed, use project's supported Node version, then `npm run build` and `php artisan optimize:clear`. Verify `/pm-trends` in actual browser, including live font loading, navigation and footer. No database migration required.

## Follow-up: align listing with shared page body rail (2026-11-24)
- Supersedes the original narrow 57.5rem report-list width. Both the banner and report body now use the existing `pm-public-trends-wrap` width from `--pm-v2-container-width`. No new container or token, and no changes to header/footer, reports, controls, typography, or data logic.
- 272 regression checks passed (one additional rail regression). Isolated Chromium verified identical banner/body left edges and widths at 1680, 1050, 768, 390 and 320px; no horizontal overflow and all three photos loaded. At 1680px both rails are approximately 1179px, with original 240x150px desktop thumbnails.
- Production build still unavailable (`vp: not found`); rebuild locally before verifying the full application.
