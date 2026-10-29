<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Fortify\Features;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();

        // Cached local/production configuration can make tests use the wrong database
        // and run CSRF checks, causing misleading HTTP 419 failures.
        if (! $app->environment('testing')) {
            throw new RuntimeException(
                'Tests require APP_ENV=testing. Run `php artisan config:clear` before running the test suite.'
            );
        }

        return $app;
    }

    protected function skipUnlessFortifyHas(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }
}
