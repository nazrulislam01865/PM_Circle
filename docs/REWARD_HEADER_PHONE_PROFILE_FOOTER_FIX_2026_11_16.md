# PM Circle — Shared Profile Reward, Required Phone and Footer-Safe Profile Actions

## Scope and verified source

Base: `Archive(20261116-105115).zip` provided by the user. This patch preserves all other application files.

### 1. One header promotion for guests and members

- `HandleInertiaRequests` now shares the existing **cached** administrator-configured `rewardPromotion` with all regular site Inertia screens, whether signed in or not.
- The shared `MemberHomeHeader` uses that property without a guest/homepage-only condition. The label remains dynamic (10% is the default, not hardcoded), and it hides when the admin disables the offer.
- From the homepage the link scrolls to `#pm-pathway-exams-title`; from another page it links to `/#pm-pathway-exams-title`.
- To avoid a second reward lookup or conflicting props on the homepage, the duplicate homepage controller prop was removed. The homepage promotional strip continues using the shared prop.
- The 960px responsive threshold matches the header's actual collapsed navigation width. The badge stays centered alongside the Exam Simulator pill at larger widths.
- Administrative dashboard/login pages remain separate from member-facing promotion; administrators do not qualify for member coupons. Coupon issuance/redemption code was not changed.

### 2. Phone required for full profile updates

- In the Edit Profile → Basic details area, the private phone number is marked required, has inline errors, and has client-side digit-length validation.
- `ProfileUpdateRequest` enforces the requirement on full/basic profile updates, regardless of client-side validation. It accepts standard international phone punctuation and requires 7–15 digits, with a 32-character maximum.
- The independent Privacy tab updates only its privacy-related settings. This leaves existing users who have not yet supplied a phone number able to manage privacy settings without bypassing full profile validation.
- Existing database rows with empty numbers are not rewritten or removed. They must provide a number the next time they save Basic details. Visibility rules remain unchanged.

### 3. Save bar no longer covers the site footer

- `.pm-profile-sticky-save` is now sticky **within the profile page** rather than fixed over the viewport/page footer. It has no sidebar-dependent `left` offsets.
- The unnecessarily large bottom padding reserved for the old fixed overlay was reduced to a standard spacing token.
- Mobile actions retain responsive stacking.

## Affected code

- `app/Http/Middleware/HandleInertiaRequests.php`
- `app/Http/Controllers/PublicSite/HomeController.php`
- `app/Http/Requests/Settings/ProfileUpdateRequest.php`
- `resources/js/components/dashboard/MemberHomeHeader.tsx`
- `resources/js/components/profile/ProfilePhoneField.tsx`
- `resources/js/pages/settings/profile.tsx`
- `resources/css/pm-profile-reward.css`
- `resources/css/pm-profile-ux.css`
- `tests/Regression/ProfileRewardStaticCheck.php`
- `tests/Regression/ProfilePhoneAndHeaderStaticCheck.php` (new)
- `tests/Feature/Settings/ProfilePhoneRequiredTest.php` (new)
- `tests/Feature/Rewards/SharedRewardHeaderTest.php` (new)

## Data and deployment

- **No migrations required.** No existing data is modified by this patch.
- No new npm or Composer dependencies.
- Apply only to the codebase version based on the archive above. Back up any local modifications to these file paths before replacing them.
- Use PHP 8.4 as `php` on the user's macOS environment and Node >= 22.18 for the installed frontend toolchain.

```bash
php tests/Regression/ProfilePhoneAndHeaderStaticCheck.php
php tests/Regression/ProfileRewardStaticCheck.php
php artisan test --filter=ProfilePhoneRequiredTest
php artisan test --filter=SharedRewardHeaderTest
npm run types:check
npm run build
php artisan optimize:clear
```

## Verification status

- PHP syntax, TSX syntax parsing, and CSS parsing: passed.
- Targeted source regressions: passed.
- Backend feature tests and complete npm build: **not run in the uploaded source**, which does not contain installed vendor/node_modules dependencies.
- Browser viewport/visual verification: **not completed** in this environment.
- Two unrelated legacy contact/footer source-check assertions fail in the original user archive and were not modified by this patch.
