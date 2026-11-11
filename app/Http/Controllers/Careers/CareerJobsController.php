<?php

namespace App\Http\Controllers\Careers;

use App\Http\Controllers\Controller;
use App\Http\Requests\Careers\ListCareerJobsRequest;
use App\Models\CareerJob;
use Illuminate\Database\Eloquent\Builder;
use Inertia\Inertia;
use Inertia\Response;

final class CareerJobsController extends Controller
{
    public function index(ListCareerJobsRequest $request): Response
    {
        $filters = $request->validated();
        $search = trim((string) ($filters['q'] ?? ''));
        $type = (string) ($filters['type'] ?? '');

        $jobs = CareerJob::query()->current()
            ->when($type !== '', fn (Builder $query) => $query->where('job_type', $type))
            ->when($search !== '', function (Builder $query) use ($search): void {
                // Portable, case-insensitive literal search with escaped LIKE wildcards.
                $term = mb_strtolower($search);
                $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
                $query->where(fn (Builder $match) => $match
                    ->whereRaw("LOWER(title) LIKE ? ESCAPE '!'", [$pattern])
                    ->orWhereRaw("LOWER(company) LIKE ? ESCAPE '!'", [$pattern])
                    ->orWhereRaw("LOWER(location) LIKE ? ESCAPE '!'", [$pattern]));
            })
            ->orderByDesc('posted_at')->orderByDesc('id')
            ->simplePaginate(12)->withQueryString();

        return Inertia::render('career/Jobs', [
            'jobs' => [
                'data' => $jobs->getCollection()->map(fn (CareerJob $job) => $job->forCareers())->values(),
                'currentPage' => $jobs->currentPage(),
                'hasMore' => $jobs->hasMorePages(),
            ],
            'filters' => ['q' => $search, 'type' => $type],
        ]);
    }

    public function show(string $job): Response
    {
        $listing = CareerJob::query()->current()->where('slug', $job)->firstOrFail();

        return Inertia::render('career/Show', [
            'job' => $listing->forCareers(),
        ]);
    }
}
