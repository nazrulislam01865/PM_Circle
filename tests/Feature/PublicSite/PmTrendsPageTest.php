<?php

namespace Tests\Feature\PublicSite;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PmTrendsPageTest extends TestCase
{
    public function test_visitors_can_open_the_trends_listing_without_authentication(): void
    {
        $this->get('/pm-trends')->assertOk()->assertInertia(
            fn (Assert $page) => $page->component('trends/Index')
        );
    }

    public function test_visitors_can_open_the_reference_trend_article(): void
    {
        $this->get('/pm-trends/project-management-job-demand-2025')
            ->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('trends/Show')
                ->where('slug', 'project-management-job-demand-2025')
            );
    }
}
