# Exact profile and resume assistant section parity

Base: PM_Circle_Full_Profile_Resume_Fields_Aligned_2026-11-26.zip.

## User-facing changes

Edit Profile now has exactly the same 11 sections, field labels, and order as AI Resume Assistant: Basic details, Personal Profile, Education, Work Experience, Research Work, Projects, Skills, Achievements, Interests, Languages, Certifications. Both use `resumeFieldSchema.ts` and the existing `ProfileSectionJump`. Existing profile cards, buttons, typography, and completion bar remain; the AI assistant's preview and private workspace are unchanged. Owner Overview uses the same profile field adapter and saved data. Public profile rendering retains the existing section privacy projection and legacy presentation.

## Persistence

The `profileResumeFields.ts` adapter maps the shared schema onto the existing profile records. The aligned save request explicitly validates the displayed fields and owned relational IDs. Hidden legacy sections and field values remain stored; they are no longer separate editable sections in this interface. Existing courses, publications, volunteering, career preferences, profile media and private CV documents are not deleted. Profile picture and cover upload remain on Overview. Profile email and phone retain the existing account validation; the assistant's email remains read-only. Free-text period values are persisted in existing editor_details JSON, with normalized relational dates derived when unambiguous. Existing descriptions and achievements/outcomes are combined in the visible form without duplicating unchanged paragraphs. Categorized skills and languages update existing searchable profile columns. The member's saved private CV is not overwritten by profile editing. New CVs initialize from existing saved profile data. No database migration, seeding, or package changes are introduced. Existing completion criteria and reward rules are unchanged; some legacy completion criteria (e.g. industry and profile photo) are managed outside this exact form.

## Verification

- 500/501 Node source regression checks passed. The remaining PMP dashboard failure was present in the previous project baseline.
- The shared schema and profile adapter passed standalone strict TypeScript checking; the compiled adapter passed behavior checks for exact field order, legacy mapping, combined text, record IDs, hidden-field omission, location and skills.
- Changed PHP files passed syntax checks. Changed TS/TSX files passed transpilation checks.
- Representative Chromium navigation fixtures using actual project CSS and approved Inter font confirmed equal typography, matching button wrapping/scrolling, and no horizontal page overflow at 1600, 1280, 1024, 768 and 390 pixels.
- Full type checking and building were attempted but blocked by missing React/Inertia/Vite dependencies. Laravel integration tests were attempted but blocked by missing vendor/autoload.php. Two integration test methods were added for aligned saves, hidden legacy data preservation, private CV safety, and ownership/validation. Run them before production deployment.

## Apply

Preserve existing .env and private storage. Install dependencies if required, then `npm run types:check`, `npm run build`, `php artisan optimize:clear`, `php artisan optimize`. Run `php artisan test --filter=ProfileEditorPrototypeTest` and `php artisan test --filter=ResumeAssistantBuilderTest` using an isolated testing database. Rebuilding is mandatory because stale compiled assets are excluded from the archive.
