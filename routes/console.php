<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Import only when enabled; never scrape during a public web request.
if (config('jobspy.enabled')) {
    Schedule::command('careers:fetch')->twiceDaily(8, 20)->withoutOverlapping();
}
