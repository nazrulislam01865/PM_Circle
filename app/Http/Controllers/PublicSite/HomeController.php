<?php

namespace App\Http\Controllers\PublicSite;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Onboarding\OnboardingController;
use App\Models\HomePageContent;
use App\Support\Home\HomeAiFeaturesContent;
use App\Domain\Community\Services\EngagementStats;
use App\Domain\Identity\Services\ProfileFieldPrivacy;
use App\Domain\Identity\Services\MemberProfileAccess;
use App\Domain\Community\Queries\PostReactionSummary;
use App\Models\LearningCourse;
use App\Models\Post;
use App\Models\Scenario;
use App\Support\Community\ReactionIconCatalog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        // The public homepage is for guests. Members should return to their
        // authenticated home even when an older link still points to "/".
        // Keep administrator access to the public site preview unchanged.
        $user = $request->user();
        if ($user && ! $user->is_admin && $user->status === 'active') {
            return to_route('dashboard');
        }

        $content = HomePageContent::query()->where('key', 'home')->first()?->content ?? [];
        $content['ai_features'] = HomeAiFeaturesContent::withDefaults($content['ai_features'] ?? []);
        $demo = app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled');
        $visible = fn (string $section): bool => data_get($content, 'sections.'.$section, true) !== false;
        $scenarioId = data_get($content, 'scenario.featured_id');
        $dailySettings = DB::table('daily_challenge_settings')->where('id', 1)->first();
        $dailyToday = $dailySettings?->enabled && $dailySettings?->auto_publish
            ? Scenario::query()->where('status', 'published')->where('ai_generated', true)
                ->where('daily_slot', now('Asia/Dhaka')->toDateString())
                ->where('published_at', '<=', now())
                ->where('expires_at', '>', now())->value('id') : null;
        $scenarioId = $dailyToday ?: $scenarioId;
        $featuredMembers = array_slice((array) data_get($content, 'members.featured_ids', []), 0, 3);
        $viewerId = auth()->user()?->is_admin === true ? null : auth()->id();

        $scenario = $visible('scenario') ? Scenario::query()->where('status', 'published')
            ->when($scenarioId, fn ($query) => $query->whereKey($scenarioId))
            ->where('published_at', '<=', now())
            ->select(['id', 'slug', 'title', 'summary', 'topics'])
            ->withCount(['reactions as reactions_count' => fn ($query) => $query
                ->whereIn('type', ReactionIconCatalog::allTypes())])
            ->when($viewerId, fn ($query) => $query->addSelect([
                'viewer_reaction' => DB::table('scenario_reactions')->select('type')
                    ->whereColumn('scenario_id', 'scenarios.id')
                    ->where('user_id', $viewerId)
                    ->whereIn('type', ReactionIconCatalog::allTypes())
                    ->limit(1),
            ]))->latest('published_at')->first() : null;

        // The reference homepage shows the scenario summary; response previews are no longer queried here.
        $posts = $visible('community') ? Post::query()->where('status', 'published')->where('visibility', 'public')
            ->when($viewerId, fn ($query) => $query->whereNotExists(fn ($hidden) => $hidden->selectRaw('1')
                ->from('post_hides')->whereColumn('post_hides.post_id', 'posts.id')
                ->where('post_hides.user_id', $viewerId)))
            ->select(['posts.id', 'posts.author_id', 'posts.title', 'posts.body', 'posts.image_path', 'posts.is_anonymous', 'posts.topic', 'posts.ai_generated', 'posts.published_at'])
            ->with([
                'author:id,name,status,is_admin,email_verified_at',
                'author.profile:id,user_id,role,avatar_path,visibility,field_visibility',
            ])
            ->when(EngagementStats::readsEnabled(), fn ($query) => PostReactionSummary::selectStats($query
                ->leftJoin('post_engagement_stats as home_stats', 'home_stats.post_id', '=', 'posts.id')
                ->selectRaw('COALESCE(home_stats.comments_count, 0) AS comments_count')
                ->selectRaw('COALESCE(home_stats.like_count, 0) AS likes_count')
                ->selectRaw('COALESCE(home_stats.reactions_count, 0) AS reactions_count'), 'home_stats'))
            ->when(! EngagementStats::readsEnabled(), fn ($query) => $query->withCount([
                'comments',
                'reactions as likes_count' => fn ($query) => $query->where('type', 'like'),
                'reactions as reactions_count',
            ]))
            ->when($viewerId, fn ($query) => $query->addSelect([
                'viewer_reaction' => DB::table('post_reactions')->select('type')
                    ->whereColumn('post_id', 'posts.id')->where('user_id', $viewerId)->limit(1),
            ]))
            ->latest('posts.published_at')->limit(2)->get() : collect();
        PostReactionSummary::attach($posts);
        $posts->each(function (Post $post) use ($viewerId): void {
            $post->setAttribute('viewer_is_author', $viewerId !== null && $post->author_id === $viewerId);
            MemberProfileAccess::decorateAuthor($post->author, request()->user());
            $post->anonymizeForPublic();
        });

        $members = $visible('members') ? User::query()
            ->where('is_admin', false)
            ->where('status', 'active')
            ->when(config('pm-circle.email_verification_required'), fn ($query) => $query->whereNotNull('email_verified_at'))
            ->whereHas('profile', fn ($query) => $query->where('visibility', 'public'))
            ->when($featuredMembers !== [], fn ($query) => $query->whereIn('id', $featuredMembers))
            ->with(['profile' => fn ($query) => $query->where('visibility', 'public')->select('id', 'user_id', 'role', 'avatar_path', 'visibility', 'field_visibility')])
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

        // The prototype uses a resume panel rather than a jobs list. Avoid an unused jobs query.
        // Published catalog previews only; one bounded query and no restricted lesson data.
        $courses = $visible('pathway') ? LearningCourse::query()->where('is_published', true)
            ->orderBy('sort_order')->orderBy('id')->limit(8)
            ->get(['slug', 'title', 'summary', 'category', 'level', 'minutes', 'thumbnail', 'cover_path', 'access_tier'])
            ->map(fn (LearningCourse $course) => $course->catalogData())->values() : collect();

        return Inertia::render('public/Home', [
            'courses' => $courses,
            'content' => $content,
            'isDemo' => $demo,
            'scenario' => $scenario,
            'posts' => $posts,
            'members' => $members->map(fn (User $member) => [
                'id' => $member->id,
                'name' => $member->profile && ProfileFieldPrivacy::visible($member->profile, 'full_name', request()->user(), $member->id)
                    ? $member->name : 'PM Circle member',
                'profile' => [
                    'role' => $member->profile && ProfileFieldPrivacy::visible($member->profile, 'current_job_title', request()->user(), $member->id)
                        ? $member->profile->role : null,
                    'avatar_path' => $member->profile && ProfileFieldPrivacy::visible($member->profile, 'profile_photo_url', request()->user(), $member->id)
                        ? $member->profile->avatar_path : null,
                ],
            ]),
        ]);
    }

    public function pricing(OnboardingController $onboarding): Response
    {
        return Inertia::render('public/Pricing', ['plans' => $onboarding->catalog()]);
    }
}
