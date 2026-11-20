<?php

namespace Tests\Feature\Admin;

use App\Models\HomePageContent;
use App\Models\User;
use App\Support\Community\ReactionIconCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class ReactionIconManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake('public');
        ReactionIconCatalog::clearCache();
    }

    private function admin(): User
    {
        return User::factory()->create([
            'is_admin' => true, 'onboarding_step' => 3, 'email_verified_at' => now(),
        ]);
    }

    private function icon(string $name = 'icon.png'): UploadedFile
    {
        // A genuine 64x64 PNG; works even when the PHP GD extension is unavailable.
        $bytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAZUlEQVR42u3QAQEAIAgDsGNMm5oOe8AWYZX7OoudLCdAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAib4VqACkpmgLxcAAAAASUVORK5CYII=', true);

        return UploadedFile::fake()->createWithContent($name, $bytes);
    }

    public function test_guest_and_member_cannot_manage_reaction_icons(): void
    {
        $this->get('/admin/reaction-icons')->assertRedirect();
        $member = User::factory()->create(['onboarding_step' => 3, 'email_verified_at' => now()]);
        $this->actingAs($member)->get('/admin/reaction-icons')->assertForbidden();
        $this->post('/admin/reaction-icons/like', ['icon' => $this->icon()])->assertForbidden();
        $this->delete('/admin/reaction-icons/like')->assertForbidden();
        $this->actingAs($this->admin())->get('/admin/reaction-icons')->assertOk();
    }

    public function test_upload_updates_shared_catalog_and_restoring_removes_uploaded_asset(): void
    {
        $this->actingAs($this->admin());
        $this->assertCount(7, ReactionIconCatalog::paths());
        $this->assertSame([], ReactionIconCatalog::urls());

        $this->post('/admin/reaction-icons/like', ['icon' => $this->icon()])
            ->assertRedirect('/admin/reaction-icons');
        $path = ReactionIconCatalog::paths()['like'];
        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);
        $this->assertArrayHasKey('like', ReactionIconCatalog::urls());
        $this->assertNull(ReactionIconCatalog::paths()['love']);
        $this->assertSame(1, HomePageContent::query()->where('key', ReactionIconCatalog::KEY)->count());

        $this->delete('/admin/reaction-icons/like')->assertRedirect('/admin/reaction-icons');
        Storage::disk('public')->assertMissing($path);
        $this->assertSame([], ReactionIconCatalog::urls());
        $this->assertNull(ReactionIconCatalog::paths()['like']);
    }

    public function test_replacing_one_icon_does_not_erase_other_types(): void
    {
        $this->actingAs($this->admin());
        $this->post('/admin/reaction-icons/like', ['icon' => $this->icon()]);
        $first = ReactionIconCatalog::paths()['like'];
        $this->post('/admin/reaction-icons/love', ['icon' => $this->icon()]);
        $love = ReactionIconCatalog::paths()['love'];
        $this->post('/admin/reaction-icons/like', ['icon' => $this->icon()]);

        $this->assertNotSame($first, ReactionIconCatalog::paths()['like']);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($love);
        $this->assertSame($love, ReactionIconCatalog::paths()['love']);
    }

    public function test_guest_pages_receive_custom_icons_and_default_icons_remain_unconfigured(): void
    {
        $this->actingAs($this->admin())->post('/admin/reaction-icons/care', ['icon' => $this->icon()])
            ->assertRedirect('/admin/reaction-icons');
        auth()->logout();

        $response = $this->get('/community');
        $response->assertOk();
        $response->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->where('reactionIcons.care', ReactionIconCatalog::urls()['care'])
            ->missing('reactionIcons.like')
            ->etc()
        );
    }

    public function test_invalid_formats_and_invalid_type_are_rejected(): void
    {
        $this->actingAs($this->admin());
        $this->post('/admin/reaction-icons/like', [
            'icon' => UploadedFile::fake()->createWithContent('icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
        ])->assertSessionHasErrors('icon');
        $this->post('/admin/reaction-icons/custom', ['icon' => $this->icon()])->assertNotFound();
        $this->delete('/admin/reaction-icons/custom')->assertNotFound();
        $this->assertSame([], ReactionIconCatalog::urls());
    }
}
