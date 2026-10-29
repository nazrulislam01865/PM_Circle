# PM Circle: consistent member shell and bcrypt registration

## Scope and root cause

**Sidebar/header:** The shared member shell used a 264px sidebar and 67px header. The learning CSS independently reset them to 218px / 63px, and learning responsive CSS imposed 195px / 76px. This clipped navigation labels and shifted page geometry at the same viewport. Some sidebar links could also overflow horizontally.

**Password:** Registration enforced 12 characters in its form and Laravel action; Laravel's hashed cast already hashed the password but bcrypt was not explicitly selected by the application configuration.

## Source changes

- `resources/css/pm-dashboard-shell.css`: Owns the canonical sidebar width (264px) and header height (67px) through shared CSS variables; makes sidebar sticky and navigation vertically scrollable, never horizontally scrollable; truncates overflowing labels safely.
- `resources/css/pm-dashboard-responsive.css`: Uses the same member width behavior for all pages. At 1050px and below the standard icon-only nav is 80px; at 650px and below the mobile overlay is 264px and opens without a horizontal slide animation.
- `resources/css/pm-learning-core.css`, `resources/css/pm-learning-responsive.css`, `resources/css/pm-member-plans.css`: Remove conflicting learning-only sidebar/header geometry rules. Learning-specific *content* layout is preserved.
- `resources/js/components/dashboard/DashboardSidebar.tsx`: Provides full navigation label via title and ensures a mobile-open drawer is not also marked collapsed.
- `app/Actions/Fortify/CreateNewUser.php`: Requires 8-character minimum and explicitly calls `Hash::driver('bcrypt')->make` before model creation. The existing `hashed` model cast remains as defense in depth.
- `app/Providers/AppServiceProvider.php`: Makes the default Laravel password minimum 8 characters for consistent form validation.
- `config/hashing.php`: Fixes bcrypt as the configured hash driver with configurable cost (12 rounds by default), so rehashing and other first-party password paths use bcrypt too.
- `resources/js/pages/auth/RegisterStep1.tsx`: Changes hint and HTML minimum from 12 to 8; preserves the supplied registration layout.
- `tests/Feature/Auth/RegistrationPasswordSecurityTest.php`: Adds short-password rejection and bcrypt hash verification tests.

## Database and deployment

No migrations or destructive operations. **Existing passwords are not overwritten, decrypted, or rehashed in bulk.** New passwords are hashed using bcrypt. Laravel can upgrade existing compatible hashes on login depending on the prior deployment hash configuration; check existing hashes before switching any running environment that used a different hash algorithm. Do not set `HASH_DRIVER=argon*` when bcrypt is required.

After deploying the source (keeping the current `.env` and backing up existing data):

```sh
composer install
npm install
php artisan optimize:clear
npm run build
php artisan test --filter=RegistrationPasswordSecurityTest
```

Laravel feature tests require a configured test database and the appropriate PDO driver. Test both `/dashboard` and `/learning` at the **same browser width**, then inspect the sidebar and header alignment, and the responsive mobile menu. No email verification or membership setting is changed in this update.
