# Temporarily hide Resume & imports

Explicitly disabled. Set `profile_resume_imports_visible` to `true` in `config/pm-circle.php` and run `php artisan optimize:clear && php artisan optimize` to restore the tab, shortcuts and help guide. No frontend rebuild is required when toggling this setting after the initial deployment.

The direct profile imports page redirects to Overview before loading import records when hidden. The overview resume metadata and privacy settings are preserved, but entry buttons for the hidden legacy import workflow are hidden. AI Resume Assistant retains its own upload and draft editing functionality; links to the hidden workspace are not shown. Existing import endpoints and stored records are retained, including ownership checks. This is a UI visibility switch, not an API-level feature shutdown.

No database migrations or new dependencies. Initial deployment requires rebuilding frontend assets.
