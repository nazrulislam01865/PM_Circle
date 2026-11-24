<?php

namespace App\Http\Controllers\Account;

use App\Domain\Identity\Services\MemberProfileAccess;
use App\Http\Controllers\Controller;
use App\Domain\Community\Services\EngagementStats;
use App\Domain\Community\Queries\PostReactionSummary;
use App\Models\Post;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class SavedPostsController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $posts = Post::query()->where('status', 'published')->where('visibility', 'public')
                ->whereHas('saves', fn ($query) => $query->where('user_id', $request->user()->id))
                ->whereNotExists(fn ($hidden) => $hidden->selectRaw('1')->from('post_hides')
                    ->whereColumn('post_hides.post_id', 'posts.id')->where('post_hides.user_id', $request->user()->id))
                ->with(['author:id,name,status,is_admin,email_verified_at', 'author.profile:id,user_id,role,avatar_path,visibility,field_visibility'])
                ->when(EngagementStats::readsEnabled(), fn ($query) => PostReactionSummary::selectStats($query
                    ->leftJoin('post_engagement_stats as saved_stats', 'saved_stats.post_id', '=', 'posts.id')
                    ->select('posts.*')
                    ->selectRaw('COALESCE(saved_stats.comments_count, 0) AS comments_count')
                    ->selectRaw('COALESCE(saved_stats.reactions_count, 0) AS reactions_count'), 'saved_stats'))
                ->when(! EngagementStats::readsEnabled(), fn ($query) => $query->withCount(['comments' => fn ($query) => $query->visible(), 'reactions']))
                ->latest('posts.published_at')->paginate(12);
        PostReactionSummary::attach($posts->getCollection());
        $posts->getCollection()->each(function (Post $post) use ($request): void {
            $post->setAttribute('viewer_is_author', $post->author_id === $request->user()->id);
            MemberProfileAccess::decorateAuthor($post->author, $request->user());
            $post->anonymizeForPublic();
        });

        return Inertia::render('community/SavedPosts', ['posts' => $posts]);
    }
}
