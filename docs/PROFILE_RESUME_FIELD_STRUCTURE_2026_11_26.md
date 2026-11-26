# Profile editor and résumé field structure alignment

Base: Archive 8.zip. The detailed profile editor retains its own cards, controls, and existing repeatable profile fields. Only the jump-to-section navigation is redesigned in both workspaces.

## Changes
- Add research work, categorized skills, and interests to `editor_details.records`; extend education with courses, experience and projects with technical/soft skills, projects with location/team members, and certifications with details. Existing date controls, awards, qualifications, career preferences, and relational records remain intact.
- Add portfolio and GitHub fields; LinkedIn uses the existing link collection and profile column. No separate duplicate LinkedIn value is stored.
- Owner Overview reads the same saved field definitions and records. The existing public projection filters new fields by the relevant privacy setting; research and interests default to Only me. Both privacy screens use the existing canonical groups.
- A new CV is initialized from saved profile information through the existing ResumeDocument service. Existing encrypted private CVs and session drafts remain separate; private CV contents are not copied automatically to the profile. Users retain control over their profile and private CV. Existing drafts may require reloading if the profile snapshot version changed.
- Both editors reuse `ProfileSectionJump`: outlined horizontal buttons, active-section tracking, reduced-motion support, responsive wrapping and mobile horizontal scrolling. Edit profile shows the existing server-computed profile completion percentage; the assistant retains its separate résumé quality and preview rail.
- The original profile forms and existing profile navigation are retained. Existing sidebar help cards remain; horizontal navigation replaces the old left section navigation. The member header/footer and approved Inter tokens are unchanged.

## Persistence and compatibility
Existing profiles.editor_details JSON and existing relational tables are used. No migration, seeding, or new dependency. Existing new-section records are retained if older detailed payloads omit those collections. No new per-field/per-section database reads. Existing private resume data is unchanged. Research and interests use explicit privacy controls; categorized skills follow Core skills & skill categories; portfolio and GitHub follow Portfolio & links.

## Verification
- 500/501 source regression checks passed; remaining PMP dashboard test also fails on Archive 8.
- Three new targeted source regression checks passed; previous navigation/section/privacy assertions were updated for intentional layout and schema changes.
- PHP syntax and TSX transpilation diagnostics passed for changed files. Both edited CSS stylesheets parsed successfully.
- Chromium fixtures with actual project CSS and the provided embedded Inter typeface verified matching typography, control radius, navigation fit/scrolling, and no horizontal page overflow at 1600, 1280, 1024, 768, and 390 px. These are representative markup fixtures, not authenticated runtime screenshots.
- Three Laravel integration test methods added to ProfileEditorPrototypeTest (saved fields/owner overview/private CV, privacy projection, invalid input). Not executed: Composer/vendor and npm/node_modules are absent. Full frontend build and full type checking are not verified.

## Deployment
Preserve .env and private storage. Run npm ci with a supported Node version, npm run types:check, npm run build, php artisan optimize:clear, php artisan optimize. Run php artisan test --filter=ProfileEditorPrototypeTest and php artisan test --filter=ResumeAssistantBuilderTest against an isolated testing database. Do not deploy untested changes to production. Stale compiled assets, sessions, cached templates/config, and Inertia debug snapshots are excluded from the returned archive; rebuild the frontend.
