# PM Circle Contact and Footer Prototype Alignment (2026-11-14)

## Scope
- Increased the Contact page and reusable footer content container to the wide proportions shown in the supplied contact screenshots.
- Preserved two desktop columns, mobile stacking, and centralized fonts, spacing, colors, and control sizes. The wider max-width is a contact/footer-specific design token; other page content widths remain unchanged.
- Removed the "Find your next step in project management" promotional CTA from the shared dark footer. The Contact page continues using the light compact footer.
- Kept email verification, rate limiting, spam controls, support configuration, and the offline-only chat notice unchanged.
- Kept the Send message button visually enabled like the approved prototype: when support email is not configured, clicking it displays an error and does not issue a request.

## Configuration limitation
The mockup's `support@pmcircle.com` is reference artwork, not verified contact information. Set `PMC_SUPPORT_EMAIL` to a real support inbox to display the actual address and enable the submission pipeline. Real-agent chat and newsletter submission are not available, so no online status or successful subscription is simulated.

## Verify
```sh
php tests/Regression/ContactPageAndFooterStaticCheck.php
APP_ENV=testing php artisan test --filter=PublicContactTest
npm run types:check
npm run build
```
Check /contact in a desktop and mobile browser with and without a configured support mailbox. Compare against the approved contact prototype, and check another public page to ensure the dark shared footer has no promotional CTA. No migration is required.
