# PM Circle — Signup, plan transitions and community interaction alignment

## Scope and root cause

The prior signup first screen included password creation, and account creation happened before the professional-details step. Signup component styles used a second, smaller font/control system instead of PM Circle's approved shared tokens. Plan duration options were conditionally mounted, causing abrupt height changes. The dashboard feed invented a `From the community` fallback post title and hardcoded demo engagement counts. The public community feed linked to posts instead of providing the same reaction picker used on the homepage.

## Implementation

- Email verification is Step 1. The server stores a time-limited verified pending address in the current session; no account is created at this stage. Step 2 creates the account and saves the professional profile (including password, full name, role, experience, certifications and optional quarantined resume). Existing signed-in members may still edit their Step 2 profile without re-entering a password. Step 3 remains plan selection.
- `App\Support\SignupPasswordRules` centralizes the server rule (8+ characters, both letter cases, number and symbol, confirmed). The client displays each criterion and mismatch feedback. Registration requires explicit legal consent. Both direct registration and staged registration use the same backend password requirements. The existing password-reset policy is unchanged.
- The signup stylesheet now consumes `pm-circle.css` tokens: centralized Arial/Noto Sans Bengali font, typography, input heights, button heights, accessible focus, colors, spacing and radii. The PM Circle app-wide `--pm-font-family` and Tailwind `--font-sans` now resolve to the approved `--font` token. This intentionally aligns other PM Circle pages' font family; no other page layouts were redesigned.
- The plan-duration panel remains mounted but is inert when collapsed. Grid-row and opacity transitions smoothly expand and collapse it without a JavaScript animation, with reduced-motion support.
- A shared `PostEngagementActions` control is used on the marketing homepage, public community feed, member dashboard, and post details. It uses the seven existing reaction types, one selection per user per post, a responsive hover/touch picker, and the existing authenticated reaction endpoints. Comments link to the existing post comment flow. Sharing copies the canonical post link; no unverified share counter is displayed. The optional Save action uses the existing database-backed `post_saves` endpoints.
- The dashboard no longer renders generic post titles or fabricated reaction/like/comment/share totals. It shows the actual title only when stored on the post. Real reaction totals (`withCount`) and comment totals are returned for a bounded two-post preview. The public feed retrieves the viewer's reactions in one batched lookup per page. Author/profile relations are eager-loaded; Postgres's existing unique `(post_id,user_id)` constraint makes updates idempotent.
- Guests receive the existing join-community dialog when attempting to react, comment or share. Authentication, email-verification and onboarding entitlements remain enforced by the backend route group.

## Database impact

No migrations or seeders are introduced. Existing users, posts, comments, post_reactions, post_saves and current membership records are retained. New reactions are persisted by existing routes. There are no destructive operations and no fabricated counter values.

## Verification completed here

- `php -l`: all changed PHP sources/tests passed syntax checks.
- TypeScript transpilation: all changed TS/TSX files passed syntax parsing.
- CSS: all changed CSS stylesheets passed parsing.
- No full `php artisan test`: the supplied archive excludes `vendor/autoload.php`, and Composer is not available in this environment.
- No full `npm run types:check`/`npm run build`: the local npm cache lacks `yuku-parser@0.19.0`; available Node.js is 22.16, while Vite Plus requires Node.js 22.18 or newer.
- Pixel-accurate browser QA is outstanding. Do not deploy to production without verifying complete signup and reactions on a running environment.

## Local verification / deployment

Run these commands on an environment with Node.js >=22.18, PHP/Composer dependencies and a configured PostgreSQL test database:

```bash
composer install --no-interaction
npm ci
php artisan route:clear
php artisan config:clear
php artisan test --filter=StagedOnboardingTest
php artisan test --filter=RegistrationPasswordSecurityTest
php artisan test --filter=PostEngagementContractTest
php artisan test --filter=HomeEngagementTest
php artisan test --filter=PMCircleOnboardingTest
npm run types:check
npm run build
```

For safe manual testing use the already supported local-only verification mode. Never enable testing-mode verification in production.

Verify Step 1 code verification, Step 2 password criteria/mismatch and document consent, profile data saved, Step 3 animated durations, and unique reaction counts after select/change/remove from every feed. Confirm login, email verification, membership guards, and mobile/touch reaction controls. Use backups and roll out only after tests and visual approval. No migration is required for this patch.
