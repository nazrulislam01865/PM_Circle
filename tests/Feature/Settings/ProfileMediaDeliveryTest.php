<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ProfileMediaDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_avatar_upload_is_saved_and_visible_in_overview_and_shared_navigation(): void
    {
        Storage::fake('public');
        $member = User::factory()->create();
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+XRs9WQAAAABJRU5ErkJggg==');
        $file = UploadedFile::fake()->createWithContent('avatar.png', $png);

        $this->actingAs($member)->post(route('profile.avatar.upload'), [
            'avatar' => $file,
            'tab' => 'overview',
        ])->assertRedirect(route('profile.edit', ['tab' => 'overview']));

        $stored = $member->fresh()->profile->getRawOriginal('avatar_path');
        $this->assertStringStartsWith('/storage/profile-avatars/', $stored);
        Storage::disk('public')->assertExists(substr($stored, strlen('/storage/')));
        $url = '/profile-media/avatar/'.basename($stored);
        $this->get($url)->assertOk();
        $this->get(route('profile.edit', ['tab' => 'overview']))
            ->assertOk()->assertInertia(fn ($page) => $page
                ->where('profileData.avatar_path', $url)
                ->where('auth.user.avatar_path', $url)
                ->where('auth.user.avatar', $url)
                ->where('memberShell.member.avatar_path', $url));
    }

    public function test_replacing_and_removing_avatar_keeps_disk_and_visible_url_in_sync(): void
    {
        Storage::fake('public');
        $member = User::factory()->create();
        $image = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+XRs9WQAAAABJRU5ErkJggg==');

        $this->actingAs($member)->post(route('profile.avatar.upload'), [
            'avatar' => UploadedFile::fake()->createWithContent('first.png', $image),
        ])->assertRedirect();
        $old = $member->fresh()->profile->getRawOriginal('avatar_path');
        $this->assertSame('/profile-media/avatar/'.basename($old), $member->fresh()->profile->avatar_path);

        $this->actingAs($member)->post(route('profile.avatar.upload'), [
            'avatar' => UploadedFile::fake()->createWithContent('second.png', $image),
        ])->assertRedirect();
        $new = $member->fresh()->profile->getRawOriginal('avatar_path');
        $this->assertNotSame($old, $new);
        Storage::disk('public')->assertMissing(substr($old, strlen('/storage/')));
        Storage::disk('public')->assertExists(substr($new, strlen('/storage/')));
        $this->get('/profile-media/avatar/'.basename($new))->assertOk();

        $this->actingAs($member)->delete(route('profile.avatar.delete'))->assertRedirect();
        $this->assertNull($member->fresh()->profile->avatar_path);
        Storage::disk('public')->assertMissing(substr($new, strlen('/storage/')));
        $this->get('/profile-media/avatar/'.basename($new))->assertNotFound();
    }

    public function test_cover_upload_is_visible_after_creating_a_new_profile(): void
    {
        Storage::fake('public');
        $member = User::factory()->create();
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+XRs9WQAAAABJRU5ErkJggg==');

        $this->actingAs($member)->post(route('profile.cover.upload'), [
            'cover_photo' => UploadedFile::fake()->createWithContent('cover.png', $png),
            'tab' => 'edit',
        ])->assertRedirect(route('profile.edit', ['tab' => 'edit']));

        $stored = $member->fresh()->profile->getRawOriginal('cover_photo_path');
        $this->assertStringStartsWith('/storage/profile-covers/', $stored);
        Storage::disk('public')->assertExists(substr($stored, strlen('/storage/')));

        $this->get(route('profile.edit', ['tab' => 'edit']))
            ->assertOk()->assertInertia(fn ($page) => $page
                ->where('profileData.cover_photo_path', '/profile-media/cover/'.basename($stored)));
    }

    public function test_profile_images_are_displayed_when_the_public_storage_link_is_missing(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('profile-avatars/test-photo.jpg', 'sample-image-data');
        $member = User::factory()->create();
        $member->profile()->create(['avatar_path' => '/storage/profile-avatars/test-photo.jpg']);

        $this->actingAs($member)->get(route('profile.edit', ['tab' => 'overview']))
            ->assertOk()->assertInertia(fn ($page) => $page
                ->component('settings/profile')
                ->where('profileData.avatar_path', '/profile-media/avatar/test-photo.jpg')
                ->where('auth.user.avatar_path', '/profile-media/avatar/test-photo.jpg')
                ->where('auth.user.avatar', '/profile-media/avatar/test-photo.jpg')
                ->where('memberShell.member.avatar_path', '/profile-media/avatar/test-photo.jpg'));
        $this->get('/profile-media/avatar/test-photo.jpg')->assertOk();
        $this->get('/profile-media/avatar/other-photo.jpg')->assertNotFound();
    }
}
