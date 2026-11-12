<?php

namespace App\Http\Controllers\Scenario;

use App\Http\Controllers\Controller;
use App\Models\Scenario;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ScenarioController extends Controller
{
    /** Public, paginated scenario library. Facets are calculated in two grouped queries. */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'tab' => ['nullable', 'in:library,open,discussed,mine'],
            'search' => ['nullable', 'string', 'max:80'],
            'topic' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:all,open,closed'],
            'time' => ['nullable', 'in:all,30d,3m,year'],
            'sort' => ['nullable', 'in:latest,oldest,discussed'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $tab = $filters['tab'] ?? 'library';
        $status = $filters['status'] ?? 'all';
        $time = $filters['time'] ?? 'all';
        $sort = $filters['sort'] ?? 'latest';
        $search = trim($filters['search'] ?? '');
        $topic = $filters['topic'] ?? '';
        $viewerId = $request->user()?->id;

        $query = Scenario::query()->whereIn('status', ['published', 'closed'])
            ->whereNotNull('published_at')->where('published_at', '<=', now())
            ->select(['id', 'slug', 'title', 'summary', 'topics', 'status', 'published_at'])
            ->withCount([
                'responses as responses_count' => fn ($q) => $q->whereNull('parent_id'),
                'reactions as likes_count' => fn ($q) => $q->where('type', 'like'),
            ])
            ->when($search !== '', fn ($q) => $q->where(fn ($inner) => $inner
                ->whereRaw('LOWER(title) LIKE ?', ['%'.mb_strtolower($search).'%'])
                ->orWhereRaw('LOWER(summary) LIKE ?', ['%'.mb_strtolower($search).'%'])))
            ->when($topic !== '', fn ($q) => $q->whereJsonContains('topics', $topic))
            ->when($tab === 'open' || $status === 'open', fn ($q) => $q->where('status', 'published'))
            ->when($status === 'closed', fn ($q) => $q->where('status', 'closed'))
            ->when($tab === 'mine', function ($q) use ($viewerId) {
                $q->when($viewerId, fn ($items) => $items->whereHas('responses', fn ($responses) => $responses->where('user_id', $viewerId)),
                    fn ($items) => $items->whereRaw('1 = 0'));
            })
            ->when($time === '30d', fn ($q) => $q->where('published_at', '>=', now()->subDays(30)))
            ->when($time === '3m', fn ($q) => $q->where('published_at', '>=', now()->subMonths(3)))
            ->when($time === 'year', fn ($q) => $q->where('published_at', '>=', now()->startOfYear()));

        if ($viewerId) {
            $query->withExists([
                'reactions as viewer_liked' => fn ($q) => $q->where('user_id', $viewerId)->where('type', 'like'),
                'reactions as viewer_bookmarked' => fn ($q) => $q->where('user_id', $viewerId)->where('type', 'save'),
            ]);
        }

        $scenarios = ($tab === 'discussed' || $sort === 'discussed'
            ? $query->orderByDesc('responses_count')->orderByDesc('published_at')
            : ($sort === 'oldest' ? $query->orderBy('published_at') : $query->orderByDesc('published_at')))
            ->orderByDesc('id')->paginate(10)->withQueryString();

        // JSON arrays are expanded by the database, not loaded into PHP or queried per row.
        $topicSource = DB::getDriverName() === 'pgsql'
            ? 'LATERAL json_array_elements_text(s.topics) AS topic(value)'
            : 'json_each(s.topics) AS topic';
        $topics = DB::table('scenarios as s')->crossJoin(DB::raw($topicSource))
            ->whereIn('s.status', ['published', 'closed'])
            ->where('s.published_at', '<=', now())
            ->selectRaw('topic.value AS name, COUNT(*) AS total')
            ->groupBy('topic.value')->orderByDesc('total')->orderBy('name')->get();
        $statusCounts = Scenario::query()->whereIn('status', ['published', 'closed'])
            ->where('published_at', '<=', now())
            ->selectRaw('status, COUNT(*) AS total')->groupBy('status')->pluck('total', 'status');
        $latestSlug = Scenario::query()->where('status', 'published')
            ->where('published_at', '<=', now())->orderByDesc('published_at')->value('slug');

        return Inertia::render('scenarios/Index', [
            'scenarios' => $scenarios,
            'topics' => $topics,
            'statusCounts' => [
                'open' => (int) ($statusCounts['published'] ?? 0),
                'closed' => (int) ($statusCounts['closed'] ?? 0),
            ],
            'todaySlug' => $latestSlug,
            'filters' => [
                'tab' => $tab, 'search' => $search, 'topic' => $topic,
                'status' => $status, 'time' => $time, 'sort' => $sort,
            ],
            'canInteract' => (bool) ($request->user()?->onboarding_step >= 3
                && (!config('pm-circle.email_verification_required') || $request->user()?->hasVerifiedEmail())),
        ]);
    }

    public function show(Scenario $scenario, Request $request): Response
    {
        abort_unless(in_array($scenario->status, ['published', 'closed'], true), 404);

        $viewerId = $request->user()?->id;
        $scenario->loadCount(['reactions as reactions_count' => fn ($query) => $query
            ->whereIn('type', ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'])]);

        if ($viewerId) {
            $myActions = $scenario->reactions()->where('user_id', $viewerId)->pluck('type');
            $scenario->setAttribute('viewer_reaction', $myActions->first(fn ($type) => $type !== 'save'));
            $scenario->setAttribute('viewer_bookmarked', $myActions->contains('save'));
        } else {
            $scenario->setAttribute('viewer_reaction', null);
            $scenario->setAttribute('viewer_bookmarked', false);
        }

        $responses = $scenario->responses()
            ->whereNull('parent_id')
            ->with([
                'user:id,name',
                ...($viewerId ? ['reactions' => fn ($query) => $query->where('user_id', $viewerId)] : []),
                'user.profile' => fn ($q) => $q->where('visibility', 'public')->select('id', 'user_id', 'role'),
                'replies' => fn ($q) => $q->with([
                    'user:id,name',
                    'user.profile' => fn ($p) => $p->where('visibility', 'public')->select('id', 'user_id', 'role'),
                ])->oldest(),
            ])
            ->withCount('reactions')
            ->orderByDesc('is_community_helpful')
            ->orderByDesc('likes_count')
            ->orderByDesc('created_at')
            ->paginate(10);

        $related = Scenario::query()
            ->where('status', 'published')
            ->where('id', '!=', $scenario->id)
            ->limit(3)
            ->get(['id', 'slug', 'title', 'difficulty', 'focus']);

        return Inertia::render('scenarios/Show', [
            'scenario' => $scenario,
            'responses' => $responses,
            'related' => $related,
        ]);
    }

    public function respond(Request $request, Scenario $scenario): RedirectResponse
    {
        abort_unless($scenario->status === 'published', 404);
        $validated = $request->validate([
            'body' => ['required', 'string', 'min:30', 'max:10000'],
            'parent_id' => ['nullable', 'exists:scenario_responses,id'],
        ]);

        $isReply = !empty($validated['parent_id']);

        $aiScore = null;
        $aiFeedback = null;

        // Structured rubric simulation for non-replies
        if (!$isReply) {
            $aiScore = 8;
            $aiFeedback = [
                'strength' => 'Identifies immediate constraints and proposes a structured assessment.',
                'consider' => 'Clarify decision authority and sponsor sign-off before making trade-offs.',
                'next_step' => 'Document options with formal time and cost impacts in the change log.',
            ];
        }

        $scenario->responses()->create([
            'user_id' => $request->user()->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'body' => $validated['body'],
            'ai_score' => $aiScore,
            'ai_feedback' => $aiFeedback,
            'likes_count' => 0,
            'loves_count' => 0,
            'is_community_helpful' => false,
            'is_question' => str_ends_with(trim($validated['body']), '?'),
        ]);

        return back();
    }
}
