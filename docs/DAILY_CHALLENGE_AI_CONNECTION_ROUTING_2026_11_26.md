# Daily Challenge AI connection and dialog correction

Base: PM_Circle_Full_Automatic_Daily_Challenge_2026-11-26.zip.

## Root cause
The operation dropdown only queried `daily_challenge_api_key` credentials. A verified credential registered under `api_key` (OpenAI Primary) was excluded regardless of its display name or verification status. The same exact-slot restriction existed in route saving and queue-time credential resolution. A credential diagnostic is not proof that the feature's saved route, model, moderation and queue work together.

## Changes
- Explicitly assigned OpenAI Primary registry credentials are now compatible with the Daily Challenge generation and review slots. Dedicated defaults still resolve only their own slot. No automatic fallbacks across pools, no copying credentials and no moderation/resume-extraction sharing.
- Both the workspace feature editor and the connection picker use the same permitted assignment rules. Backup snapshots preserve the operation's logical slot. Existing credential IDs, pools, budgets and encrypted secrets remain unchanged. Existing verified-within-15-minutes requirement for new shortcut assignments remains.
- The dialog displays saved connection status separately from assignment fields. Labels are stacked above full-width controls. Provider profile information is shown on each credential option instead of a separate filtering dropdown. Test buttons for Daily Challenge are disabled when the saved route is unavailable or a selection is unsaved.
- Generation and answer review have separate diagnostics, each with synthetic inputs, actual feature routing and existing moderation/budget/queue safeguards. The answer-review failure branch explicitly excludes connection diagnostics from learner-response writes. A successful operation test is not a perpetual health guarantee; the existing feature diagnostic cache expires after ten minutes and the UI requests retesting. Credential health is separately retained by the workspace.
- The CLI check resolves the actual saved primary instead of only testing the dedicated default. Generation scheduling, review rules and publication remain unchanged.

## Usage
Go to Admin > AI settings > Daily Challenge > Manage connection. Select Daily Challenge generation, select the already registered OpenAI key (marked shared if appropriate), test the credential if its earlier verification is stale, then Save connection and Test generation. Repeat for Daily Challenge review if automated answer evaluation is desired. The separate moderation key, model price, budgets, gateway/feature switches and queue must be configured. Test requests consume provider budget but create no member charge, challenge or answer record.

## Verification
530 source checks: 529 passed, one pre-existing PMP dashboard assertion failed. Seven targeted source checks passed. PHP lint passed on all changed PHP files. Full TypeScript check reported the two pre-existing errors in ProfileSectionJump.tsx and LegalPage.tsx only. Chromium checked the actual React ConnectionPanel, dialog, picker and state logic with simulated endpoint responses and stubbed dropdown/navigation/icon primitives at 1440, 1024, 768 and 390 pixels. Build blocked by the archived platform-specific Vite installation; Composer/vendor and live API credentials unavailable. New Laravel feature test exercises both operations with fake HTTP responses, credential accounting, isolated moderation slots and no publication, but was not executed in this environment.

No database migration or seeding. Reinstall dependencies for the deployment platform, rebuild frontend, clear/rebuild caches and restart long-running AI workers. No production changes were performed.
