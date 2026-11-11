<?php

return [
    // Scheduled fetching is opt-in. Manual `php artisan careers:fetch --now`
    // is available after installing the isolated JobSpy CLI.
    'enabled' => (bool) env('JOBSPY_ENABLED', false),
    'command' => env('JOBSPY_COMMAND', base_path('.venv/jobspy/bin/jobspy')),
    'site' => env('JOBSPY_SITE', 'bdjobs'),
    'keywords' => env('JOBSPY_KEYWORDS', 'Project Manager,Project Coordinator,PMO'),
    'location' => env('JOBSPY_LOCATION', 'Dhaka'),
    'results_wanted' => (int) env('JOBSPY_RESULTS_WANTED', 15),
    'hours_old' => (int) env('JOBSPY_HOURS_OLD', 72),
    // Retain missing listings for 30 days to survive temporary board outages.
    'stale_days' => (int) env('JOBSPY_STALE_DAYS', 30),
];
