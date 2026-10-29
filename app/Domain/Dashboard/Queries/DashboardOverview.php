<?php

namespace App\Domain\Dashboard\Queries;

use App\Models\Post;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use App\Domain\Billing\Queries\CurrentMemberPlan;

/** Read-only, privacy-limited projection. Demo figures never grant entitlements. */
final class DashboardOverview
{
    public function forMember(User $user, ?string $previewPlan = null, string $feedTab = 'for-you'): array
    {
        $user->loadMissing('profile');

        $isDemo = app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled');
        $plan = app(CurrentMemberPlan::class)->dashboardCode($user);
        $preview = $isDemo && in_array($previewPlan, ['free', 'premium', 'pro'], true);
        if ($preview) {
            $plan = $previewPlan;
        }

        $profile = $user->profile;
        $filled = collect([
            filled($user->name), filled($profile?->role), filled($profile?->years_experience),
            filled($profile?->headline), filled($profile?->bio),
        ])->filter()->count();
        $completion = $isDemo ? ($plan === 'free' ? 45 : 80) : $filled * 20;

        $query = Post::query()->where('status', 'published')->where('visibility', 'public');
        // Following has no relationship table in the current project: never invent followed posts.
        if ($feedTab === 'following') {
            $query->whereRaw('1 = 0');
        }

        $posts = $query->when($isDemo && $preview && $feedTab === 'for-you', fn ($q) => $q->orderByRaw(
                'CASE WHEN posts.title = ? THEN 0 WHEN posts.title = ? THEN 1 ELSE 2 END',
                ['How to run concise and effective status meetings', 'How do you handle unrealistic deadlines from stakeholders?']
            ))->with(['author:id,name', 'author.profile' => fn ($q) => $q
                ->where('visibility', 'public')->select('id', 'user_id', 'role')])
            ->withCount(['comments', 'reactions',
                'reactions as likes_count' => fn ($q) => $q->where('type', 'like'),
                'reactions as loves_count' => fn ($q) => $q->where('type', 'love'),
            ])
            ->latest('published_at')->limit(2)->get();

        $saved = $posts->isEmpty() ? [] : DB::table('post_saves')
            ->where('user_id', $user->getKey())->whereIn('post_id', $posts->pluck('id'))
            ->pluck('post_id')->all();
        $reactions = $posts->isEmpty() ? [] : DB::table('post_reactions')
            ->where('user_id', $user->getKey())->whereIn('post_id', $posts->pluck('id'))
            ->pluck('type', 'post_id')->all();

        $scenario = Scenario::query()->where('status', 'published')
            ->latest('published_at')->first(['id', 'slug', 'title', 'summary']);

        return [
            'dashboard' => [
                'plan' => $plan,
                'isDemo' => $isDemo,
                'isPreview' => $preview,
                'member' => ['name' => $user->name, 'role' => $profile?->role, 'completion' => $completion],
                'scenario' => $scenario,
                'learning' => $isDemo ? [
                    'time' => $plan === 'free' ? '1h 20m' : '8h 0m',
                    'scenarios' => $plan === 'free' ? 3 : 24,
                    'level' => $plan === 'free' ? 1 : 4,
                    'lessonProgress' => $plan === 'free' ? '2 / 6' : '3 / 5',
                ] : ['time' => '0h 0m', 'scenarios' => 0, 'level' => 1, 'lessonProgress' => '0 / 0'],
                'posts' => $posts->map(fn (Post $post) => [
                    'id' => $post->id, 'title' => $post->title, 'body' => $post->body,
                    'topic' => $post->topic, 'author' => $post->author?->name ?? 'Member',
                    'authorRole' => $post->author?->profile?->role,
                    'publishedAt' => $post->published_at?->toIso8601String(),
                    'likes' => $post->likes_count, 'claps' => $post->loves_count,
                    'comments' => $post->comments_count, 'shares' => 0,
                    'saved' => in_array($post->id, $saved, true),
                    'reaction' => $reactions[$post->id] ?? null,
                ])->all(),
                'feedTab' => $feedTab,
            ],
        ];
    }
}
