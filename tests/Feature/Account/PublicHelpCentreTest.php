<?php

namespace Tests\Feature\Account;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PublicHelpCentreTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_read_help_guides_without_access_to_private_requests(): void
    {
        $this->withoutVite();
        $this->get('/help-center')->assertOk()->assertInertia(fn ($page) => $page
            ->component('support/HelpCentre')->where('publicView', true)->missing('tickets')->missing('ticket'));
        $this->get('/help-center/requests')->assertRedirect('/login');
        $this->get('/help-center/requests/1')->assertRedirect('/login');
        $this->get('/help-center/requests/1/screenshot')->assertRedirect('/login');
        $this->get('/help-center/contact')->assertRedirect('/login');
    }
}
