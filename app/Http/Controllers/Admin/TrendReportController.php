<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Trends\TrendReports;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveTrendReportRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class TrendReportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/TrendReports', ['reports' => DB::table('trend_articles')->orderByDesc('id')->paginate(25, ['id', 'slug', 'title', 'category', 'status', 'listed', 'ai_generated'])]);
    }

    public function edit(?int $report = null): Response
    {
        $row = $report === null ? null : DB::table('trend_articles')->where('id', $report)->first();
        abort_if($report !== null && ! $row, 404);
        $meta = $row ? TrendReports::presentation($row) : [];
        if ($row) $meta['readMinutes'] ??= TrendReports::readingMinutes($row->body_markdown);
        $verified = $row ? TrendReports::sources(collect([$row]))->get($row->id, collect())->values() : [];
        return Inertia::render('admin/TrendReportEditor', ['report' => $row ? [
            'id' => $row->id, 'revision' => $row->revision, 'slug' => $row->slug, 'title' => $row->title, 'summary' => $row->summary, 'category' => $row->category,
            'status' => $row->status, 'listed' => (bool) $row->listed, 'body_markdown' => $row->body_markdown,
            'presentation' => array_intersect_key($meta, array_flip(['articleTitle','articleLead','articleCategoryLabel','readMinutes','thumbnail','hero','attribution','intro','sources'])),
            'sections' => json_decode($row->sections ?? '[]', true) ?: [],
        ] : null, 'verifiedSources' => $verified, 'aiGenerated' => (bool) ($row->ai_generated ?? false), 'sample' => (bool) ($meta['sample'] ?? false)]);
    }

    public function save(SaveTrendReportRequest $request, ?int $report = null): RedirectResponse
    {
        $data = $request->validated();
        try {
            $id = DB::transaction(function () use ($data, $report, $request): int {
                $row = $report === null ? null : DB::table('trend_articles')->where('id', $report)->lockForUpdate()->first();
                abort_if($report !== null && ! $row, 404);
                if ((int) ($row->revision ?? 0) !== (int) $data['revision']) throw ValidationException::withMessages(['revision' => 'Report changed. Reload before saving.']);
                if ($row && $row->slug !== $data['slug']) throw ValidationException::withMessages(['slug' => 'Existing report URLs cannot be changed.']);
                $meta = $data['presentation'];
                $meta['readMinutes'] = (int) $meta['readMinutes'];
                $old = $row ? TrendReports::presentation($row) : [];
                // Preserve the provenance flag and verified AI source relationships.
                $meta['sample'] = (bool) ($old['sample'] ?? false);
                if ($row && DB::table('trend_article_sources')->where('article_id', $row->id)->exists()) $meta['sources'] = [];
                $markdown = $data['body_markdown'] ?? '';
                $sections = $data['sections'];
                $hasSectionContent = collect($sections)->contains(fn ($section) => filled($section['text'] ?? null) || filled($section['image'] ?? null) || filled($section['chart'] ?? null) || ! empty($section['bullets']));
                if ($data['status'] === 'published' && trim($markdown) === '' && ! $hasSectionContent && empty($meta['intro'])) throw ValidationException::withMessages(['body_markdown' => 'Add report content before publishing.']);
                $values = [
                    'slug' => $data['slug'], 'title' => $data['title'], 'summary' => $data['summary'], 'category' => $data['category'],
                    'status' => $data['status'], 'listed' => (bool) $data['listed'], 'body_markdown' => $markdown,
                    'presentation' => json_encode($meta, JSON_THROW_ON_ERROR), 'sections' => json_encode($sections, JSON_THROW_ON_ERROR),
                    'revision' => (int) ($row->revision ?? 0) + 1, 'ai_generated' => (bool) ($row->ai_generated ?? false),
                    'approved_by' => $data['status'] === 'published' ? $request->user()->id : ($row->approved_by ?? null),
                    'published_at' => $row->published_at ?? ($data['status'] === 'published' ? now() : null), 'updated_at' => now(),
                ];
                if ($row) { DB::table('trend_articles')->where('id', $row->id)->update($values); $id = $row->id; }
                else $id = DB::table('trend_articles')->insertGetId($values + ['created_at' => now()]);
                $version = (int) DB::table('trend_article_versions')->where('article_id', $id)->max('version') + 1;
                DB::table('trend_article_versions')->insert(['article_id' => $id, 'version' => $version, 'editor_id' => $request->user()->id, 'body_markdown' => $markdown, 'change_summary' => 'Report content saved via admin', 'created_at' => now(), 'updated_at' => now()]);
                return $id;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            if ($report !== null) throw $exception;
            throw ValidationException::withMessages(['slug' => 'This report URL already exists.']);
        }
        return to_route('admin.trend-reports.edit', ['report' => $id])->with('status', 'Trend report saved.');
    }
}
