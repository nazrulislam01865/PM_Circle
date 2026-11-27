<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Opt-in aggregate-only timings. No SQL text, bindings, member identifiers or cursor tokens. */
final class FeedPerformanceTiming
{
    public const ATTRIBUTE = 'pmc.feed.performance';

    public function handle(Request $request, Closure $next): Response
    {
        if (! config('community.feed_performance_timing')) {
            return $next($request);
        }
        $start = hrtime(true);
        $request->attributes->set(self::ATTRIBUTE, ['count' => 0, 'ms' => 0.0]);
        try {
            $response = $next($request);
            $metrics = $request->attributes->get(self::ATTRIBUTE);
            $response->headers->set('Server-Timing', sprintf(
                'app;dur=%.2f, db;dur=%.2f, sql;desc="%d"',
                (hrtime(true) - $start) / 1e6, $metrics['ms'], $metrics['count'],
            ), false);
            return $response;
        } finally {
            $request->attributes->remove(self::ATTRIBUTE);
        }
    }
}
