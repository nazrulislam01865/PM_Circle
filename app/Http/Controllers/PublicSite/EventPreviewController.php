<?php

namespace App\Http\Controllers\PublicSite;

use App\Http\Controllers\Controller;
use App\Support\Events\PrototypeEventCatalog;
use Inertia\Inertia;
use Inertia\Response;

final class EventPreviewController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('events/Index', [
            'events' => PrototypeEventCatalog::all(),
        ]);
    }

    public function show(string $slug): Response
    {
        $event = PrototypeEventCatalog::find($slug);
        abort_if($event === null, 404);

        return Inertia::render('events/Show', [
            'event' => $event,
            'relatedEvents' => PrototypeEventCatalog::relatedTo($event),
        ]);
    }
}
