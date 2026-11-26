<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Actions\Fortify\CreateNewUser;
use App\Support\Legal\LegalPages;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class LegalPageManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function admin(): User
    {
        return User::factory()->create(['is_admin' => true, 'status' => 'active', 'onboarding_step' => 3, 'email_verified_at' => now()]);
    }

    public function test_draft_publication_order_and_history_are_independent_for_both_documents(): void
    {
        $original = LegalPages::defaults('terms');
        $draft = $original;
        $draft['title'] = 'Updated Terms';
        $draft['sections'] = [$original['sections'][2], $original['sections'][0]];
        $draft['sections'][] = ['id' => 'new-section', 'title' => 'New section', 'body' => 'New paragraph.'];
        $this->actingAs($this->admin());
        $this->put('/admin/legal/terms', ['revision' => 1, 'content' => $draft])->assertRedirect();
        $this->get('/terms')->assertInertia(fn (Assert $page) => $page->component('public/Terms')->where('legalPage.content.title', $original['title'])->where('legalPage.version', null));
        $this->post('/admin/legal/terms/publish', ['revision' => 2, 'confirmed' => true])->assertRedirect();
        $first = LegalPages::publicDocument('terms')['version'];
        $this->get('/terms')->assertInertia(fn (Assert $page) => $page->component('public/Terms')->where('legalPage.content.title', 'Updated Terms')->where('legalPage.content.sections.0.id', $original['sections'][2]['id'])->has('legalPage.content.sections', 3));
        $this->assertSame(LegalPages::defaults('privacy'), LegalPages::publicDocument('privacy')['content']);
        $draft['title'] = 'Second version';
        $this->put('/admin/legal/terms', ['revision' => 3, 'content' => $draft])->assertRedirect();
        $this->post('/admin/legal/terms/publish', ['revision' => 4, 'confirmed' => true])->assertRedirect();
        $this->get('/terms?version='.$first)->assertInertia(fn (Assert $page) => $page->where('legalPage.content.title', 'Updated Terms'));
        $this->get('/privacy?version='.$first)->assertNotFound();
        $this->assertDatabaseCount('legal_page_versions', 2);
        $this->assertSame('Second version', LegalPages::publicDocument('terms')['content']['title']);
    }

    public function test_contents_links_and_body_links_are_versioned_and_validated(): void
    {
        $this->actingAs($this->admin());
        $draft = LegalPages::defaults('privacy');
        $draft['sections'][0]['toc_label'] = 'About us';
        $draft['sections'][0]['show_in_toc'] = true;
        $draft['sections'][1]['show_in_toc'] = false;
        $draft['sections'][0]['body'] .= "\n\n[Support](/contact)";
        $this->put('/admin/legal/privacy', ['revision' => 1, 'content' => $draft])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame(LegalPages::defaults('privacy'), LegalPages::publicDocument('privacy')['content']);
        $this->post('/admin/legal/privacy/publish', ['revision' => 2, 'confirmed' => true])->assertRedirect();
        $first = LegalPages::publicDocument('privacy');
        $this->assertSame('About us', $first['content']['sections'][0]['toc_label']);
        $this->assertFalse($first['content']['sections'][1]['show_in_toc']);
        $this->assertStringContainsString('[Support](/contact)', $first['content']['sections'][0]['body']);
        $draft['sections'][0]['body'] .= "\n\n[Unsafe](javascript:bad)";
        $this->put('/admin/legal/privacy', ['revision' => 3, 'content' => $draft])->assertSessionHasErrors('content.sections.0.body');
        $this->assertSame($first, LegalPages::publicDocument('privacy'));
    }

    public function test_unauthorized_members_cannot_edit_or_publish_and_unknown_documents_are_rejected(): void
    {
        $this->get('/admin/legal/terms')->assertRedirect();
        $this->actingAs(User::factory()->create(['is_admin' => false, 'onboarding_step' => 3]));
        $this->get('/admin/legal/privacy')->assertForbidden();
        $this->put('/admin/legal/privacy', ['revision' => 1, 'content' => LegalPages::defaults('privacy')])->assertForbidden();
        $this->post('/admin/legal/privacy/publish', ['revision' => 1, 'confirmed' => true])->assertForbidden();
        $this->actingAs($this->admin())->get('/admin/legal/refund')->assertNotFound();
    }

    public function test_invalid_sections_stale_revision_and_unconfirmed_publication_are_rejected(): void
    {
        $this->actingAs($this->admin());
        $draft = LegalPages::defaults('privacy');
        $draft['sections'][1]['id'] = $draft['sections'][0]['id'];
        $this->put('/admin/legal/privacy', ['revision' => 1, 'content' => $draft])->assertSessionHasErrors();
        $this->put('/admin/legal/privacy', ['revision' => 2, 'content' => LegalPages::defaults('privacy')])->assertSessionHasErrors('revision');
        $this->post('/admin/legal/privacy/publish', ['revision' => 1, 'confirmed' => false])->assertSessionHasErrors('confirmed');
        $this->assertDatabaseCount('legal_page_versions', 0);
        $this->assertSame(1, (int) DB::table('legal_pages')->where('document', 'privacy')->value('revision'));
    }

    public function test_production_gate_does_not_trust_legacy_publication_flag(): void
    {
        config(['pm-circle.legal_documents_published' => true]);
        $previous = app()->environment();
        app()->instance('env', 'production');
        try {
            DB::transaction(fn () => LegalPages::verifyAcceptance([]));
            $this->fail('Registration must not accept an unpublished legal document.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('legal_acceptance', $exception->errors());
        } finally {
            app()->instance('env', $previous);
        }
    }

    public function test_registration_binding_rejects_stale_versions_and_retains_existing_acceptance(): void
    {
        $member = User::factory()->create(['accepted_terms_version' => '2026-10-29', 'accepted_privacy_version' => '2026-10-29']);
        $this->actingAs($this->admin());
        foreach (LegalPages::DOCUMENTS as $document) {
            $this->post('/admin/legal/'.$document.'/publish', ['revision' => 1, 'confirmed' => true])->assertRedirect();
        }
        $current = LegalPages::acceptance();
        $this->assertTrue($current['ready']);
        $this->assertSame('2026-10-29', $member->fresh()->accepted_terms_version);
        DB::transaction(function () use ($current): void {
            $this->assertSame($current, LegalPages::verifyAcceptance(['terms_version' => $current['terms'], 'privacy_version' => $current['privacy']]));
        });
        config(['pm-circle.signup_verification_mode' => 'off']);
        $newMember = app(CreateNewUser::class)->create([
            'name' => 'New member', 'email' => 'legal-registration@example.test',
            'password' => 'Strong!Password123', 'password_confirmation' => 'Strong!Password123',
            'legal_acceptance' => true, 'terms_version' => $current['terms'], 'privacy_version' => $current['privacy'],
        ]);
        $this->assertSame($current['terms'], $newMember->accepted_terms_version);
        $this->assertSame($current['privacy'], $newMember->accepted_privacy_version);
        $this->expectException(ValidationException::class);
        DB::transaction(fn () => LegalPages::verifyAcceptance(['terms_version' => '2026-10-29', 'privacy_version' => $current['privacy']]));
    }
}
