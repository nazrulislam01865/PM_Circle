<?php

namespace Tests\Feature\Events;

use App\Models\CommunityEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class CommunityEventTest extends TestCase
{
    use RefreshDatabase;

    private function event(array $attributes = []): CommunityEvent
    {
        return CommunityEvent::query()->create(array_replace([
            'slug' => 'test-workshop', 'title' => 'Test workshop', 'description' => 'Practice together.',
            'category' => 'Workshop', 'host' => 'PM Circle', 'starts_at' => now()->addDays(3),
            'format' => 'online', 'status' => 'published', 'open_to_everyone' => true,
            'registration_open' => true, 'discussion_open' => true,
        ], $attributes));
    }

    private function registration(): array
    {
        return ['name' => 'Guest Visitor', 'email' => 'guest@example.com', 'phone' => '+8801712345678', 'role' => 'Student'];
    }

    public function test_public_catalog_excludes_pending_and_past_events_and_filters_results(): void
    {
        $event = $this->event();
        $pending = $this->event(['slug' => 'pending-event', 'status' => 'pending']);
        $this->event(['slug' => 'past-event', 'starts_at' => now()->subDay()]);
        $this->get('/events?search=workshop&format=online')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('events/Index')->has('events.data', 1)->where('events.data.0.slug', $event->slug));
        $this->get('/events/'.$pending->slug)->assertNotFound();
        $this->get('/events/missing-event')->assertNotFound();
    }

    public function test_guests_can_register_once_but_cannot_register_for_member_only_or_closed_events(): void
    {
        $event = $this->event();
        $url = '/events/'.$event->slug.'/register';
        $this->post($url, $this->registration())->assertRedirect('/events/'.$event->slug);
        $this->post($url, array_replace($this->registration(), ['email' => 'GUEST@example.com']))->assertRedirect();
        $this->assertDatabaseCount('community_event_registrations', 1);
        $members = $this->event(['slug' => 'members-only', 'open_to_everyone' => false]);
        $this->post('/events/'.$members->slug.'/register', $this->registration())->assertForbidden();
        $closed = $this->event(['slug' => 'closed-event', 'registration_open' => false]);
        $this->post('/events/'.$closed->slug.'/register', $this->registration())->assertSessionHasErrors('phone');
        $this->post($url, array_replace($this->registration(), ['phone' => '123']))->assertSessionHasErrors('phone');
        $this->assertDatabaseCount('community_event_registrations', 1);
        $this->get('/events/'.$event->slug)->assertInertia(fn (Assert $page) => $page->component('events/Show')->missing('registrations'));
    }

    public function test_comments_require_review_and_admin_routes_reject_members(): void
    {
        $event = $this->event();
        $this->post('/events/'.$event->slug.'/comments', ['name' => 'Guest', 'message' => 'Hello'])->assertRedirect();
        $this->assertDatabaseHas('community_event_comments', ['event_id' => $event->id, 'status' => 'pending']);
        $this->get('/events/'.$event->slug)->assertInertia(fn (Assert $page) => $page->component('events/Show')->has('comments.data', 0));
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->get('/admin/events')->assertForbidden();
        $admin = User::factory()->create(['is_admin' => true]);
        $comment = \Illuminate\Support\Facades\DB::table('community_event_comments')->where('event_id', $event->id)->value('id');
        $this->actingAs($admin)->patch('/admin/events/'.$event->id.'/comments/'.$comment, ['status' => 'approved'])->assertRedirect();
        $this->assertDatabaseHas('community_event_comments', ['id' => $comment, 'status' => 'approved']);
    }

    public function test_member_submissions_cannot_self_publish_or_mark_as_sponsored(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $data = ['title' => 'Member workshop', 'description' => 'Practice together', 'category' => 'Workshop', 'host' => 'Member',
            'starts_at' => now('Asia/Dhaka')->addDays(3)->format('Y-m-d\TH:i'), 'format' => 'online',
            'open_to_everyone' => true, 'registration_open' => true, 'discussion_open' => true, 'sponsored' => true, 'status' => 'published'];
        $this->actingAs($member)->post('/events', $data)->assertRedirect('/events/create');
        $event = CommunityEvent::query()->where('title', 'Member workshop')->firstOrFail();
        $this->assertSame('pending', $event->status);
        $this->assertFalse($event->sponsored);
        $this->get('/events/'.$event->slug)->assertNotFound();
        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)->patch('/admin/events/'.$event->id.'/status', ['status' => 'published'])->assertRedirect();
        $this->assertDatabaseHas('community_events', ['id' => $event->id, 'status' => 'published', 'publisher_id' => $admin->id]);
    }

    public function test_admin_can_save_map_link_and_remove_media_without_affecting_other_events(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        \Illuminate\Support\Facades\Storage::fake('public');
        $disk = \Illuminate\Support\Facades\Storage::disk('public');
        $disk->put('community-events/old-cover.jpg', 'cover');
        $disk->put('community-events/old-map.jpg', 'map');
        $event = $this->event(['format' => 'in-person', 'location' => 'Dhaka', 'cover_path' => 'community-events/old-cover.jpg', 'map_path' => 'community-events/old-map.jpg']);
        $data = ['title' => $event->title, 'description' => $event->description, 'category' => $event->category, 'host' => $event->host,
            'starts_at' => now('Asia/Dhaka')->addDays(3)->format('Y-m-d\TH:i'), 'format' => 'in-person', 'location' => 'Dhaka',
            'venue' => 'Conference centre', 'map_link' => 'https://maps.app.goo.gl/ExampleLink', 'open_to_everyone' => true,
            'registration_open' => true, 'discussion_open' => true, 'remove_cover_image' => true];
        $url = '/admin/events/'.$event->id;
        $this->actingAs($admin)->post($url, $data)->assertRedirect('/admin/events');
        $this->assertDatabaseHas('community_events', ['id' => $event->id, 'map_link' => $data['map_link'], 'cover_path' => null, 'map_path' => 'community-events/old-map.jpg']);
        $disk->assertMissing('community-events/old-cover.jpg');
        $disk->assertExists('community-events/old-map.jpg');
        $this->get($url.'/edit')->assertInertia(fn (Assert $page) => $page->component('admin/EventEditor')->where('event.map_link', $data['map_link']));
        $this->get('/events/'.$event->slug)->assertInertia(fn (Assert $page) => $page->component('events/Show')->where('event.mapLink', $data['map_link']));
        foreach (['https://example.com/maps', 'javascript:alert(1)', 'https://www.google.com.evil.example/maps', 'https://www.google.com/url?q=https://example.com'] as $invalid) {
            $this->post($url, array_replace($data, ['map_link' => $invalid]))->assertSessionHasErrors('map_link');
        }
        $this->post($url, array_replace($data, ['format' => 'online']))->assertRedirect('/admin/events');
        $this->assertDatabaseHas('community_events', ['id' => $event->id, 'map_link' => null, 'map_path' => null]);
        $disk->assertMissing('community-events/old-map.jpg');
    }
}
