<?php

namespace Tests\Feature\Seeders;

use App\Models\Post;
use App\Models\User;
use Database\Seeders\DemoProfileAndDiscussionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class DemoProfileAndDiscussionsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_reference_profile_and_public_discussions_are_persisted_idempotently(): void
    {
        config()->set('pm-circle.demo_content_enabled', true);
        config()->set('pm-circle.demo_profile_email', null);

        $this->seed(DemoProfileAndDiscussionsSeeder::class);
        $sara = User::query()->where('email', 'demo-sara@example.invalid')->firstOrFail();

        $this->assertSame('Sara Ahmed', $sara->name);
        $this->assertSame('/images/demo/sara.webp', $sara->profile->avatar_path);
        $this->assertSame('Project Manager | Agile delivery', $sara->profile->headline);
        $this->assertSame(['English', 'Bangla'], $sara->profile->languages);
        $this->assertSame(1, $sara->experiences()->count());
        $this->assertSame(1, $sara->profileProjects()->count());
        $this->assertSame(1, $sara->educations()->count());
        $this->assertSame(1, $sara->certifications()->count());
        $this->assertFalse((bool) $sara->certifications()->firstOrFail()->verified);

        $discussion = Post::query()->where('title', 'How to run concise and effective status meetings')->firstOrFail();
        $this->assertGreaterThanOrEqual(2, $discussion->comments()->count());
        $count = Post::query()->count();

        $this->seed(DemoProfileAndDiscussionsSeeder::class);
        $this->assertSame($count, Post::query()->count());
        $this->assertSame(2, $discussion->comments()->count());
        $this->assertSame(1, $sara->fresh()->experiences()->count());

        $this->actingAs($sara)->get(route('profile.edit', ['tab' => 'edit']))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('settings/profile')
                ->has('profileData.experiences', 1)
                ->has('profileData.projects', 1)
                ->has('profileData.educations', 1)
                ->has('profileData.certifications', 1));
        $this->get('/community')->assertOk();
    }

    public function test_opted_in_local_member_keeps_their_existing_identity_and_profile_fields(): void
    {
        config()->set('pm-circle.demo_content_enabled', true);
        $member = User::factory()->create(['name' => 'Actual Admin Member']);
        $member->profile()->create(['headline' => 'My original headline']);
        $originalPassword = $member->password;
        $originalVerification = $member->email_verified_at;
        config()->set('pm-circle.demo_profile_email', $member->email);

        $this->seed(DemoProfileAndDiscussionsSeeder::class);

        $member->refresh();
        $this->assertSame('Actual Admin Member', $member->name);
        $this->assertSame($originalPassword, $member->password);
        $this->assertEquals($originalVerification, $member->email_verified_at);
        $this->assertSame('My original headline', $member->profile->headline);
        $this->assertNull($member->profile->avatar_path);
        $this->assertSame(1, $member->experiences()->count());
        $this->assertSame(1, $member->profileProjects()->count());

        $this->seed(DemoProfileAndDiscussionsSeeder::class);
        $this->assertSame(1, $member->experiences()->count());
        $this->assertSame(1, $member->profileProjects()->count());
    }

    public function test_demo_content_can_be_disabled_without_creating_records(): void
    {
        config()->set('pm-circle.demo_content_enabled', false);
        $this->seed(DemoProfileAndDiscussionsSeeder::class);
        $this->assertDatabaseMissing('users', ['email' => 'demo-sara@example.invalid']);
        $this->assertDatabaseCount('posts', 0);
    }
}
