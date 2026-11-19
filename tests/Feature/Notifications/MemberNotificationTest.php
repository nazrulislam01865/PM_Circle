<?php

namespace Tests\Feature\Notifications;

use App\Domain\Notifications\ActivityNotifier;
use App\Jobs\BroadcastNotificationUpdate;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Broadcast;
use Mockery;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class MemberNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
    }

    public function test_follow_notifications_are_private_and_deduplicated(): void
    {
        $actor = User::factory()->create(['onboarding_step' => 3]);
        $recipient = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        $service = app(ActivityNotifier::class);
        $service->forFollow($actor, $recipient);
        $service->forFollow($actor, $recipient);
        $service->forFollow($actor, $actor);

        $this->assertSame(1, DB::table('notifications')->count());
        Queue::assertPushed(BroadcastNotificationUpdate::class, 1);

        $id = DB::table('notifications')->value('id');
        $this->actingAs($other)->getJson('/notifications/feed')->assertOk()->assertJsonCount(0, 'items');
        $this->actingAs($other)->postJson("/notifications/{$id}/read")->assertOk();
        $this->assertNull(DB::table('notifications')->where('id', $id)->value('read_at'));

        $this->actingAs($recipient)->getJson('/notifications/feed')->assertOk()
            ->assertJsonPath('unread_count', 1)->assertJsonCount(1, 'items');
        $this->actingAs($recipient)->postJson("/notifications/{$id}/read")->assertOk();
        $this->actingAs($recipient)->getJson('/notifications/feed')->assertJsonPath('unread_count', 0);
    }

    public function test_reactions_do_not_notify_unpublished_or_muted_posts(): void
    {
        $author = User::factory()->create(['onboarding_step' => 3]);
        $actor = User::factory()->create(['onboarding_step' => 3]);
        $post = Post::create([
            'author_id' => $author->id, 'body' => 'A practical question',
            'visibility' => 'public', 'status' => 'pending_review',
        ]);
        $notifier = app(ActivityNotifier::class);
        $notifier->forPostReaction($actor, $post);
        $this->assertSame(0, DB::table('notifications')->count());

        $post->update(['status' => 'published', 'published_at' => now()]);
        $post->forceFill(['notifications_muted_at' => now()])->save();
        $notifier->forPostReaction($actor, $post);
        $this->assertSame(0, DB::table('notifications')->count());

        $post->forceFill(['notifications_muted_at' => null])->save();
        $notifier->forPostReaction($actor, $post);
        $notifier->forPostReaction($actor, $post);
        $this->assertSame(1, DB::table('notifications')->count());
    }

    public function test_read_all_applies_only_to_authenticated_member(): void
    {
        $actor = User::factory()->create(['onboarding_step' => 3]);
        $recipient = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        app(ActivityNotifier::class)->forFollow($actor, $recipient);
        app(ActivityNotifier::class)->forFollow($actor, $other);
        $this->actingAs($recipient)->postJson('/notifications/read-all')->assertOk();
        $this->actingAs($recipient)->getJson('/notifications/feed')->assertJsonPath('unread_count', 0);
        $this->actingAs($other)->getJson('/notifications/feed')->assertJsonPath('unread_count', 1);
    }
    public function test_failed_primary_broadcast_still_delivers_to_reverb(): void
    {
        config()->set('broadcasting.connections.pusher.key', 'public-primary-key');
        config()->set('broadcasting.connections.reverb.key', 'public-fallback-key');
        $primary = Mockery::mock();
        $fallback = Mockery::mock();
        $primary->shouldReceive('broadcast')->once()->andThrow(new \RuntimeException('Primary unavailable'));
        $fallback->shouldReceive('broadcast')->once()->withArgs(static function ($channels, $event, $payload): bool {
            return $event === 'notifications.updated' && $payload === ['refresh' => true]
                && count($channels) === 1 && (string) $channels[0] === 'private-users.42';
        });
        Broadcast::shouldReceive('connection')->once()->with('pusher')->andReturn($primary);
        Broadcast::shouldReceive('connection')->once()->with('reverb')->andReturn($fallback);

        (new BroadcastNotificationUpdate(42))->handle();
    }

}
