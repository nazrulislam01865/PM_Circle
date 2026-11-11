<?php

namespace App\Services\Careers;

use App\Models\CareerJob;
use DateTimeImmutable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class JobImportService
{
    /** @param iterable<array<string, mixed>> $jobs */
    public function import(iterable $jobs): array
    {
        $now = now();
        $valid = [];
        $invalid = 0;

        foreach ($jobs as $job) {
            $row = $this->normalize($job, $now->toDateTimeString());
            if ($row === null) {
                $invalid++;
                continue;
            }
            $valid[$row['fingerprint']] = $row;
        }

        // A bulk upsert is idempotent and does not overwrite first_seen_at.
        // The unique fingerprint prevents duplicates across searches or retries.
        foreach (array_chunk(array_values($valid), 100) as $chunk) {
            CareerJob::query()->upsert($chunk, ['fingerprint'], [
                'title', 'company', 'location', 'job_type', 'description',
                'posted_at', 'salary_min', 'salary_max', 'salary_currency',
                'salary_interval', 'vacancies', 'experience', 'source_url',
                'last_seen_at', 'updated_at',
            ]);
        }

        if ($invalid > 0) {
            Log::warning('JobSpy skipped invalid job records', ['invalid_count' => $invalid]);
        }

        return ['accepted' => count($valid), 'rejected' => $invalid];
    }

    /** @param array<string, mixed> $raw */
    private function normalize(array $raw, string $timestamp): ?array
    {
        $source = strtolower($this->string($raw['site'] ?? null, 32));
        $title = $this->string($raw['title'] ?? null, 255);
        $company = $this->string($raw['company'] ?? null, 200);
        $url = $this->string($raw['job_url'] ?? null, 2048);
        $parts = filter_var($url, FILTER_VALIDATE_URL) ? parse_url($url) : false;

        // Do not expose untrusted URL schemes, credentials, internal hosts or IP literals.
        if (! in_array($source, ['bdjobs', 'indeed', 'linkedin', 'glassdoor', 'zip_recruiter', 'bayt', 'naukri', 'hellowork'], true)
            || $title === '' || $company === '' || ! is_array($parts)
            || ! in_array(strtolower($parts['scheme'] ?? ''), ['https', 'http'], true)
            || empty($parts['host']) || isset($parts['user']) || isset($parts['pass'])
            || filter_var($parts['host'], FILTER_VALIDATE_IP)
            || ! str_contains($parts['host'], '.')
            || strtolower($parts['host']) === 'localhost') {
            return null;
        }

        $id = $this->string($raw['id'] ?? null, 191);
        $fingerprint = hash('sha256', $source.'|'.($id !== '' ? $id : $url));
        $jobType = match (strtolower($this->string($raw['job_type'] ?? null, 32))) {
            'fulltime' => 'Full time', 'parttime' => 'Part time',
            'contract' => 'Contract', 'internship' => 'Internship',
            'temporary' => 'Temporary', 'perdiem' => 'Per diem',
            'volunteer' => 'Volunteer', 'other' => 'Other', default => null,
        };
        $location = $raw['location'] ?? null;
        if (is_array($location)) {
            $location = implode(', ', array_filter([
                $this->string($location['city'] ?? null, 80),
                $this->string($location['state'] ?? null, 80),
                $this->string($location['country'] ?? null, 80),
            ]));
        }
        $posted = $this->string($raw['date_posted'] ?? null, 32);
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', substr($posted, 0, 10));
        $postedAt = $date !== false && $date->format('Y-m-d') === substr($posted, 0, 10)
            ? $date->format('Y-m-d') : null;
        $currency = strtoupper($this->string($raw['currency'] ?? null, 8));
        $interval = strtolower($this->string($raw['interval'] ?? null, 16));
        $interval = in_array($interval, ['yearly', 'monthly', 'weekly', 'daily', 'hourly'], true) ? $interval : null;
        $experience = $raw['experience_range'] ?? null;
        if (! is_string($experience)) {
            $experience = null;
        }
        $vacancies = $raw['vacancy_count'] ?? null;
        $vacancies = is_numeric($vacancies) && (float) $vacancies >= 1 && (float) $vacancies <= 100000
            ? (int) $vacancies : null;

        return [
            'slug' => 'job-'.substr($fingerprint, 0, 32),
            'fingerprint' => $fingerprint,
            'source' => $source,
            'external_id' => $id !== '' ? $id : null,
            'title' => $title,
            'company' => $company,
            'location' => $this->string($location, 200) ?: null,
            'job_type' => $jobType,
            'description' => $this->string($raw['description'] ?? null, 12000) ?: null,
            'posted_at' => $postedAt,
            'salary_min' => $this->salary($raw['min_amount'] ?? null),
            'salary_max' => $this->salary($raw['max_amount'] ?? null),
            'salary_currency' => preg_match('/^[A-Z]{3}$/', $currency) ? $currency : null,
            'salary_interval' => $interval,
            'vacancies' => $vacancies,
            'experience' => $this->string($experience, 160) ?: null,
            'source_url' => $url,
            'first_seen_at' => $timestamp,
            'last_seen_at' => $timestamp,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ];
    }

    private function string(mixed $value, int $max): string
    {
        return is_string($value) || is_int($value) ? Str::limit(trim((string) $value), $max, '') : '';
    }

    private function salary(mixed $amount): ?float
    {
        return is_numeric($amount) && is_finite((float) $amount)
            && (float) $amount >= 0 && (float) $amount <= 9999999999
                ? round((float) $amount, 2) : null;
    }
}
