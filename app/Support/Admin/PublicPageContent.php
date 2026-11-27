<?php

namespace App\Support\Admin;

use App\Models\HomePageContent;
use Illuminate\Support\Facades\Cache;

final class PublicPageContent
{
    public static function defaults(string $page): array
    {
        return match ($page) {
            'compare-plans', 'refund-policy' => json_decode(file_get_contents(resource_path('js/data/'.$page.'.json')), true, 512, JSON_THROW_ON_ERROR),
            'about' => [
                'banner' => ['title' => 'About PM Circle', 'description' => 'Learn, practise and connect with people who manage projects.'],
                'intro' => ['enabled' => true, 'title' => 'Built around real project work', 'description' => 'PM Circle by ITQAN Consulting is a learning and practice community for project professionals in Bangladesh. It brings project management courses, exam practice and peer discussions into one place, whether you are starting out or already leading projects.'],
                'features' => ['enabled' => true, 'title' => 'What you can do on PM Circle', 'cards' => [
                    ['title' => 'Learn', 'description' => 'Build practical skills in project planning, communication and delivery.', 'linkLabel' => 'Browse courses', 'href' => '/learning'],
                    ['title' => 'Practise', 'description' => 'Work through realistic scenarios and prepare for certification with timed practice.', 'linkLabel' => 'Browse exam simulators', 'href' => '/simulators'],
                    ['title' => 'Connect', 'description' => 'Discuss how others handle project challenges and join community events.', 'linkLabel' => 'Browse events', 'href' => '/events'],
                ]],
                'company' => ['enabled' => true, 'title' => 'Developed by ITQAN Consulting', 'description' => 'The platform draws on ITQAN’s work in project delivery, consulting and training. AI tools support activities like résumé review and interview practice, while practical examples and peer discussion help members put ideas to work.', 'linkLabel' => 'Visit ITQAN Consulting', 'href' => 'https://www.itqanconsulting.com/'],
            ],
            'trends' => [
                'banner' => ['title' => 'Trends', 'description' => 'Weekly reports on project management, business analysis, technology, AI and other topics shaping how we work.'],
                'listing' => ['searchLabel' => 'Search reports', 'searchPlaceholder' => 'Search titles or topics', 'topicLabel' => 'Topic', 'allTopics' => 'All topics', 'searchAction' => 'Search', 'clearAction' => 'Clear filters', 'emptyText' => 'No reports match your filters.'],
                'detail' => ['noticeTitle' => 'Note', 'sourceTitle' => 'Source', 'sampleNoticeTitle' => 'AI-generated sample report', 'sampleNoticeText' => 'This article is illustrative. It may contain inaccuracies. Verify claims against current job listings, employer information and original sources before making career decisions.', 'noticeText' => 'This article is provided for learning and information purposes. Please verify key information from the original sources before making career or business decisions.', 'relatedTitle' => 'More from Trends', 'allReportsLabel' => 'All career reports', 'relatedEnabled' => true, 'commentsEnabled' => true, 'saveEnabled' => true, 'shareEnabled' => true],
            ],
        };
    }

    public static function key(string $page): string
    {
        return 'public_'.$page;
    }

    public static function resolve(string $page, array $stored): array
    {
        // Replace entire section arrays so removed repeatable cards cannot reappear.
        $defaults = self::defaults($page);
        foreach ($defaults as $section => $fields) {
            if (is_array($stored[$section] ?? null)) $defaults[$section] = array_replace($fields, array_intersect_key($stored[$section], $fields));
        }
        return $defaults;
    }

    public static function load(string $page): array
    {
        return Cache::remember('pm-circle:public-page:'.$page, 300, fn () => self::resolve($page,
            HomePageContent::query()->where('key', self::key($page))->first(['content'])?->content ?? []));
    }

    public static function clear(string $page): void
    {
        Cache::forget('pm-circle:public-page:'.$page);
    }
}
