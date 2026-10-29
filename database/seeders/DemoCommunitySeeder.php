<?php

namespace Database\Seeders;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Fictional prototype content. Local/testing only, never seed production.
 * Idempotent: repeated seeding updates demo posts without duplicating comments.
 */
class DemoCommunitySeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing']) || ! config('pm-circle.demo_content_enabled')) {
            return;
        }

        $people = [
            'Nadia Rahman' => ['Project Manager', 'nadia'],
            'Arif Hasan' => ['Project Manager', 'arif'],
            'Sarah Chen' => ['Project Coordinator', 'sarah-chen'],
            'Omar Farooq' => ['Scrum Master', 'omar'],
            'Alex Rivera' => ['Project Manager', 'alex'],
            'Fatima Khan' => ['PMO Analyst', 'fatima'],
            'Priya Nair' => ['Senior Project Manager', 'priya'],
            'Marcus Lee' => ['Agile Coach', 'marcus'],
            'Sara Ahmed' => ['Project Coordinator', 'sara'],
            'Daniel Chen' => ['Agile Delivery Lead', 'daniel'],
            'Meera Das' => ['PMP Candidate', 'meera'],
        ];
        $users = [];
        foreach ($people as $name => [$role, $slug]) {
            $user = User::query()->firstOrCreate(['email' => "demo-{$slug}@example.invalid"], [
                'name' => $name,
                'password' => Hash::make(Str::random(48)),
                'status' => 'active',
                'onboarding_step' => 3,
            ]);
            $user->profile()->updateOrCreate(['user_id' => $user->id], [
                'role' => $role, 'visibility' => 'public',
            ]);
            $users[$name] = $user;
        }

        $definitions = [
            ['Nadia Rahman', 'The hardest part of managing scope? Saying yes too quickly.',
                'A small client request became three extra weeks of work. We had agreed in a meeting, but never checked the impact on delivery. Now I ask one question first: what changes if we say yes? How do you handle these conversations?', 'From my project', 2],
            ['Alex Rivera', null,
                'The best status meeting I ran this week lasted 12 minutes. Clear blockers. Clear owners. Clear next steps.', 'From my project', 3],
            ['Fatima Khan', null,
                'How do you get stakeholder buy-in when there are competing priorities across departments? Would love to hear what has worked for you.', 'Ask the community', 4],
            ['Priya Nair', 'How do you set boundaries with scope changes?',
                'I start by documenting the impact, confirming who can approve the change, and sharing the options before making a new commitment.', 'I learned', 5],
            ['Marcus Lee', 'What’s your go-to method for managing stakeholder expectations?',
                'A clear decision log and frequent updates have helped our delivery teams manage surprises.', 'Ask the community', 6],
        ];
        $posts = [];
        foreach ($definitions as [$name, $title, $body, $topic, $hours]) {
            $posts[$name] = Post::query()->updateOrCreate(
                ['author_id' => $users[$name]->id, 'body' => $body],
                ['title' => $title, 'topic' => $topic, 'visibility' => 'public',
                    'status' => 'published', 'published_at' => $hours === 2 ? now()->subHours($hours) : now()->subDays($hours)]
            );
        }

        $thread = $posts['Nadia Rahman'];
        $comments = [
            ['Arif Hasan', 'We now document the impact before agreeing. Even a small change needs an owner and a clear decision.', null],
            ['Sarah Chen', 'I give the sponsor three options: adjust scope, move the date, or add capacity. It makes the trade-off easier to discuss.', null],
            ['Omar Farooq', 'How do you handle it when the sponsor says the date and budget cannot change?', null],
        ];
        $roots = [];
        foreach ($comments as [$name, $body]) {
            $roots[$name] = Comment::query()->firstOrCreate([
                'post_id' => $thread->id, 'author_id' => $users[$name]->id,
                'parent_id' => null, 'body' => $body,
            ]);
        }
        $replies = [
            ['Arif Hasan', 'Nadia Rahman', 'Exactly. A written decision would have saved us a difficult conversation later.'],
            ['Arif Hasan', 'Marcus Lee', 'The important part is bringing options instead of just saying no.'],
            ['Sarah Chen', 'Priya Nair', 'Communicating those options early helps a lot.'],
            ['Sarah Chen', 'Alex Rivera', 'We also record the expected trade-off and decision owner.'],
            ['Sarah Chen', 'Nadia Rahman', 'A clear change log keeps everyone aligned.'],
            ['Omar Farooq', 'Arif Hasan', 'Escalate the constraint and record the risk openly.'],
            ['Omar Farooq', 'Fatima Khan', 'It helps to frame the impact in business terms.'],
            ['Omar Farooq', 'Marcus Lee', 'I would ask for a sponsor decision on the delivery trade-off.'],
            ['Omar Farooq', 'Priya Nair', 'Agree on what can move, even when the date cannot.'],
        ];
        foreach ($replies as [$parentName, $author, $body]) {
            Comment::query()->firstOrCreate([
                'post_id' => $thread->id, 'author_id' => $users[$author]->id,
                'parent_id' => $roots[$parentName]->id, 'body' => $body,
            ]);
        }

        $scenario = \App\Models\Scenario::query()->where('slug', 'a-late-change-a-fixed-deadline')->first();
        if ($scenario) {
            foreach ([
                ['Priya Nair', 'I would assess the impact with the team, then present options to the sponsor. This keeps the conversation solution-focused and transparent.'],
                ['Marcus Lee', 'I would start by understanding the business reason behind the change, then reassess scope, timeline and risks with the team before advising.'],
            ] as [$author, $body]) {
                $scenario->responses()->firstOrCreate(['user_id' => $users[$author]->id, 'body' => $body]);
            }
        }
    }
}
