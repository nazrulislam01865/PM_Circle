<?php

namespace App\Domain\AI\Services;

/** Database-managed feature settings take priority over the legacy deployment defaults. */
final class ResumeExtractionSettings
{
    public function __construct(private readonly AiFeatureRouting $routing) {}

    public function enabled(): bool
    {
        return (bool) ($this->routing->route('resume_extract')?->enabled_override ?? config('pm-ai.resume_extract_enabled', false));
    }

    public function model(): ?string
    {
        return $this->routing->route('resume_extract')?->primary_model ?? config('pm-ai.resume_extract_model');
    }

    public function dailyLimit(): int
    {
        return (int) ($this->routing->route('resume_extract')?->request_daily_limit ?? config('pm-ai.resume_extract_daily_limit', 3));
    }

    public function outputLimit(): int
    {
        return (int) ($this->routing->route('resume_extract')?->output_token_limit ?? config('pm-ai.resume_extract_max_output_tokens', 6000));
    }
}
