<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

final class CareersTemporarilyDisabledTest extends TestCase
{
    public function test_careers_routes_are_unregistered(): void
    {
        $this->assertFalse(Route::has('careers.index'));
        $this->assertFalse(Route::has('careers.show'));
        $this->get('/careers')->assertNotFound();
        $this->get('/careers/job-'.str_repeat('a', 32))->assertNotFound();
    }
}
