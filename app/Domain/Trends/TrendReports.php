<?php

namespace App\Domain\Trends;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;

final class TrendReports
{
    public static function published(): Builder
    {
        return DB::table('trend_articles')->where('status', 'published')->where('published_at', '<=', now());
    }

    public static function listing(): Builder
    {
        return self::published()->where('listed', true);
    }

    public static function columns(): array
    {
        return ['id', 'slug', 'title', 'summary', 'category', 'ai_generated', 'published_at', 'presentation'];
    }

    public static function sources(Collection $rows): Collection
    {
        if ($rows->isEmpty()) return collect();
        return DB::table('trend_article_sources as a')->join('trend_sources as s', 's.id', '=', 'a.source_id')
            ->whereIn('a.article_id', $rows->pluck('id'))->where('s.rights_status', 'verified')
            ->orderBy('s.id')->get(['a.article_id', 's.publisher as title', 's.canonical_url as url'])->groupBy('article_id');
    }

    public static function presentation(object $row): array
    {
        return json_decode($row->presentation ?? '{}', true) ?: [];
    }

    public static function readingMinutes(string $body): int
    {
        $words = preg_split('/\s+/u', trim($body), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        return min(120, max(1, (int) ceil(count($words) / 200)));
    }

    public static function serialize(object $row, Collection $sources, bool $detail = false): array
    {
        $meta = self::presentation($row);
        $verified = $sources->get($row->id, collect())->map(fn ($source) => ['title' => $source->title, 'url' => $source->url])->all();
        $result = [
            'slug' => $row->slug, 'title' => $row->title, 'summary' => $row->summary, 'category' => $row->category,
            'classification' => $row->ai_generated ? 'AI Analysis' : (($verified || ! empty($meta['sources'])) ? 'Industry Source' : 'Editorial report'),
            'date' => Carbon::parse($row->published_at)->format('j M Y'), 'readMinutes' => $meta['readMinutes'] ?? 1,
            'thumbnail' => $meta['thumbnail'] ?? '/images/trends/ai-adoption.webp', 'attribution' => $meta['attribution'] ?? '',
            'sources' => $verified ?: ($meta['sources'] ?? []), 'sample' => (bool) ($meta['sample'] ?? false),
        ];
        if ($detail) {
            $result += array_intersect_key($meta, array_flip(['articleTitle', 'articleLead', 'articleCategoryLabel', 'hero', 'intro', 'listingDate']));
            $result['intro'] ??= '';
            $result['readMinutes'] = $meta['readMinutes'] ?? self::readingMinutes($row->body_markdown);
            $result['sections'] = json_decode($row->sections ?? '[]', true) ?: [];
            // Markdown is rendered as sanitized HTML; raw HTML and unsafe protocols are disabled.
            $html = Str::markdown($row->body_markdown, ['html_input' => 'strip', 'allow_unsafe_links' => false, 'max_nesting_level' => 20, 'max_delimiters_per_line' => 500]);
            // The shared page banner remains the only H1.
            $result['bodyHtml'] = str_replace(['<h1>', '</h1>'], ['<h2>', '</h2>'], $html);
        }
        return $result;
    }
}
