<?php

namespace Tests\Feature\Admin;

use App\Models\HomePageContent;
use App\Models\User;
use App\Support\Home\HomepagePresentation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class HomepageSectionControlTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_section_updates_preserve_legacy_and_unrelated_content(): void
    {
        $page = HomePageContent::query()->firstOrCreate(['key'=>'home'], ['content'=>[]]);
        $legacy = $page->content;
        $before = HomepagePresentation::resolve($legacy);
        $version = (int) $page->fresh()->revision;
        $this->actingAs(User::factory()->create(['is_admin'=>true, 'onboarding_step'=>3, 'email_verified_at'=>now()]));
        $trends = array_replace($before['trends'], ['heading'=>'Updated trends heading']);
        $payload = ['section'=>'trends', 'content'=>$trends, 'version'=>$version];
        $this->put('/admin/homepage', $payload)->assertRedirect('/admin/homepage?section=trends');
        $stored = $page->fresh()->content;
        $after = HomepagePresentation::resolve($stored);
        $this->assertSame('Updated trends heading', $after['trends']['heading']);
        $this->assertSame($before['hero'], $after['hero']);
        $this->assertSame($before['events'], $after['events']);
        $this->assertSame($version+1, (int) $page->fresh()->revision);
        foreach ($legacy as $key=>$value) if ($key !== 'homepage_v2') $this->assertSame($value, $stored[$key]);
        $this->put('/admin/homepage', $payload)->assertSessionHasErrors('version');
        $events = array_replace($after['events'], ['enabled'=>false]);
        $this->put('/admin/homepage', ['section'=>'events','content'=>$events,'version'=>$version+1])->assertRedirect();
        $this->get('/')->assertInertia(fn (Assert $view) => $view->component('public/Home')->where('content.trends.heading','Updated trends heading')->where('content.events.enabled',false)->has('events',0));
    }

    public function test_unknown_fields_and_unsafe_destinations_are_rejected(): void
    {
        $page = HomePageContent::query()->firstOrCreate(['key'=>'home'], ['content'=>[]]);
        $version = (int) $page->fresh()->revision;
        $section = HomepagePresentation::defaults()['trends'];
        $this->actingAs(User::factory()->create(['is_admin'=>true,'onboarding_step'=>3,'email_verified_at'=>now()]));
        $this->put('/admin/homepage', ['section'=>'trends','content'=>array_replace($section,['button_url'=>'/admin']),'version'=>$version])->assertSessionHasErrors('content.button_url');
        $this->put('/admin/homepage', ['section'=>'trends','content'=>array_replace($section,['removed_jobs'=>true]),'version'=>$version])->assertSessionHasErrors('content');
        $this->put('/admin/homepage', ['section'=>'careers','content'=>$section,'version'=>$version])->assertSessionHasErrors('section');
        $this->assertSame($version,(int) $page->fresh()->revision);
    }
}
