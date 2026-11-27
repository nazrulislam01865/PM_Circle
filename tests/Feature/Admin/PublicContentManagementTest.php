<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Support\Admin\PublicPageContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class PublicContentManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        PublicPageContent::clear('about');
        PublicPageContent::clear('trends');
        $this->travelTo(now()->setDate(2026, 11, 27));
    }

    private function admin(): User
    {
        return User::factory()->create(['is_admin' => true, 'status' => 'active', 'email_verified_at' => now(), 'onboarding_step' => 3]);
    }

    public function test_page_section_management_is_authorized_and_preserves_other_sections(): void
    {
        $this->get('/admin/public-pages/about')->assertRedirect();
        $this->actingAs(User::factory()->create(['is_admin' => false, 'email_verified_at' => now(), 'onboarding_step' => 3]))
            ->get('/admin/public-pages/about')->assertForbidden();
        $this->actingAs($this->admin());
        $this->get('/about')->assertInertia(fn (Assert $page) => $page->component('public/About')->where('content.banner.title', 'About PM Circle'));
        $this->put('/admin/public-pages/about/intro', ['version' => 0, 'content' => ['title' => 'Updated introduction', 'description' => 'New text', 'enabled' => false]])->assertRedirect()->assertSessionHasNoErrors();
        $this->get('/about')->assertInertia(fn (Assert $page) => $page->where('content.intro.title', 'Updated introduction')->where('content.intro.enabled', false)->has('content.features.cards', 3));
        $this->put('/admin/public-pages/about/intro', ['version' => 0, 'content' => ['title' => 'Stale', 'description' => 'Stale', 'enabled' => true]])->assertSessionHasErrors('version');
        $company = PublicPageContent::defaults('about')['company'];
        $company['href'] = '//evil.example';
        $this->put('/admin/public-pages/about/company', ['version' => 1, 'content' => $company])->assertSessionHasErrors('content.href');
        $features = PublicPageContent::defaults('about')['features'];
        $features['cards'] = [];
        $this->put('/admin/public-pages/about/features', ['version' => 1, 'content' => $features])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame([], PublicPageContent::load('about')['features']['cards']);
        $this->assertSame('Updated introduction', PublicPageContent::load('about')['intro']['title']);
    }

    public function test_legacy_urls_and_three_listed_reports_are_preserved(): void
    {
        $this->get('/pm-trends')->assertInertia(fn (Assert $page) => $page->component('trends/Index')->where('reports.total', 3)->where('reports.data.0.slug', 'using-ai-for-project-updates-without-losing-the-facts'));
        $this->get('/pm-trends?search=Bangladesh&topic=Career%20Paths')->assertInertia(fn (Assert $page) => $page->where('reports.total', 1));
        $this->get('/pm-trends?search=nonexistent-report')->assertInertia(fn (Assert $page) => $page->where('reports.total', 0));
        $this->get('/pm-trends/top-project-management-job-trends-2025')->assertOk();
        $this->get('/pm-trends/not-a-report')->assertNotFound();
    }

    private function payload(): array
    {
        return ['revision' => 0, 'slug' => 'delivery-report', 'title' => 'Delivery report', 'summary' => 'Summary', 'category' => 'Delivery', 'status' => 'draft', 'listed' => true,
            'body_markdown' => '## Content\n<script>alert(1)</script> [Unsafe](javascript:alert%281%29)',
            'presentation' => ['readMinutes' => 2, 'sources' => []], 'sections' => []];
    }

    public function test_reports_can_be_created_edited_published_and_archived_without_exposing_drafts(): void
    {
        $this->actingAs($this->admin());
        $data = $this->payload();
        $this->post('/admin/trend-reports', $data)->assertRedirect()->assertSessionHasNoErrors();
        $id = DB::table('trend_articles')->where('slug', 'delivery-report')->value('id');
        $this->get('/pm-trends/delivery-report')->assertNotFound();
        $data['revision'] = 1;
        $data['status'] = 'published';
        $this->put('/admin/trend-reports/'.$id, $data)->assertRedirect()->assertSessionHasNoErrors();
        $this->get('/pm-trends?topic=Delivery')->assertInertia(fn (Assert $page) => $page->where('reports.total', 1)->where('reports.data.0.title', 'Delivery report'));
        $this->get('/pm-trends/delivery-report')->assertInertia(fn (Assert $page) => $page->component('trends/Show')->where('article.classification', 'Editorial report')->where('article.bodyHtml', fn ($html) => ! str_contains($html, '<script') && ! str_contains($html, 'href="javascript:')));
        $this->put('/admin/trend-reports/'.$id, $data)->assertSessionHasErrors('revision');
        $data['revision'] = 2;
        $data['status'] = 'archived';
        $this->put('/admin/trend-reports/'.$id, $data)->assertRedirect()->assertSessionHasNoErrors();
        $this->get('/pm-trends/delivery-report')->assertNotFound();
        $this->assertDatabaseHas('trend_articles', ['id' => $id, 'status' => 'archived']);
    }

    public function test_existing_ai_editorial_publication_is_visible_with_verified_sources(): void
    {
        $admin = $this->admin();
        $id = DB::table('trend_articles')->insertGetId(['slug' => 'approved-ai-trend', 'title' => 'Approved AI trend', 'summary' => 'AI summary', 'body_markdown' => '## Approved body', 'status' => 'published', 'ai_generated' => true, 'approved_by' => $admin->id, 'published_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $source = DB::table('trend_sources')->insertGetId(['canonical_url' => 'https://example.org/report', 'publisher' => 'Publisher', 'content_hash' => str_repeat('a', 64), 'rights_status' => 'verified', 'excerpt_encrypted' => 'private', 'verified_by' => $admin->id, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('trend_article_sources')->insert(['article_id' => $id, 'source_id' => $source]);
        $this->get('/pm-trends/approved-ai-trend')->assertInertia(fn (Assert $page) => $page->where('article.classification', 'AI Analysis')->where('article.sources.0.title', 'Publisher')->where('article.sources.0.url', 'https://example.org/report')->missing('article.sources.0.excerpt_encrypted'));
        $this->get('/pm-trends?search=Approved%20AI')->assertInertia(fn (Assert $page) => $page->where('reports.total', 1));
    }
}
