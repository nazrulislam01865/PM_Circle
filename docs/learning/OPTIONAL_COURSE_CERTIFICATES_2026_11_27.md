# Optional course completion certificates

## Admin and member behavior
- Admin > Learning > Courses > Create/Edit > Course information > Provide certificate after course completion.
- Existing courses remain enabled to preserve the previous promise; new courses default to disabled. Admin can change the setting without affecting existing awards.
- The current completion criterion remains all current lessons marked complete by the authenticated, entitled, enrolled member; no new exam or quiz threshold is introduced.
- Issuance happens on a new lesson completion that brings current progress to 100%, in the same transaction as lesson and completion records. Enabling the setting after a course was completed does not automatically backfill certificates; replaying an already completed lesson does not issue one. A later actual completion of newly required lessons can qualify if enabled.
- Certificate identity, course title, member name and issue date are stored once. Changing a course title, member name or certificate setting does not rewrite historical certificates. Disabling does not revoke. Private member-only viewer and print/save-as-PDF remain unchanged. The sample achievements activity is client-side only and cannot issue real certificates.
- My Learning shows the existing certificate action and retains the course details link. Course details and Achievements reuse the existing CertificateCard. Achievements shows up to 30 recent certificate cards with a link to all certificates. The public offer appears only for certificate-enabled courses.

## Storage and performance
- Additive migration `2026_11_27_000002_add_optional_course_certificates.php`: boolean on `learning_courses`, separate `learning_course_completions` ledger with unique (user_id, course_id); historical completions seeded from existing certificate rows. No issued certificate is deleted or changed.
- Existing `learning_course_certificates` retains unique member/course and UUID constraints. Existing course/enrollment locks serialize concurrent completions. No PDF blob, AI request, queue, Redis cache or per-card requests added. The existing certificate HTML template is rendered from immutable award data.
- Achievements uses its existing batched window query with distinct course and certificate sources. The certificate-card query is scoped and bounded, and runs only on the full achievements page. The My Learning query stays batched. Course details do a single indexed lookup for enrolled members only.

## Staging and deployment
1. Back up PostgreSQL, confirm the supplied archive's prior migrations (including engagement) are correctly deployed, and test on a staging database. Do not run unrelated pending migrations blindly.
2. Install locked dependencies (`composer install`, `npm ci`). Run `php artisan migrate --force` with application writes paused and workers drained; the migration backfills completions from existing certificates. Verify counts match historical certificates before reopening writes.
3. Run `php artisan test tests/Feature/Learning tests/Feature/Account/MemberAchievementsTest.php` and `npm run types:check`, `npm run build`. Validate browser behavior for enabled and disabled courses, existing awards, privacy, duplicate completion, and responsive card layouts.
4. Refresh production config and application processes using the existing deployment procedure. No server has been changed by this delivery.
5. Do not use migrate:rollback for this migration: it intentionally refuses a destructive down operation. A code rollback would restore the old unconditional issuance behavior, so keep course-completion writes paused until a compatible forward fix is deployed. Retain the new schema and historical data.

## Verification scope
PHP syntax, TypeScript transpile syntax and repository Node regression tests were executed. Composer/vendor packages, PHP database drivers and node_modules are unavailable here; Laravel/PostgreSQL integration, full TypeScript typechecking, build and browser QA require staging. Feature tests have been extended for create/edit validation, on/off completion, duplicate submissions, preserved awards, ownership and achievement metrics.
