<?php

namespace App\Domain\Community\Actions;

use App\Models\Post;
use App\Models\User;

class PublishPost
{
    /** @param array<string,string> $data */
    public function execute(User $user, array $data): Post
    {
        return $user->posts()->create([
            'body' => $data['body'], 'topic' => $data['topic'],
            'visibility' => 'public', 'status' => 'published',
            'published_at' => now(), 'ai_generated' => false,
        ]);
    }
}
