<?php

namespace App\Http\Controllers\Community;

use App\Http\Controllers\Controller;
use App\Domain\Community\Actions\PublishPost;
use App\Http\Requests\Community\StorePostRequest;
use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PostController extends Controller
{
    public function index(Request $request): Response
    {
        $topic = $request->query('topic', 'All');
        $search = $request->validate(['search' => ['nullable', 'string', 'max:80']])['search'] ?? null;
        $posts = Post::query()->where('status', 'published')->where('visibility', 'public')
            ->when(in_array($topic, ['I learned', 'From my project', 'Ask the community']), fn ($q) => $q->where('topic', $topic))
            ->when(filled($search), fn ($q) => $q->where(fn ($inner) => $inner
                ->whereRaw('LOWER(title) LIKE ?', ['%'.mb_strtolower($search).'%'])
                ->orWhereRaw('LOWER(body) LIKE ?', ['%'.mb_strtolower($search).'%'])))
            ->with(['author:id,name', 'author.profile' => fn ($q) => $q->where('visibility', 'public')->select('id','user_id','role')])->withCount(['comments', 'reactions'])->latest('published_at')->cursorPaginate(12)->withQueryString();

        return Inertia::render('community/Feed', ['posts' => $posts, 'activeTopic' => $topic, 'search' => $search]);
    }

    public function show(Post $post, Request $request): Response
    {
        abort_unless($post->status === 'published' && $post->visibility === 'public', 404);
        $post->load(['author:id,name', 'author.profile' => fn ($q) => $q->where('visibility', 'public')->select('id','user_id','role')])->loadCount(['comments', 'reactions',
            'reactions as likes_count' => fn ($query) => $query->where('type', 'like'),
            'reactions as loves_count' => fn ($query) => $query->where('type', 'love'),
        ]);
        $comments = $post->comments()->whereNull('parent_id')->with(['author:id,name'])
            ->withCount('likes')->with(['replies' => fn ($query) => $query->with('author:id,name')->withCount('likes')])->oldest()->paginate(12);
        return Inertia::render('community/PostShow', [
            'post' => $post, 'comments' => $comments,
            'viewerReaction' => $request->user() ? $post->reactions()->where('user_id', $request->user()->id)->value('type') : null,
            'viewerSaved' => $request->user() ? $post->saves()->where('user_id', $request->user()->id)->exists() : false,
            'viewerLikedCommentIds' => $request->user() ? \Illuminate\Support\Facades\DB::table('comment_likes')
                ->where('user_id', $request->user()->id)->whereIn('comment_id',
                    \Illuminate\Support\Facades\DB::table('comments')->where('post_id', $post->id)->select('id'))->pluck('comment_id') : [],
            'showDemoContent' => app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled'),
            'relatedPosts' => Post::query()->where('status', 'published')->where('visibility', 'public')
                ->where('id', '!=', $post->id)
                ->when(app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled'), fn ($q) => $q->whereNotNull('title'))
                ->withCount('comments')->latest('published_at')->limit(2)->get(['id', 'title', 'body']),
        ]);
    }

    public function store(StorePostRequest $request, PublishPost $action): RedirectResponse
    {
        $post = $action->execute($request->user(), $request->validated());
        return to_route('posts.show', $post);
    }
}
