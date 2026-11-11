<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

final class CareerJob extends Model
{
    protected $fillable = [
        'slug', 'fingerprint', 'source', 'external_id', 'title', 'company', 'location',
        'job_type', 'description', 'posted_at', 'salary_min', 'salary_max',
        'salary_currency', 'salary_interval', 'vacancies', 'experience',
        'source_url', 'first_seen_at', 'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'posted_at' => 'date',
            'salary_min' => 'decimal:2',
            'salary_max' => 'decimal:2',
            'vacancies' => 'integer',
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    public function scopeCurrent(Builder $query): Builder
    {
        return $query->where('last_seen_at', '>=', now()->subDays(
            max(1, (int) config('jobspy.stale_days', 30))
        ));
    }

    /** Fields already understood by the existing PM Circle career cards. */
    public function forCareers(): array
    {
        $min = $this->salary_min !== null ? (float) $this->salary_min : null;
        $max = $this->salary_max !== null ? (float) $this->salary_max : null;

        return [
            'id' => $this->slug,
            'title' => $this->title,
            'company' => $this->company,
            'location' => $this->location ?: 'Not specified',
            'posted' => $this->posted_at?->toDateString(),
            'type' => $this->job_type ?: 'Not specified',
            'experience' => $this->experience,
            'vacancies' => $this->vacancies,
            'salary' => ($min !== null || $max !== null) && $this->salary_currency
                ? ['amount' => $min ?? $max, 'maxAmount' => $min !== null ? $max : null,
                    'currency' => $this->salary_currency, 'interval' => $this->salary_interval]
                : null,
            'source' => strtoupper($this->source) === 'BDJOBS' ? 'BDJobs' : ucfirst(str_replace('_', ' ', $this->source)),
            'sourceUrl' => $this->source_url,
            'image' => '/images/trends/job-trends.webp',
            'description' => $this->description,
        ];
    }
}
