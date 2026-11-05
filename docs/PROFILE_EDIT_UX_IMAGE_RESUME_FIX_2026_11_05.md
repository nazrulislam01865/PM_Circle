# PM Circle - Profile edit UX, image cropping and overview resume fix

## Scope
This patch changes only My profile and the profile-related shared components. No data deletion, table alteration, new package, or migration is required. It keeps the existing Laravel routes and model contracts.

## Fixed
1. Edit profile has consistent 48px text/date/select controls, aligned labels, informative placeholders, a narrower phone code selector, compact experience/project/education/certification forms, and full-width textareas.
2. Existing legacy text dates are displayed as native calendar dates where parsable, while their stored string is preserved unless the user selects a date. A current job disables the end-date field.
3. The primary Cancel and Save changes controls on Edit profile are in a floating footer that adapts to the expanded/collapsed sidebar and mobile viewport. Existing separately stored experience/project/education/certification entries retain their own save operations.
4. Photo and cover upload now opens a reusable accessible preview-and-crop dialog. It warns for nonmatching image ratio or source resolution, lets members reposition with mouse/touch/keyboard and zoom, produces 400x400 avatar or 1536x400 cover JPEG locally, and submits through the original validated Laravel endpoint. The old file is removed only after the replacement saves successfully.
5. Removed the two unwanted dimension-help lines from the photo editor. The final image uses the stored URL shown on both Overview and Edit profile.
6. The Overview tab now retrieves the latest persisted resume, previously only loaded in the Imports tab. The upload still stores the file privately, records a processing session, and redirects to Imports for review; after returning to Overview, the filename, size and date are shown.
7. Uploaded files remain owned by the authenticated member; the existing resume storage, download and analysis job are reused. No additional per-entry or per-row database query is added. Overview adds only the one latest-resume lookup needed to display the card.

## Changed files
- app/Http/Controllers/Settings/ProfileController.php: latest resume on Overview, safe image replacement and upload storage guard.
- resources/js/pages/settings/profile.tsx: photo dialog integration, phone field, input placeholders, floating footer and resume metadata.
- resources/js/components/profile/ProfileDateInput.tsx: reusable calendar input.
- resources/js/components/profile/ProfilePhoneField.tsx: international calling code and number control.
- resources/js/components/profile/ProfileImageCropDialog.tsx: image preview/crop workflow.
- resources/js/components/profile/ProfileEntryEditor.tsx: compact fields, date control and clear entry actions.
- resources/js/components/profile/ProfileEditSections.tsx: field order and input configurations.
- resources/css/pm-profile-ux.css: scoped layout using existing design tokens.
- resources/css/app.css: imports the scoped profile CSS once after profile CSS.
- tests/Feature/Settings/ResumeImportFlowTest.php: regression checks for resume storage and Overview card.

## Installation
Extract the changed files over the existing source in the application root. Keep a backup and review your git diff.

```bash
php artisan optimize:clear
php artisan storage:link  # run only if the public storage symlink is not already present
npm ci
npm run types:check
npm run build
php artisan test --filter=ResumeImportFlowTest
php artisan test --filter=ProfileUpdateTest
php artisan test --filter=ProfileEntryWorkflowTest
```

If the server already has a public storage symlink, do not recreate it. Resume analysis still requires a running Laravel queue/Horizon worker and private local storage configured, as in the pre-existing implementation.

## Verification evidence and limits
- PHP lint passed for the changed controller and feature test.
- All changed TSX files passed standalone TypeScript transpilation/syntax checks, but **full type checking was not run**.
- New CSS parsed without syntax errors.
- Offline `npm ci` was blocked by missing `yuku-parser` in the npm cache; available Node is 22.16.0, below the package's 22.18.0 requirement. Full frontend build was not run.
- Laravel feature tests were not executed because Composer vendor dependencies are not installed in the provided archive/environment.
- Interactive browser visual comparison with the running Laravel application was not performed. Confirm crop, storage URLs, sticky action footer and forms on desktop, tablet and phone after running the project locally.
