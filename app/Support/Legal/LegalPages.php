<?php

namespace App\Support\Legal;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class LegalPages
{
    public const DOCUMENTS = ['terms', 'privacy'];

    public static function defaults(string $document): array
    {
        return json_decode(file_get_contents(resource_path('legal/defaults.json')), true, 512, JSON_THROW_ON_ERROR)[$document];
    }

    public static function version(int $id): string
    {
        return 'legal-'.$id;
    }

    public static function publicDocument(string $document, ?string $version = null): array
    {
        if ($version !== null) {
            abort_unless(preg_match('/^legal-[1-9][0-9]{0,17}$/D', $version), 404);
            $published = DB::table('legal_page_versions')->where('document', $document)
                ->where('id', substr($version, 6))->first();
            abort_unless($published, 404);
        } else {
            $published = DB::table('legal_pages as page')->join('legal_page_versions as version', function ($join) {
                $join->on('version.id', '=', 'page.published_version_id')->on('version.document', '=', 'page.document');
            })->where('page.document', $document)->select('version.*')->first();
        }

        return [
            'content' => $published ? self::decode($published->content) : self::defaults($document),
            'version' => $published ? self::version($published->id) : null,
            'published_at' => $published ? (string) $published->published_at : null,
        ];
    }

    public static function decode(string $value): array
    {
        return json_decode($value, true, 512, JSON_THROW_ON_ERROR);
    }

    /** Lock the same rows as publication when binding a new account to its accepted versions. */
    public static function acceptance(bool $lock = false): array
    {
        $query = DB::table('legal_pages')->whereIn('document', self::DOCUMENTS)->orderBy('document');
        if ($lock) {
            $query->lockForUpdate();
        }
        $pages = $query->pluck('published_version_id', 'document');
        $terms = $pages->get('terms');
        $privacy = $pages->get('privacy');

        return [
            'terms' => $terms ? self::version($terms) : (string) config('pm-circle.terms_version'),
            'privacy' => $privacy ? self::version($privacy) : (string) config('pm-circle.privacy_version'),
            'terms_published' => (bool) $terms,
            'privacy_published' => (bool) $privacy,
            'ready' => (bool) $terms && (bool) $privacy,
        ];
    }

    public static function verifyAcceptance(array $input): array
    {
        $current = self::acceptance(true);
        if (app()->isProduction() && ! $current['ready']) {
            throw ValidationException::withMessages(['legal_acceptance' => 'Registration is unavailable until the current Terms and Privacy Policy are published.']);
        }
        if (($current['terms_published'] || $current['privacy_published']) &&
            (($input['terms_version'] ?? null) !== $current['terms'] || ($input['privacy_version'] ?? null) !== $current['privacy'])) {
            throw ValidationException::withMessages(['legal_acceptance' => 'The legal documents have changed. Review the current versions and accept them again.']);
        }
        return $current;
    }
}
