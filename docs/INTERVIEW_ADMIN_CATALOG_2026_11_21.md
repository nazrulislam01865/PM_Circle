# Interview Preparation — Admin Control

## Scope

The original practice flow was backed by 40 hard-coded questions and fixed setup options. The new admin page at `/admin/interview-preparation` manages those choices without enabling AI evaluations, changing resume data, or altering other learning and exam modules.

## Admin interface

- **Member options:** manage industries, PM roles, experience levels, question types, question counts, and answer modes. Edit labels/order or disable options. Keys remain immutable once created so existing sessions and question-set associations are safe. Answer mode keys stay restricted to `type`, `speak`, and `both`; question count values are limited to 1–50.
- **Question sets:** create/edit draft or published sets, optionally restricted to one industry, one role, and/or one experience level. An empty scope applies to every member choice.
- **Question bank:** create and edit questions; assign each question to a set and type, set display order, activate/deactivate, and search or filter by set. Supports `{industry}`, `{role}` and `{scenario}` placeholders. Deactivating a set/question excludes it from newly started sessions only.
- **Timing:** set 1–30 estimated minutes per question. New sessions save their own duration configuration; already running sessions keep their old value.

The member interview setup reads enabled options and published sets. Questions are selected from the eligible published sets with one catalog query, in a predictable rotation among selected question types. A request without enough eligible questions fails validation before a session is inserted. Questions are copied into the session when it starts, preserving existing attempts and results after admin edits.

## Deployment

1. Back up PostgreSQL (as per established production backup procedure).
2. Deploy updated Laravel/React files and CSS, retaining local `.env`, uploads, and the existing database.
3. Run `php8.4 artisan migrate --force` once. The migration creates four catalog tables, adds a nullable `minutes_per_question` session snapshot, and imports the existing 40 curated questions with their current default options. Existing `interview_sessions` and `interview_answers` rows are not rewritten.
4. Run `npm ci && npm run build` on a supported Node.js runtime (>=22.18) and deploy the new `public/build` assets, or build on the target host if supported.
5. Run `php8.4 artisan optimize:clear`, verify `/admin/interview-preparation`, then launch an interview as a member.

No migrations should be rolled back on production without approval because rolling back drops the newly created admin catalog data.

## Verification status

PHP syntax checks and focused static regression checks can be run without dependencies. Laravel feature tests are in `tests/Feature/Interview/InterviewAdminCatalogTest.php` and require `vendor/` and a test database. Do not describe these as passed unless executed. The source bundle contains the uploaded legacy `public/build` until a fresh frontend build succeeds.
