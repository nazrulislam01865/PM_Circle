# PM Circle — Profile Privacy Prototype (2026-11-18)

## Scope

Implemented **My profile → Privacy** using `pri(1).png` as the visual reference and the bundled approved PM Circle UI Style Guide (4)(8)(4).html as the source of typography, controls, colors, spacing, focus states, and responsive dimensions.

The existing authenticated `MemberDashboardLayout` renders the primary header, secondary navigation, and shared footer. Profile page header, four profile tabs, routes, and unrelated sections are unchanged.

## UI

- Four grouped fieldsets, **31 labeled fields**, each with **Public / Community only / Only me** options.
- Main left card with save button, protected personal contact/CV statement, saving/success/validation error states.
- Right cards: exact **Visibility options** definitions and **Preview saved visibility** audience buttons (signed-out visitor, community member, employer). Preview uses saved settings only; it does not expose or fetch private member data.
- Responsive two-column page, stacking aside beneath main card on narrow displays. All new CSS draws fonts, colors, spacing, border radii, and control sizes from `resources/css/pm-design-tokens.css`, the canonical style guide.

## Data and security

- Added `profiles.field_visibility` (`jsonb`, nullable) via an additive migration. It persists all 31 per-field audience choices as JSON; it does not change existing user/profile records during migration.
- The canonical key/label registry is `config/profile_privacy.php` and is shared to the frontend by the existing profile controller (no additional SQL read).
- `ProfileUpdateRequest` validates the complete set and accepted audience values on the server. Only the signed-in member can write to their own profile via existing authenticated `/settings/profile` route.
- The `ProfileFieldPrivacy` service applies **the more restrictive of the preexisting global profile visibility and the per-field setting**. Unset per-field preferences inherit the global privacy level to preserve existing behavior before first save.
- Already-exposed fields in member profile, members directory, and homepage featured-member cards are masked according to audience. No additional database queries; `field_visibility` is loaded through existing eager-load relations. Contact details and private CV storage/routes remain unchanged.
- Entries for fields not yet represented in current project data models are saved, but **no empty/new profile data fields are invented**. Their choices are ready for enforcement if these fields are introduced later. Published posts/discussion author identities are separate from member-profile field visibility and retain existing behavior.
- Privacy page skips eager-loading unrelated experiences, projects, certifications, and education histories; existing other tabs retain their original loading behavior.

## Changed files

- `config/profile_privacy.php` — one authoritative field definition registry
- `database/migrations/2026_11_18_000004_add_profile_field_visibility.php` — additive `jsonb` column
- `app/Models/Profile.php` — guarded fillable/cast support for the field settings
- `app/Domain/Identity/Services/ProfileFieldPrivacy.php` — validated defaults and audience checks
- `app/Http/Requests/Settings/ProfileUpdateRequest.php` — per-field server-side validation
- `app/Http/Controllers/Settings/ProfileController.php` — save/reload, minimal privacy-tab data loading
- `app/Http/Controllers/Members/MemberDirectoryController.php` — mask private member profile and directory fields
- `app/Http/Controllers/PublicSite/HomeController.php` — mask featured member cards without extra queries
- `resources/js/components/profile/ProfilePrivacyTab.tsx` — reusable UI and preview components
- `resources/js/pages/settings/profile.tsx` — replace old tab only, preserve profile layout
- `resources/css/pm-profile-privacy.css` — section composition using central tokens
- `resources/css/app.css` — import styles
- `tests/Feature/Settings/ProfileFieldPrivacyTest.php` — save, validation, audience regression
- `tests/Regression/profilePrivacyPrototype.test.mjs` — static contract / design regression

## Verification

- PHP syntax check (`php -l`) passed for modified PHP files.
- TypeScript syntax transpile check passed for the modified TSX files.
- CSS parsed successfully using tinycss2 (zero parse errors).
- `node --experimental-strip-types --test tests/Regression/memberNavigation.test.mjs tests/Regression/profilePrivacyPrototype.test.mjs`: **13/13 pass**.
- **Not verified:** Full TypeScript type-check/build (npm dependencies absent); Laravel Feature/DB tests (vendor/autoload.php absent, no PDO PostgreSQL driver); authenticated browser comparison. Chromium screenshot launch hung in this environment, so no screenshot-comparison pass is claimed.

## Deployment (development/test, then production after backup)

```bash
npm ci
npm run types:check
npm run build
php artisan migrate --force
php artisan optimize:clear
php artisan test --filter=ProfileFieldPrivacyTest
node --experimental-strip-types --test tests/Regression/profilePrivacyPrototype.test.mjs
```

**Apply migration before serving the new profile code**, because the member-facing queries select the new column. Keep the existing `.env`, `storage/`, uploaded private resumes and database intact. Do not wipe/migrate-fresh.

Verify `/settings/profile?tab=privacy` while logged in and confirm persistence, owner isolation, all 31 labels, preview buttons, mobile stacking, and existing profile/other tab behavior in a running instance.
