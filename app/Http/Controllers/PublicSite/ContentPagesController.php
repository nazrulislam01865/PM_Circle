<?php

namespace App\Http\Controllers\PublicSite;

use App\Domain\Trends\TrendReports;
use App\Http\Controllers\Controller;
use App\Support\Admin\PublicPageContent;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class ContentPagesController extends Controller
{
    public function about(): Response
    {
        return Inertia::render('public/About', ['content' => PublicPageContent::load('about')]);
    }

    public function refundPolicy(): Response
    {
        return Inertia::render('public/PolicyNotice', ['content' => PublicPageContent::load('refund-policy')]);
    }

    public function trends(Request $request): Response
    {
        $filters = $request->validate(['search' => ['nullable', 'string', 'max:120'], 'topic' => ['nullable', 'string', 'max:80']]);
        $search = trim($filters['search'] ?? '');
        $topic = $filters['topic'] ?? 'all';
        $topics = TrendReports::listing()->distinct()->orderBy('category')->pluck('category');
        if ($topic !== 'all' && ! $topics->containsStrict($topic)) $topic = 'all';
        $query = TrendReports::listing();
        if ($topic !== 'all') $query->where('category', $topic);
        if ($search !== '') {
            // Bound query parameters; escape LIKE wildcards for literal user search.
            $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($search)).'%';
            $query->where(fn ($q) => $q->whereRaw("lower(title) LIKE ? ESCAPE '!'", [$pattern])->orWhereRaw("lower(summary) LIKE ? ESCAPE '!'", [$pattern])->orWhereRaw("lower(category) LIKE ? ESCAPE '!'", [$pattern]));
        }
        $reports = $query->orderByDesc('published_at')->orderByDesc('id')->paginate(12, TrendReports::columns())->withQueryString();
        $sources = TrendReports::sources($reports->getCollection());
        $reports->through(fn ($row) => TrendReports::serialize($row, $sources));
        $content = PublicPageContent::load('trends');
        return Inertia::render('trends/Index', ['content' => $content['banner'], 'listing' => $content['listing'], 'reports' => $reports, 'topics' => $topics, 'filters' => ['search' => $search, 'topic' => $topic]]);
    }

    public function show(string $slug): Response
    {
        $row = TrendReports::published()->where('slug', $slug)->first();
        abort_unless($row, 404);
        $content = PublicPageContent::load('trends');
        $related = $content['detail']['relatedEnabled'] ? TrendReports::listing()->where('id', '!=', $row->id)->orderByDesc('published_at')->orderByDesc('id')->limit(2)->get(['slug', 'title']) : [];
        return Inertia::render('trends/Show', ['article' => TrendReports::serialize($row, TrendReports::sources(collect([$row])), true), 'related' => $related, 'settings' => $content['detail'], 'pageTitle' => $content['banner']['title']]);
    }
}
