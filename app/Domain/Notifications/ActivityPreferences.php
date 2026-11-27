<?php

namespace App\Domain\Notifications;

use Carbon\CarbonImmutable;
use DateTimeZone;

/** Optional delivery only. Security, billing and administrator notices bypass these rules. */
final class ActivityPreferences
{
    public static function topic(string $eventKey): string
    {
        return match (true) {
            str_starts_with($eventKey, 'scenario-') => 'challengeNotify',
            str_starts_with($eventKey, 'course-completed:') => 'learnNotify',
            str_starts_with($eventKey, 'pmp-completed:') => 'examNotify',
            str_starts_with($eventKey, 'event-registration:') => 'eventNotify',
            str_starts_with($eventKey, 'ai-limit:') => 'usageNotify',
            default => 'communityNotify',
        };
    }

    public static function timezone(array $preferences): string
    {
        $zone = $preferences['timezone'] ?? 'Asia/Dhaka';
        if (! is_string($zone)) return 'Asia/Dhaka';
        try {
            return (new DateTimeZone($zone))->getName();
        } catch (\Exception) {
            return 'Asia/Dhaka';
        }
    }

    public static function allows(array $preferences, string $eventKey, CarbonImmutable $now): bool
    {
        $topic = self::topic($eventKey);
        if (! ($preferences[$topic] ?? in_array($topic, ['challengeNotify', 'communityNotify'], true))) return false;
        if (! ($preferences['quiet'] ?? false)) return true;
        $start = $preferences['quietStart'] ?? '22:00';
        $end = $preferences['quietEnd'] ?? '07:00';
        $time = $now->setTimezone(self::timezone($preferences))->format('H:i');
        return $start === $end || ! ($start < $end ? $time >= $start && $time < $end : $time >= $start || $time < $end);
    }

    public static function emailDue(array $preferences, CarbonImmutable $now): ?CarbonImmutable
    {
        if (! ($preferences['mail'] ?? false)) return null;
        $local = $now->setTimezone(self::timezone($preferences));
        return match ($preferences['digest'] ?? 'Instant') {
            'Instant' => $now->utc(),
            'Daily' => ($local->hour < 8 ? $local->setTime(8, 0) : $local->addDay()->setTime(8, 0))->utc(),
            'Weekly' => ($local->isMonday() && $local->hour < 8 ? $local->setTime(8, 0) : $local->next('Monday')->setTime(8, 0))->utc(),
            default => null,
        };
    }
}
