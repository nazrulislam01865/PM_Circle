<?php

namespace Database\Seeders;

use App\Models\Comment;
use App\Models\Post;
use App\Models\PostReaction;
use App\Models\Scenario;
use App\Models\ScenarioResponse;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/** Fictional preview accounts/posts only. Idempotent, never runs in production. */
final class DemoHomePageSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing']) || ! config('pm-circle.demo_content_enabled')) {
            return;
        }

        $people = [
            'demo-sara@example.invalid' => ['Sara Ahmed', 'Project Coordinator', '/images/demo/sara.webp'],
            'demo-daniel@example.invalid' => ['Daniel Chen', 'Agile Delivery Lead', '/images/demo/daniel.webp'],
            'demo-meera@example.invalid' => ['Meera Das', 'PMO Coordinator', '/images/demo/meera.webp'],
            'demo-nadia@example.invalid' => ['Nadia Rahman', 'Project Manager', '/images/demo/nadia.webp'],
            'demo-alex@example.invalid' => ['Alex Rivera', 'Project Manager', '/images/demo/alex.webp'],
            'demo-fatima@example.invalid' => ['Fatima Khan', 'PMO Analyst', '/images/demo/fatima.webp'],
            'demo-priya@example.invalid' => ['Priya Nair', 'Senior Project Manager', '/images/demo/priya.webp'],
            'demo-marcus@example.invalid' => ['Marcus Lee', 'Agile Coach', '/images/demo/marcus.webp'],
        ];

        foreach ($people as $email => [$name, $role, $avatar]) {
            $user = User::query()->firstOrCreate(['email' => $email], [
                'name' => $name,
                'password' => Hash::make(Str::random(64)),
                'status' => 'active',
                'onboarding_step' => 3,
            ]);
            // The public member preview requires verified email addresses when
            // email verification is enabled. These are reserved fictional
            // accounts seeded only in local/testing, never real user accounts.
            if ($user->email_verified_at === null) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            $profile = $user->profile()->firstOrCreate([], ['role' => $role, 'visibility' => 'public']);
            if (! $profile->avatar_path) {
                $profile->update(['avatar_path' => $avatar]);
            }
        }

        foreach ([
            [
                'email' => 'demo-alex@example.invalid',
                'body' => 'The best status meeting I ran was about 12 minutes. Clear blockers. Clear owners. Clear next steps.',
                'topic' => 'From my project',
                'claps' => 18,
                'days' => 1,
            ],
            [
                'email' => 'demo-fatima@example.invalid',
                'body' => 'How do you get stakeholder buy-in when two teams are competing for the same resources? What helps keep trust and the work moving forward?',
                'topic' => 'Ask the community',
                'claps' => 25,
                'days' => 2,
            ],
        ] as $example) {
            $user = User::query()->where('email', $example['email'])->firstOrFail();
            Post::query()->firstOrCreate(
                ['author_id' => $user->id, 'body' => $example['body']],
                [
                    'topic' => $example['topic'],
                    'tags' => [],
                    'claps_count' => $example['claps'],
                    'visibility' => 'public',
                    'status' => 'published',
                    'published_at' => now()->subDays($example['days']),
                ],
            );
        }

        // Two database-backed previews matching the supplied homepage prototype.
        // Only fictional local/test accounts are updated; this never runs in production.
        $nadia = User::query()->where('email', 'demo-nadia@example.invalid')->firstOrFail();
        $alex = User::query()->where('email', 'demo-alex@example.invalid')->firstOrFail();
        $sara = User::query()->where('email', 'demo-sara@example.invalid')->firstOrFail();

        $nadiaPost = Post::query()->updateOrCreate(
            ['author_id' => $nadia->id, 'title' => 'The hardest part of managing scope? Saying yes too quickly.'],
            [
                'body' => 'A small client request became three extra weeks of work. We had agreed in a meeting, but never checked the impact on delivery. Now I ask one question first: what changes if we say yes? How do you handle these conversations?',
                'topic' => 'From my project', 'tags' => [], 'claps_count' => 1,
                'visibility' => 'public', 'status' => 'published', 'published_at' => '2026-10-29 10:00:00',
            ],
        );
        $alexPost = Post::query()->where('author_id', $alex->id)
            ->where('body', 'The best status meeting I ran was about 12 minutes. Clear blockers. Clear owners. Clear next steps.')
            ->firstOrFail();
        $alexPost->update(['published_at' => '2026-10-26 10:00:00']);

        foreach ([$nadiaPost, $alexPost] as $post) {
            PostReaction::query()->firstOrCreate(
                ['post_id' => $post->id, 'user_id' => $sara->id], ['type' => 'like'],
            );
        }

        // The 12 visible comments are actual records, not a hardcoded UI counter.
        $comments = [
            'We now document every proposed scope change before agreeing.',
            'The impact assessment should happen before committing.',
            'I ask for the expected business outcome first.',
            'A clear change log helped my team avoid similar issues.',
            'We use a simple decision matrix with our sponsor.',
            'That is a great question to ask at the planning meeting.',
            'I would also confirm schedule impacts with the delivery lead.',
            'Keeping the conversation transparent makes a big difference.',
            'We learned the same lesson on a recent project.',
            'I share the trade-offs before giving the client an answer.',
            'Our steering committee reviews any major changes.',
            'This is a useful reminder about scope control.',
        ];
        foreach ($comments as $comment) {
            Comment::query()->firstOrCreate(
                ['post_id' => $nadiaPost->id, 'author_id' => $sara->id, 'body' => $comment],
                ['parent_id' => null],
            );
        }

        $scenario = Scenario::query()->where('slug', 'a-late-change-a-fixed-deadline')->first();
        if ($scenario) {
            foreach ([
                [
                    'email' => 'demo-priya@example.invalid',
                    'body' => 'I would assess the impact with the team, then present options to the sponsor. This keeps the conversation solution-focused and transparent.',
                    'created_at' => now()->subDays(2),
                ],
                [
                    'email' => 'demo-marcus@example.invalid',
                    'body' => 'I would start by understanding the business reason behind the change, then reassess scope, timeline and risks with the team before advising.',
                    'created_at' => now()->subDays(2)->subMinute(),
                ],
            ] as $example) {
                $user = User::query()->where('email', $example['email'])->firstOrFail();
                $response = ScenarioResponse::query()->updateOrCreate(
                    ['scenario_id' => $scenario->id, 'user_id' => $user->id, 'parent_id' => null],
                    ['body' => $example['body']],
                );
                // created_at is intentionally guarded on the model.
                $response->forceFill(['created_at' => $example['created_at']])->saveQuietly();
            }
        }
    }
}
