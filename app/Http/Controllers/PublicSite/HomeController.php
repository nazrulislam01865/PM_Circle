<?php

namespace App\Http\Controllers\PublicSite;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Onboarding\OnboardingController;
use App\Models\HomePageContent;
use App\Models\CareerJob;
use App\Models\Post;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(): Response
    {
        $content = HomePageContent::query()->where('key', 'home')->first()?->content ?? [];
        $demo = app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled');
        $visible = fn (string $section): bool => data_get($content, 'sections.'.$section, true) !== false;
        $scenarioId = data_get($content, 'scenario.featured_id');
        $featuredMembers = array_slice((array) data_get($content, 'members.featured_ids', []), 0, 3);
        $viewerId = auth()->user()?->is_admin === true ? null : auth()->id();

        $scenario = $visible('scenario') ? Scenario::query()->where('status', 'published')
            ->when($scenarioId, fn ($query) => $query->whereKey($scenarioId))
            ->select(['id', 'slug', 'title', 'summary', 'topics'])
            ->withCount(['reactions as reactions_count' => fn ($query) => $query
                ->whereIn('type', ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'])])
            ->when($viewerId, fn ($query) => $query->addSelect([
                'viewer_reaction' => DB::table('scenario_reactions')->select('type')
                    ->whereColumn('scenario_id', 'scenarios.id')
                    ->where('user_id', $viewerId)
                    ->whereIn('type', ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'])
                    ->limit(1),
            ]))->latest('published_at')->first() : null;

        // Bounded homepage previews: each relationship is eager-loaded once,
        // with no queries executed by the React cards or response loop.
        $responses = $scenario ? $scenario->responses()
            ->whereNull('parent_id')
            ->when($demo, fn ($query) => $query->whereHas('user', fn ($users) => $users
                ->whereIn('email', data_get($content, 'scenario.demo_response_emails', []))))
            ->with([
                'user:id,name',
                'user.profile' => fn ($query) => $query->where('visibility', 'public')
                    ->select('id', 'user_id', 'role', 'avatar_path'),
            ])
            ->select(['id', 'scenario_id', 'user_id', 'body', 'created_at'])
            ->withCount('reactions')
            ->when($viewerId, fn ($query) => $query->addSelect([
                'viewer_reaction' => DB::table('scenario_response_reactions')->select('type')
                    ->whereColumn('scenario_response_id', 'scenario_responses.id')
                    ->where('user_id', $viewerId)->limit(1),
            ]))
            ->latest('created_at')->limit(2)->get() : collect();

        $posts = $visible('community') ? Post::query()->where('status', 'published')->where('visibility', 'public')
            ->when($viewerId, fn ($query) => $query->whereNotExists(fn ($hidden) => $hidden->selectRaw('1')
                ->from('post_hides')->whereColumn('post_hides.post_id', 'posts.id')
                ->where('post_hides.user_id', $viewerId)))
            ->select(['id', 'author_id', 'title', 'body', 'image_path', 'is_anonymous', 'topic', 'ai_generated', 'published_at'])
            ->with([
                'author:id,name',
                'author.profile' => fn ($query) => $query->where('visibility', 'public')
                    ->select('id', 'user_id', 'role', 'avatar_path'),
            ])
            ->withCount([
                'comments',
                'reactions as likes_count' => fn ($query) => $query->where('type', 'like'),
                'reactions as reactions_count',
            ])
            ->when($viewerId, fn ($query) => $query->addSelect([
                'viewer_reaction' => DB::table('post_reactions')->select('type')
                    ->whereColumn('post_id', 'posts.id')->where('user_id', $viewerId)->limit(1),
            ]))
            ->latest('published_at')->limit(2)->get() : collect();
        $posts->each(fn (Post $post) => $post->anonymizeForPublic());

        $members = $visible('members') ? User::query()
            ->where('is_admin', false)
            ->where('status', 'active')
            ->when(config('pm-circle.email_verification_required'), fn ($query) => $query->whereNotNull('email_verified_at'))
            ->whereHas('profile', fn ($query) => $query->where('visibility', 'public'))
            ->when($featuredMembers !== [], fn ($query) => $query->whereIn('id', $featuredMembers))
            ->with(['profile' => fn ($query) => $query->where('visibility', 'public')->select('id', 'user_id', 'role', 'avatar_path')])
            ->when($demo && $featuredMembers === [], fn ($query) => $query->whereIn('email', data_get($content, 'members.demo_emails', [])))
            ->latest('id')->limit(3)->get(['id', 'name', 'email']) : collect();
        if ($featuredMembers !== []) {
            $memberOrder = array_flip($featuredMembers);
            $members = $members->sortBy(fn (User $member) => $memberOrder[$member->id] ?? PHP_INT_MAX)->values();
        }

        // Honor the screenshot's explicit demo member order, without embedding identities in React.
        if ($demo && $featuredMembers === []) {
            $order = array_flip(data_get($content, 'members.demo_emails', []));
            $members = $members->sortBy(fn (User $member) => $order[$member->email] ?? PHP_INT_MAX)->values();
        }

        // Same freshness and ordering as the Careers listing, limited to the homepage's three cards.
        $jobs = $visible('careers') ? CareerJob::query()->current()
            ->orderByDesc('posted_at')->orderByDesc('id')
            ->limit(3)->get(['slug', 'title', 'company', 'location', 'job_type'])
            ->map(fn (CareerJob $job) => [
                'slug' => $job->slug, 'title' => $job->title, 'company' => $job->company,
                'location' => $job->location ?: 'Not specified',
                'type' => $job->job_type ?: 'Not specified',
            ])->values() : collect();

        return Inertia::render('public/Home', [
            'content' => $content,
            'jobs' => $jobs,
            'isDemo' => $demo,
            'scenario' => $scenario,
            'scenarioResponses' => $responses,
            'posts' => $posts,
            'members' => $members->map(fn (User $member) => [
                'id' => $member->id,
                'name' => $member->name,
                'profile' => $member->profile,
            ]),
        ]);
    }

    public function pricing(OnboardingController $onboarding): Response
    {
        return Inertia::render('public/Pricing', ['plans' => $onboarding->catalog()]);
    }
}
