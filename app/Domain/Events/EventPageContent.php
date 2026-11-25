<?php

namespace App\Domain\Events;

use App\Models\HomePageContent;

final class EventPageContent
{
    public static function defaults(): array
    {
        return [
            'title' => 'Community Events',
            'description' => 'Browse upcoming study sessions, workshops and discussions. Join member events or register as a guest for events marked Open to everyone.',
            'host_title' => 'Host an event or advertise with PM Circle',
            'host_description' => 'Contact PM Circle to arrange a company event or promote your products or services in the banner.',
            'host_visible' => true,
            'host_action' => 'Contact PM Circle',
            'advertisements' => [],
        ];
    }

    public static function load(): array
    {
        return array_replace(self::defaults(), HomePageContent::query()->where('key', 'events')->first()?->content ?? []);
    }
}
