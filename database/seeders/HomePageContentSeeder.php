<?php

namespace Database\Seeders;

use App\Models\HomePageContent;
use Illuminate\Database\Seeder;

/**
 * Seed public homepage copy without overwriting content already edited in the database.
 * New design sections are merged into records created by earlier versions of this seeder.
 */
final class HomePageContentSeeder extends Seeder
{
    public function run(): void
    {
        $page = HomePageContent::query()->firstOrCreate(['key' => 'home'], ['content' => [
            'hero' => [
                'eyebrow' => 'The 360° community for project managers',
                'title' => 'Your next chapter in project management starts here.',
                'description' => 'Learn by doing. Share what works. Meet your people. Build your career.',
                'primary_label' => 'Join the community — free',
                'secondary_label' => "Explore today's discussion",
                'primary_url' => '/register', 'secondary_url' => '/community',
                'caption_learn' => "Learn\n& practise", 'caption_discuss' => "Discuss\n& share", 'caption_career' => "Grow\nyour career",
                'people' => [
                    ['name' => 'Community Hero', 'avatar_path' => '/images/demo/community-hero.webp'],
                    ['name' => 'Community Top', 'avatar_path' => '/images/demo/community-top.webp'],
                    ['name' => 'Community Right', 'avatar_path' => '/images/demo/community-right.webp'],
                    ['name' => 'Community Bottom', 'avatar_path' => '/images/demo/community-bottom.webp'],
                    ['name' => 'Community Lower Right', 'avatar_path' => '/images/demo/community-lower-right.webp'],
                ],
            ],
            'pathway' => self::pathwayDefaults(),
            'scenario' => [
                'heading' => "Today's scenario", 'status_label' => 'Open for discussion',
                'button_label' => 'Read scenario & join discussion', 'view_all_label' => 'View all', 'read_button_label' => 'Read scenario',
                'discussion_button_label' => 'Join discussion', 'responses_heading' => 'Community responses',
                'empty_message' => 'Practical scenarios are being prepared for the community.',
                'empty_responses_message' => 'Be the first to share your approach.',
                'score_label' => 'Sample AI reasoning score', 'hint' => 'Read freely. Sign in to respond.',
                'demo_response_emails' => ['demo-priya@example.invalid', 'demo-marcus@example.invalid'],
            ],
            'members' => ['heading' => 'New to the circle', 'hint' => 'Join to view full profiles and connect.', 'button_label' => 'Meet the members', 'empty_message' => 'Be among the first members to join the community.', 'demo_emails' => ['demo-sara@example.invalid', 'demo-daniel@example.invalid', 'demo-meera@example.invalid']],
            'skills' => [
                'heading' => 'Build your next skill',
                'items' => [
                    ['title' => 'PMP practice', 'description' => 'Sample questions and explanations', 'icon' => 'practice', 'url' => '/learning'],
                    ['title' => 'Scrum / CSM practice', 'description' => 'Realistic questions and scenarios', 'icon' => 'scrum', 'url' => '/learning'],
                    ['title' => 'Project simulations', 'description' => 'Hands-on scenario-based learning', 'icon' => 'simulation', 'url' => '/learning'],
                ],
            ],
            'community' => [
                'heading' => 'From the community', 'view_all_label' => 'View all posts',
                'empty_message' => 'The discussion is just getting started. Share your first lesson or question to help others grow.',
                'topics' => ['All', 'I learned', 'From my project', 'Ask the community'],
                'demo_post_emails' => ['demo-nadia@example.invalid', 'demo-alex@example.invalid'],
                'prompt_title' => 'Have a lesson worth sharing?',
                'prompt_description' => 'Share your experience, ask a question or get feedback from the community.',
                'button_label' => 'Join to share',
            ],
            'careers' => [
                'heading' => 'Everything your PM career needs, in one circle.',
                'features' => [
                    ['title' => 'Learn & practise', 'description' => 'Daily scenarios, PMP and Scrum practice', 'url' => '/learning', 'icon' => 'learn'],
                    ['title' => 'Share & discuss', 'description' => 'Practical lessons from real projects', 'url' => '/community', 'icon' => 'discuss'],
                    ['title' => 'Find your next role', 'description' => 'Relevant jobs for project professionals', 'url' => '/careers', 'icon' => 'jobs'],
                    ['title' => 'Tell your story better', 'description' => 'AI resume support for your project experience', 'url' => '/careers', 'icon' => 'resume'],
                ],
                'opportunities_heading' => 'Latest opportunities',
                'jobs_view_all_label' => 'View all jobs', 'show_sample_opportunities' => false,
                'empty_message' => 'Verified job opportunities will appear here when the careers module is launched.',
                'opportunities' => [
                    ['role' => 'IT Project Manager', 'company' => 'Technology company', 'location' => 'Remote', 'type' => 'Full time', 'icon' => 'manager'],
                    ['role' => 'PMO Analyst', 'company' => 'Consulting firm', 'location' => 'Hybrid', 'type' => 'Full time', 'icon' => 'analyst'],
                    ['role' => 'Scrum Master', 'company' => 'Product team', 'location' => 'Remote', 'type' => 'Full time', 'icon' => 'scrum'],
                ],
                'resume' => [
                    'title' => 'Your experience deserves a clearer resume.',
                    'description' => 'Turn projects, responsibilities and outcomes into a focused PM resume.',
                    'button_label' => 'Explore AI resume assistant',
                ],
                'join' => [
                    'heading' => "Don't just manage projects. Grow with people who do.",
                    'description' => 'Start with one discussion, one lesson, one connection.',
                    'button_label' => 'Become a member — free',
                    'hint' => 'For aspiring PMs, experienced practitioners, trainers and leaders.',
                ],
            ],
            'sections' => ['hero' => true, 'pathway' => true, 'scenario' => true, 'community' => true, 'members' => true, 'skills' => true, 'career_features' => true, 'careers' => true],
            'demo_scenario_engagement' => ['likes' => 42, 'responses' => 128],
        ]]);
        $content = $page->content;

        $updated = false;
        if (!array_key_exists('pathway', $content)) {
            $content['pathway'] = self::pathwayDefaults();
            $updated = true;
        }

        // Merge only newly introduced homepage labels. Never reset admin edits.
        $additions = [
            'hero' => ['primary_url' => '/register', 'secondary_url' => '/community', 'caption_learn' => "Learn\n& practise", 'caption_discuss' => "Discuss\n& share", 'caption_career' => "Grow\nyour career"],
            'scenario' => [
                'view_all_label' => 'View all',
                'empty_message' => 'Practical scenarios are being prepared for the community.',
                'empty_responses_message' => 'Be the first to share your approach.',
                'read_button_label' => 'Read scenario',
                'discussion_button_label' => 'Join discussion',
                'responses_heading' => 'Community responses',
                'demo_response_emails' => ['demo-priya@example.invalid', 'demo-marcus@example.invalid'],
            ],
            'careers' => ['jobs_view_all_label' => 'View all jobs', 'show_sample_opportunities' => false, 'empty_message' => 'Verified job opportunities will appear here when the careers module is launched.'],
            'members' => ['empty_message' => 'Be among the first members to join the community.'],
            'sections' => ['hero' => true, 'pathway' => true, 'scenario' => true, 'community' => true, 'members' => true, 'skills' => true, 'career_features' => ($content['sections']['careers'] ?? true), 'careers' => true],
            'community' => [
                'empty_message' => 'The discussion is just getting started. Share your first lesson or question to help others grow.',
                'topics' => ['All', 'I learned', 'From my project', 'Ask the community'],
                'demo_post_emails' => ['demo-nadia@example.invalid', 'demo-alex@example.invalid'],
            ],
        ];
        foreach ($additions as $section => $defaults) {
            foreach ($defaults as $name => $value) {
                if (!array_key_exists($name, $content[$section] ?? [])) {
                    $content[$section][$name] = $value;
                    $updated = true;
                }
            }
        }
        if ($updated) {
            $page->update(['content' => $content]);
        }
    }

    private static function pathwayDefaults(): array
    {
        return [
            'steps' => [
                'heading' => 'One circle. Every step of your career.',
                'items' => [
                    ['title' => 'Find your direction', 'description' => 'Career guidance for your starting point', 'icon' => 'direction'],
                    ['title' => 'Learn at your level', 'description' => 'A personal path from beginner to leader', 'icon' => 'learn'],
                    ['title' => 'Prepare for exams', 'description' => 'PMP and CSM exam practice', 'icon' => 'exams'],
                    ['title' => 'Build professional skills', 'description' => 'Communication, resumes and interviews', 'icon' => 'skills'],
                    ['title' => 'Connect and grow', 'description' => 'Discussions, shared experience and jobs', 'icon' => 'community'],
                ],
            ],
            'exams' => [
                'heading' => 'Practise today. Prepare for your next certification.',
                'description' => 'Explore exam simulators for your next professional milestone.',
                'compare_label' => 'Compare plans',
                'more_label' => 'Explore more exam simulators',
                'items' => [
                    [
                        'title' => 'PMP Exam Simulator',
                        'description' => 'Practise project management decisions under exam-style conditions.',
                        'icon' => 'pmp',
                        'features' => ['Timed mock exams', 'Answer explanations', 'Performance review'],
                        'button_label' => 'Try PMP practice',
                        'plans_label' => 'View plans',
                    ],
                    [
                        'title' => 'CSM Exam Simulator',
                        'description' => 'Build your Scrum knowledge and practise for your certification assessment.',
                        'icon' => 'scrum',
                        'features' => ['Scrum practice tests', 'Answer explanations', 'Progress tracking'],
                        'button_label' => 'Try CSM practice',
                        'plans_label' => 'View plans',
                    ],
                    [
                        'title' => 'Project Simulation',
                        'description' => 'Explore real-world project situations and practise making decisions.',
                        'icon' => 'simulation',
                        'features' => ['Practical scenarios', 'Decision feedback', 'Learning progress'],
                        'button_label' => 'Explore simulations',
                        'plans_label' => 'View plans',
                    ],
                ],
            ],
            'banner' => [
                'heading' => 'Good technical skills need clear communication.',
                'description' => 'Build confidence in professional emails, team updates, interviews and resume writing.',
                'button_label' => 'Explore professional skills',
            ],
        ];
    }
}
