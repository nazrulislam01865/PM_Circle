# Temporarily disable Careers job pages

The `/careers` and `/careers/{job}` routes are unregistered for guests and members. The sidebar entry, public search entry, legacy header Careers link and job advertisement are removed. Existing cached and configured site-navigation links to Careers are filtered without a database write. The resume CTA falls back to the actual resume page if it previously targeted Careers. No design tokens or layout styles changed.

The separate Career Trends module, Career Tools preview, profile and resume features, existing career jobs, JobSpy import implementation and schedule remain unchanged. If JobSpy is enabled, it may continue importing jobs for later use. Set `JOBSPY_ENABLED=false` in the environment and clear config if automatic importing should also be paused.

To reactivate, restore the two routes and controller import, sidebar item and icon, search/header destinations, the event advertisement and remove the navigation filter. The original controller and listing pages remain in source. Rebuild frontend and refresh route/config caches. Existing job data requires no migration or reseeding.

Deployment: `npm run build`, then `php artisan optimize:clear`. If production uses route caching, regenerate it with `php artisan route:cache` after deployment. Run `php artisan route:list --path=careers` to verify no job-listing routes remain. Run `php artisan test --filter=CareersTemporarilyDisabledTest` in the installed project.
