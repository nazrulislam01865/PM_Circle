# PM Circle — Prototype data for My Profile and Discussions

This update adds **demo data**, not a schema migration or a UI redesign. It reuses the existing tables, routes, CSS and React components. Prototype screenshots and the supplied Word file are preserved under `docs/references/`; the original project reference images are still in `pmDoc/`. Screenshots themselves are not imported as member records or resumes.

## Safety

- The demo seeder runs **only** for `APP_ENV=local` or `testing` **and** `PMC_DEMO_CONTENT_ENABLED=true`.
- Never run it on production or staging; it cannot seed content in those environments.
- Existing member passwords, email verification, names, filled profile attributes and records are **never overwritten** by the new seeder.
- The default `demo-sara@example.invalid` is a fictional profile, with a random unknown password. It cannot be used as a login account without an intentional local-only password change.
- Certificates are self-reported demo items, not verified professional certifications.
- Sample discussion comments, reactions and sample professional entries are persisted and **idempotent** (running the seeder twice will not duplicate them).
- Real usage statistics, memberships, achievements, resumes and uploaded files are not fabricated.
- To return to empty data, use your normal administrative cleanup process; **do not use `migrate:fresh` or delete real data**.

## Seed for your existing local login

1. Keep a database backup before loading sample data.
2. Update your existing `.env` file; use the exact email you log in with, **not your username**:

```dotenv
APP_ENV=local
PMC_DEMO_CONTENT_ENABLED=true
PMC_DEMO_PROFILE_EMAIL=your-existing-login@example.com
```

3. Run from the project root:

```bash
php artisan config:clear
php artisan migrate:status
php artisan migrate --pretend
php artisan migrate
php artisan db:seed --class=DemoProfileAndDiscussionsSeeder
```

**Important:** The seeder will stop with an explicit error if that account email does not exist. You can omit `PMC_DEMO_PROFILE_EMAIL` to seed **only** the fictional Sara Ahmed demonstration profile. If your existing profile already has some content, only empty values are populated and any matching demo entries are not duplicated.

4. Visit `/settings/profile?tab=edit` and `/community`. The dashboard's feed will also show the public demo posts.

`php artisan db:seed` will also include these examples because `DatabaseSeeder` calls the new seeder alongside the existing learning and scenario seeders in local/testing environments.

## What the seeder adds

- **Profile:** role, headline, Dhaka location, about text, skills, languages and an existing city cover asset. The fictional Sara demo account also uses the bundled demo avatar.
- **Experience:** Project Manager at Northstar Digital, start date Jan 2022, illustrative outcomes.
- **Featured project:** Customer Portal Rollout, 12-person team, 8-month delivery example.
- **Education and certification:** BBA in Management, University of Dhaka, and a clearly self-reported PMP sample.
- **Discussion feed:** the existing reference discussions from Fatima, Marcus, Daniel and Priya, plus new example comments/reactions persisted in the database.

The screenshot-only statistics such as profile-view counts and learning badges are **not** inserted as real achievements or tracked views. The existing controller can still display its original static prototype fields; those are outside this narrowly scoped data-seeding change.

## Files changed in this task

- `database/seeders/DemoProfileAndDiscussionsSeeder.php`: new environment-restricted, idempotent sample profile/discussion seeder
- `database/seeders/DatabaseSeeder.php`: include new seeder once in the existing local/testing seed flow
- `config/pm-circle.php`: optional `PMC_DEMO_PROFILE_EMAIL` setting
- `tests/Feature/Seeders/DemoProfileAndDiscussionsSeederTest.php`: idempotence, account-preservation, rendering and disabled-mode regression coverage
- `docs/DEMO_PROFILE_DISCUSSIONS_SETUP.md`: this setup guide
- `docs/references/`: exact user-supplied Word reference and five screenshot references, retained outside web-accessible `public/`

No migrations, controllers, React components, CSS, user records in production, or runtime queries were changed.
