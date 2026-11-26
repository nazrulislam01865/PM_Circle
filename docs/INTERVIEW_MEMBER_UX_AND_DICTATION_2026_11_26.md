# Interview preparation — member UX and dictation

## Changes
- All eight setup selections reuse the existing Radix `AdminChoice` control, including the all-eligible-sets option. Active catalog choices, account preferences and existing question selection endpoints are unchanged.
- Accessible job-description browse/drop area with extension, empty-file and 5 MiB prechecks, processing status, file name, replacement and removal of the attachment label while preserving editable extracted text. The original server-side upload validation and temporary extraction endpoint are unchanged.
- The canonical single-line control selector was overriding the feature textarea minimum height. The feature-scoped selectors now override it without changing global typography. JD minimum height is 8rem; answer minimum height is 12rem (192px at 16px root), with 9 rows, vertical resize and character count.
- Dictation is always visible. Type-mode sessions use browser dictation as a text-entry aid and retain their existing `type` submission mode. Speak/Both sessions mark a dictated answer `speak`. Existing server-side answer mode validation remains unchanged.
- Browser Web Speech API starts directly on click; no separate getUserMedia stream or waveform setup is required. Recognition errors, cancellation, final-result delivery after stop, appending text, 6,000-character limit and unmount cleanup are covered. After an automatic browser stop, the user can restart dictation without losing text. Audio is not uploaded by PM Circle; browser speech services may process audio remotely.
- Existing evaluation, navigation, catalog, session ownership, scoring, persistence and billing unchanged. Next/Finish is disabled until evaluation; Skip remains available for unevaluated questions. Evaluated answers do not need repeated evaluation unless edited.

## Verification
- 20 targeted Node regression checks passed (including a mock recognition lifecycle test, not physical microphone capture).
- Wider Node regression suite: 452 passed, two failed. The failing PMP dashboard and legacy profile editor expectations and referenced source files are unchanged from the supplied archive.
- Changed TypeScript/TSX files passed transpile syntax checks and CSS files passed PostCSS parsing. Full typecheck/build blocked by npm offline cache missing packages and current Node 22.16 below the Vite Plus requirement of 22.18. Laravel dependencies are unavailable. A static Chromium layout check did not complete; authenticated browser rendering and real microphone testing are unverified.

## Deploy
No new migration, seeding or dependencies. Use Node 22.18+ within the 22.x release line, run `npm ci`, `npm run types:check`, `npm run build`, then `php artisan optimize:clear` and `php artisan optimize`. Apply earlier migrations if not already applied. Test browser dictation in Chrome/Edge on HTTPS or localhost: grant microphone permission, speak, stop, verify final editable text, evaluate, navigate, repeat. Verify denied permission, unsupported browser, network failure, file extraction and mobile layout before production. Browser recognition requires a supported browser/service, microphone access and secure origin; there is no server-side transcription fallback.

Archive omits nested historical ZIP backups, cached PHP/frontend artifacts, debug snapshots and runtime sessions; required runtime-directory placeholders retained.
