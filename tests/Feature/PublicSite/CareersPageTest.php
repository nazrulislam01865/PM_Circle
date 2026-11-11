<?php

namespace Tests\Feature\PublicSite;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CareersPageTest extends TestCase
{
    public function test_public_can_open_sample_career_list_without_authentication(): void
    {
        $this->get('/careers')->assertOk()->assertInertia(
            fn (Assert $page) => $page->component('career/Jobs')
        );
    }

    public function test_public_can_open_a_sample_job_detail(): void
    {
        $this->get('/careers/bd-1553880')->assertOk()->assertInertia(
            fn (Assert $page) => $page
                ->component('career/Show')
                ->where('job', 'bd-1553880')
        );
    }

    public function test_job_route_rejects_invalid_identifiers(): void
    {
        $this->get('/careers/%3Cscript%3E')->assertNotFound();
    }
}
