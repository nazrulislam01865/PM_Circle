<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class SavedPostsController extends Controller
{
    public function __invoke(Request $request): Response
    {
        return Inertia::render('community/SavedPosts', [
            'posts' => Post::query()->where('status', 'published')->where('visibility', 'public')
                ->whereHas('saves', fn ($query) => $query->where('user_id', $request->user()->id))
                ->with(['author:id,name', 'author.profile' => fn ($query) => $query->where('visibility', 'public')->select('id', 'user_id', 'role')])
                ->withCount(['comments', 'reactions'])->latest('published_at')->paginate(12),
        ]);
    }
}
