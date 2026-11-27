<?php

namespace Tests\Feature\Settings;

use App\Domain\Notifications\ActivityNotifier;
use App\Domain\Notifications\ActivityPreferences;
use App\Jobs\DeliverActivityEmail;
use App\Mail\ActivityUpdate;
use App\Models\User;
use App\Services\Email\EmailService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class AccountSettingsEnforcementTest extends TestCase
{
    use RefreshDatabase;

    public function test_partial_privacy_updates_preserve_other_saved_choices(): void
    {
        $user = User::factory()->create(['onboarding_step' => 3]);
        $user->profile()->create(['visibility' => 'public', 'field_visibility' => ['full_name' => 'private']]);
        $this->actingAs($user)->patch('/settings/account', ['field_visibility_patch' => ['professional_headline' => 'community']])->assertSessionHasNoErrors();
        $this->assertSame(['full_name' => 'private', 'professional_headline' => 'community'], $user->profile()->first()->field_visibility);
        $this->patch('/settings/account', ['field_visibility_patch' => ['unknown' => 'public']])->assertSessionHasErrors('field_visibility_patch');
    }

    public function test_email_only_notification_is_not_in_the_feed_and_is_claimed_once(): void
    {
        config(['transactional-mail.provider' => 'laravel']);
        Mail::fake(); Queue::fake();
        $recipient = User::factory()->create(['onboarding_step' => 3, 'account_preferences' => ['inapp' => false, 'mail' => true, 'digest' => 'Instant']]);
        $actor = User::factory()->create(['onboarding_step' => 3]);
        app(ActivityNotifier::class)->forFollow($actor, $recipient);
        app(ActivityNotifier::class)->forFollow($actor, $recipient);
        $row = DB::table('notifications')->sole();
        $this->assertSame('pending', $row->email_status);
        $this->actingAs($recipient)->getJson('/notifications/feed')->assertOk()->assertJsonCount(0, 'items');
        $job = new DeliverActivityEmail($recipient->id, (string) $row->email_due_at);
        $job->handle(app(EmailService::class));
        $job->handle(app(EmailService::class));
        Mail::assertSent(ActivityUpdate::class, 1);
        $this->assertSame('sent', DB::table('notifications')->value('email_status'));
    }

    public function test_opt_out_cancels_pending_email_and_unverified_addresses_are_not_queued(): void
    {
        Queue::fake();
        $recipient = User::factory()->create(['onboarding_step' => 3, 'account_preferences' => ['inapp' => false, 'mail' => true, 'digest' => 'Daily']]);
        $actor = User::factory()->create(['onboarding_step' => 3]);
        app(ActivityNotifier::class)->forFollow($actor, $recipient);
        $this->actingAs($recipient)->patch('/settings/account', ['mail' => false])->assertSessionHasNoErrors();
        $this->assertSame('skipped', DB::table('notifications')->value('email_status'));
        $unverified = User::factory()->unverified()->create(['onboarding_step' => 3, 'account_preferences' => ['inapp' => false, 'mail' => true]]);
        app(ActivityNotifier::class)->forFollow($actor, $unverified);
        $this->assertFalse(DB::table('notifications')->where('notifiable_id', $unverified->id)->exists());
    }

    public function test_quiet_hours_and_digest_timezone(): void
    {
        $now = CarbonImmutable::parse('2026-11-27 18:00:00', 'UTC'); // midnight in Dhaka
        $preferences = ['quiet' => true, 'quietStart' => '22:00', 'quietEnd' => '07:00', 'timezone' => 'Asia/Dhaka', 'mail' => true, 'digest' => 'Daily'];
        $this->assertFalse(ActivityPreferences::allows($preferences, 'follow:3', $now));
        $this->assertSame('2026-11-28 02:00:00', ActivityPreferences::emailDue($preferences, $now)->format('Y-m-d H:i:s'));
        $this->assertFalse(ActivityPreferences::allows([], 'course-completed:3', $now));
        $this->assertTrue(ActivityPreferences::allows(['learnNotify' => true], 'course-completed:3', $now));
    }

    public function test_session_revocation_requires_password_and_preserves_other_users(): void
    {
        config(['session.driver' => 'database']);
        $user = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($user)->withSession(['test_session' => true]);
        $current = session()->getId();
        foreach ([[$current, $user->id], ['old-member-session', $user->id], ['other-member-session', $other->id]] as [$id, $owner]) {
            DB::table('sessions')->insertOrIgnore(['id' => $id, 'user_id' => $owner, 'payload' => base64_encode(serialize([])), 'last_activity' => time()]);
        }
        $this->post('/settings/account/revoke-sessions', ['password' => 'wrong'])->assertSessionHasErrors('password');
        $this->assertDatabaseHas('sessions', ['id' => 'old-member-session']);
        $this->post('/settings/account/revoke-sessions', ['password' => 'password'])->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('sessions', ['id' => 'old-member-session']);
        $this->assertDatabaseHas('sessions', ['id' => 'other-member-session']);
        $this->assertAuthenticatedAs($user);
    }
}
