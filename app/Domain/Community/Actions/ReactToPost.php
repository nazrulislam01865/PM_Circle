<?php

namespace App\Domain\Community\Actions;

use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReactToPost
{
    public function execute(User $user, Post $post, string $type): void
    {
        DB::table('post_reactions')->upsert([
            ['post_id' => $post->id, 'user_id' => $user->id, 'type' => $type, 'created_at' => now(), 'updated_at' => now()],
        ], ['post_id', 'user_id'], ['type', 'updated_at']);
    }
}
