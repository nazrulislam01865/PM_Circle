# PM Circle — design guideline/font and About Us parity

**Source:** Archive 10(2).zip, updated 23 November 2026.  
**Approved source:** `PM_Circle_Design_Guidelines (1)(20261123-171745).html`, byte-for-byte identical to the project's existing `PM_Circle_Design_Guidelines (1).html` (SHA-256 `65deeac0a56494248ccaa0f46147f315b612cde0e3b134c117f25c594a36952c`).

## Why About Us looked different

- Earlier `pm-about.css` selected generic `clamp(... vw ...)` H1/H2 values using the **browser viewport**. The comparison screenshot shows two browser windows of different apparent widths, so the title/heading sizes can differ even where the layout rail is identical.
- The About H1 specified weight 750. The project loads Google Inter weight 800, whereas the guideline's embedded static Inter faces include 400, 600 and 700. A requested 750 can resolve to a heavier 800 on the website than in the guide.
- The global shared body baseline still used the **older** UI guide's 15px/24px; the new HTML guideline specifies 16px with a unitless 1.6 line height. About had a local 16px body already, which made the project feel inconsistent.

## Implementation

- `resources/css/pm-design-tokens.css`: use the newest guideline's base font size (`1rem`) and line rhythm (`1.6`) across the application. Preserve the single global Inter family and existing semantic guide palette. Add a centered-rail responsive H1 and a compact *About Us prototype* H2 variant, both expressed in centralized tokens and within the guide's heading size bounds.
- `resources/css/pm-about.css`: apply these central sizes only inside `.pm-about-wrap`; use `container-type:inline-size` so the same homepage content rail determines the scale, rather than the surrounding browser width. Provide an `@supports` fallback to the existing canonical vw guide sizing for older browsers. Match the guide's embedded static H1 face at weight 700; do not alter section text, CTA links, layout grid, cards or footer.
- Existing homepage, member, admin, exam and public stylesheet font families were audited: feature CSS uses tokens/inheritance rather than separately hard-coding a typeface. Native email templates retain standard email-client-safe fallbacks and are not part of the interactive page layout.
- `tests/Regression/designGuideSystemParity.test.mjs`: guard the embedded guide's semantic color/type values, the global Inter/body rhythm, page-scoped responsive headings and font-family centralization.
- Update two older test assertions that treated the previous 15px body style guide as authoritative. No previously approved page structures or application logic were rewritten.

## Scope and important boundaries

The system's **font family and default body text** are centralized and aligned with the latest guide. Specialized, already-approved screenshot layouts (homepage cards, compact navigation, exam simulator, administrative data tables, and sidebar) retain their **component-specific typography and spacing** rather than being globally enlarged by an overly broad CSS override. The guide's `.pm` sample is a design reference, not a stylesheet pasted over all existing components.

Changing every legacy component-specific font size, shadow, padding or button width without side-by-side screenshot QA would risk breaking existing approved prototypes. This patch deliberately does not claim complete pixel parity on every route.

## Verification

Run these from the project directory:

```bash
node --experimental-strip-types --test tests/Regression/*.test.mjs
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

The regression suite and static CSS parsing were run in the packaging environment. A full Laravel-authenticated, page-by-page browser visual review and production bundle were **not** run here. The headless browser attempt timed out, so visual parity is not claimed.

**Database:** no migration or seeding.  
**Deployment:** rebuild Vite assets before serving the modified CSS; retain `.env` and production storage; do not run destructive commands.
