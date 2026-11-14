<?php

return [
    // Enable only after a gated, verified engagement-statistics backfill.
    'engagement_stats_reads' => (bool) env('PMC_ENGAGEMENT_STATS_READS', false),
    'engagement_stats_writes' => (bool) env('PMC_ENGAGEMENT_STATS_WRITES', false),
    // Temporarily refuse community engagement writes while doing the initial backfill.
    'engagement_write_gate' => (bool) env('PMC_ENGAGEMENT_WRITE_GATE', false),
];
