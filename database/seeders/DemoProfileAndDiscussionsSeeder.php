<?php

namespace Database\Seeders;

use App\Models\Comment;
use App\Models\Post;
use App\Models\PostReaction;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Example content from the PM Circle UI references. Never seed production accounts.
 * Existing profile fields are not overwritten; all demo entries are idempotent.
 */
final class DemoProfileAndDiscussionsSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing']) || ! config('pm-circle.demo_content_enabled')) {
            return;
        }

        DB::transaction(function (): void {
            $this->call([DemoCommunitySeeder::class, DemoDashboardSeeder::class]);

            // This fictional demo account is not given a known password or email verification.
            $sara = User::query()->firstOrCreate(
                ['email' => 'demo-sara@example.invalid'],
                [
                    'name' => 'Sara Ahmed',
                    'password' => Hash::make(Str::random(64)),
                    'onboarding_step' => 3,
                ],
            );

            $this->seedProfile($sara, true);

            // Opt-in: fill empty fields for a real local test login without
            // changing its identity, password, existing data or verification state.
            $targetEmail = trim((string) config('pm-circle.demo_profile_email', ''));
            if ($targetEmail !== '' && $targetEmail !== $sara->email) {
                $target = User::query()->where('email', $targetEmail)->first();
                if (! $target) {
                    throw new RuntimeException("Demo profile target account not found: {$targetEmail}");
                }

                $this->seedProfile($target, false);
            }

            $this->seedDiscussions();
        });
    }

    private function seedProfile(User $user, bool $fictionalAvatar): void
    {
        $profile = $user->profile()->firstOrCreate([]);
        $sample = [
            'role' => 'Project Manager',
            'headline' => 'Project Manager | Agile delivery',
            'industry' => 'Information technology',
            'country' => 'Bangladesh',
            'city' => 'Dhaka',
            'about' => 'Project Manager with 5+ years of experience delivering digital products and driving cross-functional collaboration. Passionate about agile delivery, stakeholder alignment and creating measurable business impact.',
            'skills' => ['Agile delivery', 'Risk management', 'Stakeholder engagement'],
            'languages' => ['English', 'Bangla'],
            'cover_photo_path' => '/images/pm-profile-city-cover.webp',
        ];

        if ($fictionalAvatar) {
            $sample['avatar_path'] = '/images/demo/sara.webp';
        }

        foreach ($sample as $field => $value) {
            $existing = $profile->getAttribute($field);
            if ($existing === null || $existing === '' || $existing === []) {
                $profile->setAttribute($field, $value);
            }
        }
        if ($profile->isDirty()) {
            $profile->save();
        }

        $user->experiences()->firstOrCreate(
            ['job_title' => 'Project Manager', 'organization' => 'Northstar Digital'],
            [
                'employment_type' => 'Full-time',
                'start_date' => 'Jan 2022',
                'is_current' => true,
                'responsibilities' => "Led a cross-functional team delivering a customer portal.\nReduced approval delays by 25% through clearer decision ownership.",
            ],
        );

        $user->profileProjects()->firstOrCreate(
            ['title' => 'Customer Portal Rollout'],
            [
                'summary' => 'Delivered a self-service customer portal to improve client engagement and reduce manual support requests.',
                'role' => 'Project Manager',
                'team_size' => 12,
                'delivery_months' => 8,
                'is_featured' => true,
                'is_anonymized' => true,
            ],
        );

        $user->educations()->firstOrCreate(
            ['degree' => 'BBA in Management', 'institution' => 'University of Dhaka'],
            ['year' => '2018'],
        );

        // Self-reported sample only, never a verified/official credential.
        $user->certifications()->firstOrCreate(
            ['name' => 'PMP (self-reported demo)'],
            ['credential_number' => null, 'verified' => false, 'valid_until' => '2028'],
        );
    }

    private function seedDiscussions(): void
    {
        $authors = User::query()->whereIn('email', [
            'demo-priya@example.invalid',
            'demo-sara@example.invalid',
            'demo-marcus@example.invalid',
            'demo-daniel@example.invalid',
            'demo-fatima@example.invalid',
        ])->get()->keyBy('email');

        $examples = [
            [
                'title' => 'How do you get stakeholder buy-in across departments?',
                'author' => 'demo-fatima@example.invalid',
                'responses' => [
                    ['demo-priya@example.invalid', 'I start by asking each department what success looks like and sharing a short decision log so dependencies are visible.'],
                    ['demo-sara@example.invalid', 'A joint prioritisation workshop helped our team agree on a common goal before discussing delivery dates.'],
                ],
            ],
            [
                'title' => 'A simple decision log saved our team hours.',
                'author' => 'demo-marcus@example.invalid',
                'responses' => [
                    ['demo-daniel@example.invalid', 'We use a similar approach. Recording the decision owner and date prevents repeated debates in weekly meetings.'],
                ],
            ],
            [
                'title' => 'How to run concise and effective status meetings',
                'author' => 'demo-priya@example.invalid',
                'responses' => [
                    ['demo-sara@example.invalid', 'We switched to blockers, decisions, owners and next steps. The shorter agenda made status reviews much more useful.'],
                    ['demo-marcus@example.invalid', 'Great example. Sharing risks ahead of the meeting lets the team spend more time on decisions.'],
                ],
            ],
            [
                'title' => 'How do you handle unrealistic deadlines from stakeholders?',
                'author' => 'demo-daniel@example.invalid',
                'responses' => [
                    ['demo-priya@example.invalid', 'Show options with trade-offs: reduce scope, add capacity if feasible, or revise the date after an impact assessment.'],
                    ['demo-fatima@example.invalid', 'Agreeing on a minimum viable delivery with stakeholders can protect quality and keep expectations realistic.'],
                ],
            ],
        ];

        foreach ($examples as $example) {
            $owner = $authors->get($example['author']);
            if (! $owner) {
                continue;
            }

            $post = Post::query()->where('author_id', $owner->id)
                ->where('title', $example['title'])->first();
            if (! $post) {
                continue;
            }

            foreach ($example['responses'] as [$email, $body]) {
                $author = $authors->get($email);
                if (! $author) {
                    continue;
                }

                Comment::query()->firstOrCreate([
                    'post_id' => $post->id,
                    'author_id' => $author->id,
                    'parent_id' => null,
                    'body' => $body,
                ]);
                PostReaction::query()->firstOrCreate(
                    ['post_id' => $post->id, 'user_id' => $author->id],
                    ['type' => 'like'],
                );
            }
        }
    }
}
