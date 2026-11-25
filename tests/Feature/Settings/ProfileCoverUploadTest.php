<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class ProfileCoverUploadTest extends TestCase
{
    use RefreshDatabase;

    private function cover(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('cover.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP9sAAAAASUVORK5CYII='));
    }

    public function test_cover_upload_replaces_only_owners_cover_and_clears_stale_editor_url(): void
    {
        $disk = Storage::fake('public');
        $disk->put('profile-covers/previous.png', 'previous cover');
        $member = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        $member->profile()->create([
            'cover_photo_path' => '/storage/profile-covers/previous.png',
            'editor_details' => ['cover_photo_url' => 'https://example.com/old.png', 'current_organization' => 'Example'],
        ]);
        $other->profile()->create(['cover_photo_path' => 'https://example.com/other.png']);
        $this->actingAs($member)->post(route('profile.cover.upload'), [
            'cover_photo' => $this->cover(), 'tab' => 'overview', 'user_id' => $other->id,
        ])->assertSessionHasNoErrors()->assertRedirect(route('profile.edit', ['tab' => 'overview']));
        $profile = $member->profile()->firstOrFail();
        $path = $profile->getRawOriginal('cover_photo_path');
        $this->assertStringStartsWith('/storage/profile-covers/', $path);
        $disk->assertExists(substr($path, strlen('/storage/')));
        $disk->assertMissing('profile-covers/previous.png');
        $this->assertSame('', $profile->editor_details['cover_photo_url']);
        $this->assertSame('Example', $profile->editor_details['current_organization']);
        $this->assertSame('https://example.com/other.png', $other->profile()->firstOrFail()->cover_photo_path);
    }

    public function test_invalid_upload_does_not_replace_existing_cover(): void
    {
        Storage::fake('public');
        $member = User::factory()->create(['onboarding_step' => 3]);
        $member->profile()->create(['cover_photo_path' => 'https://example.com/current.png']);
        $this->actingAs($member)->post(route('profile.cover.upload'), [
            'cover_photo' => UploadedFile::fake()->create('invalid.pdf', 20, 'application/pdf'),
        ])->assertSessionHasErrors('cover_photo');
        $this->assertSame('https://example.com/current.png', $member->profile()->firstOrFail()->cover_photo_path);
    }
}
