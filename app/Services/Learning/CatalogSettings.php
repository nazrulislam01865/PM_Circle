<?php

namespace App\Services\Learning;

use Illuminate\Support\Facades\DB;

final class CatalogSettings
{
    public const DEFAULTS = [
        'title' => 'Learn & Practice',
        'description' => 'Find project management courses for your role, your goals, and the work you do.',
        'starting_enabled' => true,
        'starting_title' => 'Find Your Starting Point',
        'starting_description' => 'Answer three questions to get a course recommendation from this catalog.',
        'starting_button' => 'Find my starting point',
        'topics_enabled' => true,
        'search_placeholder' => 'Agile, risk or stakeholder',
        'detail_button' => 'View details',
        'empty_title' => 'No matching courses',
        'empty_description' => 'Try changing your search or filters.',
    ];

    public function get(): array
    {
        $stored = DB::table('learning_catalog_settings')->where('id', 1)->value('content');
        return array_replace(self::DEFAULTS, array_intersect_key(json_decode($stored ?? '{}', true) ?: [], self::DEFAULTS));
    }

    public function save(array $data): void
    {
        $now = now();
        DB::table('learning_catalog_settings')->upsert([['id' => 1, 'content' => json_encode($data, JSON_THROW_ON_ERROR), 'created_at' => $now, 'updated_at' => $now]], ['id'], ['content', 'updated_at']);
    }
}
