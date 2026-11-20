<?php

namespace App\Support\Home;

final class HomeAiFeaturesContent
{
    /** Keep legacy homepage records compatible without a migration or seeder rerun. */
    public static function withDefaults(array $stored): array
    {
        $defaults = config('home-ai-features');
        $content = array_replace_recursive($defaults, $stored);
        // Four fixed illustration slots match the approved homepage prototype.
        $content['cards'] = array_slice($content['cards'], 0, count($defaults['cards']));

        return $content;
    }
}
