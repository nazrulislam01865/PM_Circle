<?php

namespace App\Domain\Careers\Services;

use Illuminate\Support\Facades\DB;

final class CareerTrendSettings
{
    public const OPTIONS = [
        'frequency' => ['weekly' => 'Weekly'],
        'publish_day' => ['0' => 'Sunday', '1' => 'Monday', '2' => 'Tuesday', '3' => 'Wednesday', '4' => 'Thursday', '5' => 'Friday', '6' => 'Saturday'],
        'timezone' => ['Asia/Dhaka' => 'Asia/Dhaka', 'UTC' => 'UTC', 'Asia/Kolkata' => 'Asia/Kolkata', 'Asia/Dubai' => 'Asia/Dubai', 'Asia/Singapore' => 'Asia/Singapore'],
        'lead_hours' => ['12' => '12 hours before publishing', '24' => '24 hours before publishing', '48' => '48 hours before publishing', '72' => '72 hours before publishing'],
        'publishing_mode' => ['approval' => 'Require editor approval'],
        'topics' => ['job_demand' => 'PM job demand', 'skills_tools' => 'Skills & tools', 'certification' => 'Certification trends', 'ai' => 'AI at work', 'business_analysis' => 'Business analysis'],
        'target_levels' => ['coordinator' => 'Coordinator', 'project_manager' => 'Project Manager', 'senior_pm' => 'Senior PM'],
        'market' => ['Bangladesh' => 'Bangladesh', 'Global' => 'Global'],
        'language' => ['English' => 'English', 'Bangla' => 'Bangla'],
        'sections' => ['executive_summary' => 'Executive summary', 'hiring_signals' => 'Hiring signals', 'skills' => 'Skills to watch', 'actions' => 'Recommended actions', 'sources' => 'Sources & links'],
        'source_policy' => ['approved' => 'Approved sources only'],
        'lookback_days' => ['7' => '7 days', '14' => '14 days', '30' => '30 days'],
        'minimum_sources' => ['2' => '2', '3' => '3', '4' => '4', '5' => '5', '6' => '6', '7' => '7', '8' => '8'],
        'insufficient_sources' => ['hold' => 'Hold for review'],
    ];

    public static function defaults(): array
    {
        return [
            'ai_provider' => 'openai', 'frequency' => 'weekly', 'publish_day' => '0', 'publish_time' => '09:00',
            'timezone' => 'Asia/Dhaka', 'lead_hours' => '24', 'publishing_mode' => 'approval',
            'topics' => ['job_demand', 'skills_tools', 'certification'],
            'target_levels' => ['coordinator', 'project_manager', 'senior_pm'],
            'market' => 'Bangladesh', 'language' => 'English',
            'title_pattern' => 'PM Career Trends | {week_start}',
            'sections' => array_keys(self::OPTIONS['sections']), 'source_policy' => 'approved',
            'lookback_days' => '7', 'minimum_sources' => '2', 'include_source_links' => true,
            'include_source_dates' => true, 'insufficient_sources' => 'hold',
        ];
    }

    public function get(): array
    {
        $row = DB::table('career_trend_settings')->where('id', 1)->value('settings');

        return array_replace(self::defaults(), $row ? json_decode($row, true, 512, JSON_THROW_ON_ERROR) : []);
    }
}
