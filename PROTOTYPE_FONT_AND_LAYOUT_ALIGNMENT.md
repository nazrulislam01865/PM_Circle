# PM Circle public-home prototype alignment (21 November 2026)

Source archive: Archive(7).zip
Reference: https://pm-circle-homepage-preview.md-islam-aminul.chatgpt.site/
Screenshot: user-supplied 653 x 2048 full-page reference (desktop scaled).

## Scope and implementation

- Global UI font family is now Inter (via the single `--font-ui` token). The app shell loads the Google Fonts stylesheet; standalone resume preview/export pages use Inter too. This replaces the previous Rajdhani selection. No global font-size tokens were changed.
- The public homepage uses a 22px/28px section heading, with a 32px to 36px responsive hero headline. Dimensions are controlled by `resources/css/pm-design-tokens.css`.
- Public certification cards now have 2:1 photo proportions and 180px minimum content panel height at desktop sizes. Course content panels are 224px minimum at desktop sizes. Mobile retains its own compact content heights.
- The offer strip, hero tab bar, footer, community background and join CTA use separate homepage-only color tokens sampled from the provided reference screenshot. This prevents the former one-color-for-every-dark-region difference.
- Retained existing admin-configured content, sections, routes, authorization rules, central footer data, and PostCardV2 / engagement behavior. No backend / DB modifications were needed for this font/layout pass.

## Important limitations

The available tools could not fetch the live prototype URL, so its computed CSS and exact font source could not be inspected. Inter was selected by close visual comparison with the supplied screenshot; **font identity and pixel-perfect parity have not been verified**. The reference photo originals were not supplied and some homepage media currently requests the prototype's `/photos/` URLs, falling back to existing project assets when unavailable.

## Build and deploy

The previous `public/build` folder is intentionally not included because it contains compiled files from before this change. The project must be built using a Node version compatible with the existing Vite Plus package (Node 22.18+ or 24.11+) and with the original lockfile:

```
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

Back up and check the destination app and `.env` before overlaying new code. Upload `public/build` from the new build. Do not change database tables or run migrations for this design-only revision.

## Verification

- Node static regression suite `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 160 passed / 0 failed.
- PHP lint `app/Http/Controllers/PublicSite/HomeController.php`: passed.
- TypeScript parse for homepage and referenced core components: passed.
- CSS token, layout and responsive parse: passed.
- Full Vite production build and pixel-by-pixel browser match: not verified in this environment.

**Note:** The source ZIP excludes webfont files as distributable font assets. Inter is loaded from Google Fonts at runtime with operating-system fallbacks. Existing personal/production font resources can be retained separately if needed for rollback.
