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

class DemoCommunitySeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing']) || ! config('pm-circle.demo_content_enabled')) {
            return;
        }

        $people = [
            'Fatima Khan' => ['PMO Analyst', 'fatima'],
            'Marcus Lee' => ['Agile Coach', 'marcus'],
            'Daniel Chen' => ['Delivery Lead', 'daniel'],
            'Priya Nair' => ['Senior Project Manager', 'priya'],
            'Sara Ahmed' => ['Project Coordinator', 'sara'],
            'Nadia Rahman' => ['Project Manager', 'nadia'],
            'Arif Hasan' => ['Project Manager', 'arif'],
        ];

        $users = [];
        foreach ($people as $name => [$role, $slug]) {
            $user = User::query()->firstOrCreate(
                ['email' => "demo-{$slug}@example.invalid"],
                [
                    'name' => $name,
                    'password' => Hash::make(Str::random(48)),
                    'status' => 'active',
                    'onboarding_step' => 3,
                ]
            );
            $user->profile()->updateOrCreate(
                ['user_id' => $user->id],
                ['role' => $role, 'visibility' => 'public']
            );
            $users[$name] = $user;
        }

        // Exact posts matching pm1.png
        $postsData = [
            [
                'author' => 'Fatima Khan',
                'title' => 'How do you get stakeholder buy-in across departments?',
                'body' => 'Competing priorities are slowing down decisions on our project. What has helped you align teams and move forward?',
                'topic' => 'Questions',
                'tags' => ['Stakeholders', 'Communication'],
                'claps' => 14,
                'published_at' => '2026-10-25 14:00:00',
            ],
            [
                'author' => 'Marcus Lee',
                'title' => 'A simple decision log saved our team hours.',
                'body' => 'We started a lightweight decision log and it gave everyone clarity, reduced back-and-forth, and helped us keep momentum.',
                'topic' => 'I learned',
                'tags' => ['Team alignment', 'Delivery'],
                'claps' => 22,
                'published_at' => '2026-10-23 11:30:00',
            ],
            [
                'author' => 'Daniel Chen',
                'title' => 'What do you do when the deadline and scope do not match?',
                'body' => "I'm working on a project where the stakeholder wants delivery in 2 weeks, but the scope is quite large. How do you approach this conversation and what techniques have worked for you?",
                'topic' => 'From my project',
                'tags' => ['Scope', 'Planning'],
                'claps' => 19,
                'published_at' => '2026-10-18 10:15:00',
            ],
        ];

        foreach ($postsData as $p) {
            $post = Post::query()->updateOrCreate(
                ['author_id' => $users[$p['author']]->id, 'title' => $p['title']],
                [
                    'body' => $p['body'],
                    'topic' => $p['topic'],
                    'tags' => $p['tags'],
                    'claps_count' => $p['claps'],
                    'visibility' => 'public',
                    'status' => 'published',
                    'published_at' => $p['published_at'],
                ]
            );

            // Add reaction counts
            PostReaction::firstOrCreate(['user_id' => $users['Priya Nair']->id, 'post_id' => $post->id], ['type' => 'like']);
            PostReaction::firstOrCreate(['user_id' => $users['Sara Ahmed']->id, 'post_id' => $post->id], ['type' => 'love']);
        }

        // Scenario responses matching pm2.png
        $scenario = Scenario::query()->where('slug', 'a-late-change-a-fixed-deadline')->first();
        if ($scenario) {
            $priyaResponse = ScenarioResponse::updateOrCreate(
                ['scenario_id' => $scenario->id, 'user_id' => $users['Priya Nair']->id, 'parent_id' => null],
                [
                    'body' => "I would first review the request with the technical lead and assess the impact on scope, time, cost and risk. Then I'd give the sponsor and client clear options: defer the feature, reduce other scope, or approve a revised delivery plan.",
                    'is_community_helpful' => true,
                    'is_question' => false,
                    'ai_score' => 8,
                    'ai_feedback' => [
                        'strength' => 'Assesses impact before making a commitment.',
                        'consider' => 'Confirm who has authority to approve the change.',
                        'next_step' => 'Record the decision through change control.',
                    ],
                    'likes_count' => 18,
                    'loves_count' => 7,
                    'created_at' => now()->subHours(2),
                ]
            );

            $marcusResponse = ScenarioResponse::updateOrCreate(
                ['scenario_id' => $scenario->id, 'user_id' => $users['Marcus Lee']->id, 'parent_id' => null],
                [
                    'body' => "I'd clarify the business need behind the report. A smaller first version may meet the client's immediate need, but I would still assess its impact with the team before making a promise.",
                    'is_community_helpful' => false,
                    'is_question' => false,
                    'ai_score' => 8,
                    'ai_feedback' => [
                        'strength' => 'Explores minimum viable reporting scope to satisfy business need.',
                        'consider' => 'Ensure technical dependencies are evaluated early.',
                        'next_step' => 'Agree on acceptance criteria for phase 1 delivery.',
                    ],
                    'likes_count' => 12,
                    'loves_count' => 4,
                    'created_at' => now()->subHours(3),
                ]
            );

            $saraResponse = ScenarioResponse::updateOrCreate(
                ['scenario_id' => $scenario->id, 'user_id' => $users['Sara Ahmed']->id, 'parent_id' => null],
                [
                    'body' => "Would you speak to the sponsor first, or bring the sponsor and technical lead into the same conversation?",
                    'is_community_helpful' => false,
                    'is_question' => true,
                    'ai_score' => null,
                    'ai_feedback' => null,
                    'likes_count' => 6,
                    'loves_count' => 0,
                    'created_at' => now()->subHours(4),
                ]
            );

            // Priya Nair reply to Sara Ahmed
            ScenarioResponse::updateOrCreate(
                ['scenario_id' => $scenario->id, 'user_id' => $users['Priya Nair']->id, 'parent_id' => $saraResponse->id],
                [
                    'body' => "I'd clarify the facts with the team first, then discuss options together.",
                    'is_community_helpful' => false,
                    'is_question' => false,
                    'ai_score' => null,
                    'ai_feedback' => null,
                    'likes_count' => 4,
                    'loves_count' => 0,
                    'created_at' => now()->subHours(4),
                ]
            );
        }
    }
}
