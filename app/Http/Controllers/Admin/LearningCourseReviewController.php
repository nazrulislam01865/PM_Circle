<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LearningCourse;
use App\Models\LearningCourseReview;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class LearningCourseReviewController extends Controller
{
    public function index(LearningCourse $course): Response
    {
        return Inertia::render('admin/LearningCourseReviews', [
            'course' => $course->only(['id', 'title', 'slug']),
            'reviews' => $course->reviews()->orderBy('is_published')->orderByDesc('updated_at')
                ->paginate(15, ['id', 'rating', 'body', 'is_published', 'updated_at'])->withQueryString()
                ->through(fn ($review) => [...$review->toArray(), 'revision' => hash('sha256', $review->rating.':'.$review->body)]),
        ]);
    }

    public function update(Request $request, LearningCourse $course, LearningCourseReview $review): RedirectResponse
    {
        abort_unless($review->course_id === $course->id, 404);
        $data = $request->validate(['is_published' => ['required', 'boolean'], 'revision' => ['required', 'string', 'max:64']]);
        // Do not approve a review that was edited since the administrator opened it.
        $updated = $course->reviews()->whereKey($review->id)->where('updated_at', $review->updated_at)
            ->where('rating', $review->rating)->where('body', $review->body)
            ->where('is_published', $review->is_published);
        if (! hash_equals(hash('sha256', $review->rating.':'.$review->body), $data['revision'])) {
            return back()->withErrors(['review' => 'Review changed. Reload before moderating.']);
        }
        if (! $updated->update(['is_published' => $data['is_published'], 'updated_at' => now()])) {
            return back()->withErrors(['review' => 'Review changed. Reload before moderating.']);
        }
        return back()->with('status', $data['is_published'] ? 'Review published.' : 'Review hidden.');
    }
}
