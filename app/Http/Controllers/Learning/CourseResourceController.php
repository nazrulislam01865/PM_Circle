<?php

namespace App\Http\Controllers\Learning;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Http\Controllers\Controller;
use App\Models\LearningCourse;
use App\Models\LearningCourseResource;
use App\Services\Learning\CourseAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;


final class CourseResourceController extends Controller
{
    public function open(Request $request, string $course, LearningCourseResource $resource, CurrentMemberPlan $plans, CourseAccess $access): \Symfony\Component\HttpFoundation\StreamedResponse|RedirectResponse
    {
        $record = LearningCourse::query()->where('slug', $course)->firstOrFail();
        abort_unless($resource->course_id === $record->id && $resource->is_published, 404);
        $access->ensureEnrolled($request, $record, $plans);
        if ($resource->kind === 'link') {
            abort_unless(filter_var($resource->url, FILTER_VALIDATE_URL)
                && in_array(strtolower(parse_url($resource->url, PHP_URL_SCHEME)), ['http', 'https'], true), 404);
            return redirect()->away($resource->url);
        }
        abort_unless($resource->kind === 'file' && $resource->file_path
            && Storage::disk('local')->exists($resource->file_path), 404);
        return Storage::disk('local')->download($resource->file_path, $resource->original_name ?: 'course-resource');
    }
}
