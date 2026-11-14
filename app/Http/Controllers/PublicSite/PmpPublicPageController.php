<?php

namespace App\Http\Controllers\PublicSite;

use App\Http\Controllers\Controller;
use App\Support\Exam\PmpPublicContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class PmpPublicPageController extends Controller
{
    public function __invoke(Request $request): Response|RedirectResponse
    {
        // The landing page is for guests only. Signed-in administrators return to
        // administration; members enter the protected simulator or pricing flow.
        if ($request->user()) {
            return $request->user()->is_admin
                ? to_route('admin.dashboard')
                : to_route('exams.pmp.entry');
        }

        return Inertia::render('exam/Public', ['content' => PmpPublicContent::load()]);
    }
}
