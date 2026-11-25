<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Events\EventPageContent;
use App\Domain\Events\EventWriter;
use App\Http\Controllers\Controller;
use App\Http\Requests\Events\SaveEventRequest;
use App\Models\CommunityEvent;
use App\Models\HomePageContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class CommunityEventController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->validate(['status' => ['nullable', 'in:pending,published,unpublished,rejected,all']])['status'] ?? 'all';
        return Inertia::render('admin/Events', ['events' => CommunityEvent::query()->when($status !== 'all', fn ($query) => $query->where('status', $status))
            ->latest('id')->paginate(15, ['id', 'title', 'slug', 'status', 'starts_at', 'host'])->withQueryString(), 'status' => $status,
            'notice' => $request->session()->get('event_notice')]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/EventEditor', ['event' => null]);
    }

    public function edit(CommunityEvent $event): Response
    {
        return Inertia::render('admin/EventEditor', ['event' => [
            ...$event->only(['id', 'title', 'description', 'about', 'category', 'format', 'location', 'venue', 'address', 'map_link', 'host', 'host_type', 'agenda', 'speakers', 'open_to_everyone', 'sponsored', 'registration_open', 'discussion_open']),
            'starts_at' => $event->starts_at->copy()->timezone('Asia/Dhaka')->format('Y-m-d\TH:i'),
            'ends_at' => $event->ends_at?->copy()->timezone('Asia/Dhaka')->format('Y-m-d\TH:i'), 'coverUrl' => $event->coverUrl(), 'mapUrl' => $event->mapUrl(),
        ]]);
    }

    public function store(SaveEventRequest $request, EventWriter $writer): RedirectResponse
    {
        $writer->save($request);
        return to_route('admin.events.index')->with('event_notice', 'Event saved. Publish it when ready.');
    }

    public function update(SaveEventRequest $request, CommunityEvent $event, EventWriter $writer): RedirectResponse
    {
        $writer->save($request, $event);
        return to_route('admin.events.index')->with('event_notice', 'Event updated.');
    }

    public function status(Request $request, CommunityEvent $event): RedirectResponse
    {
        $status = $request->validate(['status' => ['required', 'in:published,unpublished,rejected']])['status'];
        DB::transaction(function () use ($request, $event, $status): void {
            $locked = CommunityEvent::query()->lockForUpdate()->findOrFail($event->id);
            if ($status === 'published' && ! $locked->starts_at->isFuture()) {
                throw ValidationException::withMessages(['status' => 'Set a future start time before publishing this event.']);
            }
            $locked->update(['status' => $status, 'publisher_id' => $status === 'published' ? $request->user()->id : $locked->publisher_id]);
        });
        return back()->with('event_notice', 'Publication status updated.');
    }

    public function participants(CommunityEvent $event): Response
    {
        return Inertia::render('admin/EventParticipants', ['event' => $event->only(['id', 'title']),
            'registrations' => DB::table('community_event_registrations')->where('event_id', $event->id)->orderByDesc('id')->paginate(20, ['id', 'name', 'email', 'phone', 'role', 'created_at'], 'registrations_page')->withQueryString(),
            'comments' => DB::table('community_event_comments')->where('event_id', $event->id)->orderByDesc('id')->paginate(20, ['id', 'name', 'message', 'status'], 'comments_page')->withQueryString()]);
    }

    public function moderate(Request $request, CommunityEvent $event, int $comment): RedirectResponse
    {
        $status = $request->validate(['status' => ['required', 'in:approved,rejected']])['status'];
        $affected = DB::table('community_event_comments')->where('event_id', $event->id)->where('id', $comment)->update(['status' => $status, 'updated_at' => now()]);
        abort_if(! $affected, 404);
        return back();
    }

    public function settings(): Response
    {
        return Inertia::render('admin/EventSettings', ['content' => EventPageContent::load()]);
    }

    public function saveSettings(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'], 'description' => ['required', 'string', 'max:500'],
            'host_title' => ['required', 'string', 'max:120'], 'host_description' => ['required', 'string', 'max:500'], 'host_visible' => ['required', 'boolean'], 'host_action' => ['required', 'string', 'max:60'],
            'advertisements' => ['present', 'array', 'max:10'], 'advertisements.*' => ['array:company,initials,category,title,description,image,action,href'],
            'advertisements.*.company' => ['required', 'string', 'max:120'], 'advertisements.*.initials' => ['required', 'string', 'max:5'],
            'advertisements.*.category' => ['required', 'string', 'max:80'], 'advertisements.*.title' => ['required', 'string', 'max:120'],
            'advertisements.*.description' => ['required', 'string', 'max:500'], 'advertisements.*.image' => ['required', 'url:https', 'max:2048'],
            'advertisements.*.action' => ['required', 'string', 'max:60'], 'advertisements.*.href' => ['required', 'url:https', 'max:2048'],
        ]);
        HomePageContent::query()->updateOrCreate(['key' => 'events'], ['content' => $data]);
        return to_route('admin.events.index')->with('event_notice', 'Event page settings saved.');
    }
}
