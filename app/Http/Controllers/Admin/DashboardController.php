<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Dashboard\Queries\AdminDashboardOverview;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class DashboardController extends Controller
{
    public function __invoke(Request $request, AdminDashboardOverview $overview): Response
    {
        $requested = $request->query('days', '7');
        $days = in_array($requested, ['7', '30', '90', 7, 30, 90], true) ? (int) $requested : 7;

        return Inertia::render('admin/Dashboard', $overview->forDays($days));
    }
}
