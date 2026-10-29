<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;

/** Dashboard reference content is fictional and strictly local/testing only. */
final class DemoDashboardSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing']) || ! config('pm-circle.demo_content_enabled')) {
            return;
        }

        foreach ([
            [
                'demo-priya@example.invalid',
                'How to run concise and effective status meetings',
                'A concise status meeting keeps the team aligned, surfaces blockers early, and maintains momentum. In this lesson, I share a simple structure, a sample agenda, and practical tips you can use right away.',
                'I learned', 2,
            ],
            [
                'demo-daniel@example.invalid',
                'How do you handle unrealistic deadlines from stakeholders?',
                "I'm working on a project where the stakeholder wants delivery in 2 weeks, but the scope is quite large. How do you approach this conversation and what techniques have worked for you?",
                'Ask the community', 1,
            ],
        ] as [$email, $title, $body, $topic, $days]) {
            $author = User::query()->where('email', $email)->first();
            if (! $author) {
                continue;
            }

            Post::query()->updateOrCreate(
                ['author_id' => $author->id, 'title' => $title],
                ['body' => $body, 'topic' => $topic, 'status' => 'published',
                    'visibility' => 'public', 'published_at' => now()->subDays($days + 10)]
            );
        }
    }
}
