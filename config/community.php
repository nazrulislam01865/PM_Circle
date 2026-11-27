<?php

return [
    // Staging release switches: enable only after the performance acceptance gates.
    'progressive_dashboard_enabled' => (bool) env('PMC_PROGRESSIVE_DASHBOARD_ENABLED', false),
    'feed_performance_timing' => (bool) env('PMC_FEED_PERFORMANCE_TIMING', false),
    'bounded_feed_enabled' => (bool) env('PMC_BOUNDED_FEED_ENABLED', false),
    // Published JPEG/PNG media is optimized in-place; moderation staging stays untouched.
    'media_variants_enabled' => (bool) env('PMC_MEDIA_VARIANTS_ENABLED', true),
    'media_variants_queue' => env('PMC_MEDIA_VARIANTS_QUEUE', 'default'),
    'media_variants_quality' => (int) env('PMC_MEDIA_VARIANTS_QUALITY', 92),
    'media_max_dimension' => (int) env('PMC_MEDIA_MAX_DIMENSION', 2048),
    'media_variants_max_pixels' => (int) env('PMC_MEDIA_VARIANTS_MAX_PIXELS', 12000000),

    // Enable only after a gated, verified engagement-statistics backfill.
    'engagement_stats_reads' => (bool) env('PMC_ENGAGEMENT_STATS_READS', false),
    'engagement_type_reads' => (bool) env('PMC_ENGAGEMENT_TYPE_READS', false),
    'engagement_comment_reads' => (bool) env('PMC_ENGAGEMENT_COMMENT_READS', false),
    'engagement_stats_writes' => (bool) env('PMC_ENGAGEMENT_STATS_WRITES', false),
    // Temporarily refuse community engagement writes while doing the initial backfill.
    'engagement_write_gate' => (bool) env('PMC_ENGAGEMENT_WRITE_GATE', false),
    // Confirmed post + comment/reply moderation strikes within a rolling window.
    'post_restriction_threshold' => (int) env('PMC_POST_RESTRICTION_THRESHOLD', 5),
    'post_restriction_window_days' => (int) env('PMC_POST_RESTRICTION_WINDOW_DAYS', 30),
    'post_restriction_duration_days' => (int) env('PMC_POST_RESTRICTION_DURATION_DAYS', 10),
];
