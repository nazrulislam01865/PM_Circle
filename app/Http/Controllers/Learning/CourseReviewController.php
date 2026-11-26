<?php

namespace App\Http\Controllers\Learning;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Http\Controllers\Controller;
use App\Models\LearningCourse;
use App\Services\Learning\CourseAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class CourseReviewController extends Controller
{
    public function store(Request $request, string $course, CourseAccess $access, CurrentMemberPlan $plans): RedirectResponse
    {
        $record = LearningCourse::query()->where('slug', $course)->where('is_published', true)->firstOrFail();
        $access->ensureEnrolled($request, $record, $plans);
        $data = $request->validate(['rating' => ['required', 'integer', 'between:1,5'], 'body' => ['required', 'string', 'max:2000']]);
        // One review per enrollment; editing always returns it to moderation.
        $record->reviews()->upsert([[
            'course_id' => $record->id, 'user_id' => $request->user()->id,
            'rating' => $data['rating'], 'body' => $data['body'], 'is_published' => false,
        ]], ['course_id', 'user_id'], ['rating', 'body', 'is_published', 'updated_at']);
        return back()->with('status', 'Review submitted for moderation.');
    }
}
