<?php

namespace Tests\Feature;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class DiscoverPmPageTest extends TestCase
{
    public function test_public_discover_pm_is_accessible_without_an_account(): void
    {
        $this->get('/discover-pm')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('public/DiscoverPm'));
    }

    public function test_discover_pm_is_a_named_public_route(): void
    {
        $this->assertSame('/discover-pm', route('discover-pm.index', absolute: false));
    }
}
