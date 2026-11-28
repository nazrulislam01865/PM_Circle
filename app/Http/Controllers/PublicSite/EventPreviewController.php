<?php

namespace App\Http\Controllers\PublicSite;

use App\Domain\Events\EventPageContent;
use App\Domain\Events\EventWriter;
use App\Http\Controllers\Controller;
use App\Http\Requests\Events\SaveEventRequest;
use App\Models\CommunityEvent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class EventPreviewController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate(['search' => ['nullable', 'string', 'max:120'], 'format' => ['nullable', 'in:all,online,in-person'], 'sort' => ['nullable', 'in:soonest,latest']]);
        $search = trim($filters['search'] ?? '');
        $format = $filters['format'] ?? 'all';
        $sort = $filters['sort'] ?? 'soonest';
        $direction = $sort === 'latest' ? 'desc' : 'asc';
        $events = CommunityEvent::query()->published()->upcoming()
            ->when($search !== '', function ($query) use ($search): void {
                $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($search)).'%';
                $query->where(function ($query) use ($pattern): void {
                    foreach (['title', 'description', 'category', 'location', 'host'] as $column) {
                        $query->orWhereRaw("LOWER($column) LIKE ? ESCAPE '!'", [$pattern]);
                    }
                });
            })
            ->when($format !== 'all', fn ($query) => $query->where('format', $format))
            ->orderBy('starts_at', $direction)->orderBy('id', $direction)
            ->paginate(10, CommunityEvent::listingColumns())->withQueryString()->through(fn (CommunityEvent $event) => $event->listingData());

        return Inertia::render('events/Index', ['events' => $events, 'filters' => compact('search', 'format', 'sort'), 'content' => EventPageContent::load()]);
    }

    public function show(Request $request, string $slug): Response
    {
        $event = CommunityEvent::query()->published()->where('slug', $slug)->firstOrFail();
        $related = CommunityEvent::query()->published()->upcoming()->where('id', '!=', $event->id)
            ->where('category', $event->category)->orderBy('starts_at')->orderBy('id')->limit(2)->get(CommunityEvent::listingColumns());
        $comments = DB::table('community_event_comments')->where('event_id', $event->id)->where('status', 'approved')
            ->orderByDesc('id')->paginate(15, ['id', 'name', 'message'], 'comments_page')->withQueryString();
        $member = $this->eligibleMember($request);
        $registered = $member && DB::table('community_event_registrations')->where('event_id', $event->id)->where('user_id', $request->user()->id)->exists();

        return Inertia::render('events/Show', [
            'event' => $event->detailData(), 'relatedEvents' => $related->map(fn (CommunityEvent $item) => $item->listingData()),
            'comments' => $comments, 'registered' => $registered,
            'calendarEnabled' => $registered && ($request->user()->account_preferences['eventCalendar'] ?? true), 'canRegister' => $member || ($event->open_to_everyone && ! $request->user()),
            'canComment' => $member || ! $request->user(), 'notice' => $request->session()->get('event_notice'),
        ]);
    }

    public function create(Request $request): Response
    {
        abort_unless(\App\Domain\Billing\Queries\MemberFeatureAccess::allows(app(\App\Domain\Billing\Queries\CurrentMemberPlan::class)->code($request->user()), 'plus'), 403);
        return Inertia::render('events/Create', ['notice' => $request->session()->get('event_notice'), 'submissions' => CommunityEvent::query()
            ->where('creator_id', $request->user()->id)->latest('id')->paginate(10, ['id', 'title', 'slug', 'status'])]);
    }

    public function store(SaveEventRequest $request, EventWriter $writer): RedirectResponse
    {
        abort_unless(\App\Domain\Billing\Queries\MemberFeatureAccess::allows(app(\App\Domain\Billing\Queries\CurrentMemberPlan::class)->code($request->user()), 'plus'), 403);
        DB::transaction(function () use ($request, $writer): void {
            $id = $request->user()->id;
            DB::table('users')->where('id', $id)->lockForUpdate()->first(['id']);
            $start = now('Asia/Dhaka')->startOfMonth();
            $end = $start->copy()->addMonthNoOverflow();
            if (CommunityEvent::query()->where('creator_id', $id)->where('created_at', '>=', $start->utc())->where('created_at', '<', $end->utc())->exists()) {
                throw ValidationException::withMessages(['title' => 'Your plan allows one event submission per calendar month.']);
            }
            $writer->save($request);
        });
        return to_route('events.create')->with('event_notice', 'Your event has been submitted for administrator review.');
    }

    private function hostedEvent(Request $request, int $event): CommunityEvent
    {
        abort_unless(\App\Domain\Billing\Queries\MemberFeatureAccess::allows(app(\App\Domain\Billing\Queries\CurrentMemberPlan::class)->code($request->user()), 'plus'), 403);
        return CommunityEvent::query()->where('creator_id', $request->user()->id)->findOrFail($event);
    }

    public function registrants(Request $request, int $event): \Symfony\Component\HttpFoundation\Response
    {
        $hosted = $this->hostedEvent($request, $event);
        return Inertia::render('events/Registrants', ['event' => $hosted->only(['id', 'title']),
            'registrations' => DB::table('community_event_registrations')->where('event_id', $hosted->id)->orderByDesc('id')->paginate(20, ['id', 'name', 'email', 'phone', 'role', 'created_at'])])->toResponse($request)->header('Cache-Control', 'private, no-store');
    }

    public function downloadRegistrants(Request $request, int $event): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $hosted = $this->hostedEvent($request, $event);
        return response()->streamDownload(function () use ($hosted): void {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Name', 'Email', 'Phone', 'Role', 'Registered at'], ',', '"', '');
            foreach (DB::table('community_event_registrations')->where('event_id', $hosted->id)->select(['id', 'name', 'email', 'phone', 'role', 'created_at'])->lazyById(250) as $row) {
                $values = array_map(static function ($value): string {
                    $value = (string) $value;
                    return preg_match('/^[\s]*[=+@-]|^[\t\r\n]/u', $value) ? "'".$value : $value;
                }, [$row->name, $row->email, $row->phone, $row->role, $row->created_at]);
                fputcsv($out, $values, ',', '"', '');
            }
            fclose($out);
        }, 'event-'.$hosted->id.'-registrants.csv', ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'private, no-store']);
    }

    public function register(Request $request, string $slug): RedirectResponse
    {
        $member = $this->eligibleMember($request);
        abort_unless($member || ! $request->user(), 403);
        $data = $request->validate([
            'name' => [$member ? 'nullable' : 'required', 'string', 'max:120'],
            'email' => [$member ? 'nullable' : 'required', 'email:rfc', 'max:254'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+?[0-9() -]{7,20}$/'],
            'role' => ['nullable', 'string', 'max:120'],
        ]);
        $digits = strlen(preg_replace('/\D/', '', $data['phone']));
        if ($digits < 7 || $digits > 15) throw ValidationException::withMessages(['phone' => 'Enter a valid phone number with 7 to 15 digits.']);
        DB::transaction(function () use ($request, $slug, $member, $data): void {
            $event = CommunityEvent::query()->published()->where('slug', $slug)->lockForUpdate()->firstOrFail();
            abort_unless($member || $event->open_to_everyone, 403);
            if (! $event->registration_open || ! $event->starts_at->isFuture()) {
                throw ValidationException::withMessages(['phone' => 'Registration is closed for this event.']);
            }
            $email = mb_strtolower($member ? $request->user()->email : $data['email']);
            // Unique event/email and event/user constraints make retries safe. Do not disclose another person's registration.
            $registration = [
                'event_id' => $event->id, 'user_id' => $member ? $request->user()->id : null,
                'name' => $member ? mb_substr($request->user()->name, 0, 120) : $data['name'], 'email' => $email,
                'phone' => $data['phone'], 'role' => $data['role'] ?? null, 'created_at' => now(), 'updated_at' => now(),
            ];
            $inserted = DB::table('community_event_registrations')->insertOrIgnore($registration);
            if (! $inserted && $member && $request->user()->email_verified_at !== null) {
                // The verified owner can replace an earlier guest registration for this email.
                $claimed = DB::table('community_event_registrations')->where('event_id', $event->id)->where('email', $email)->whereNull('user_id')
                    ->whereNotExists(fn ($query) => $query->selectRaw('1')->from('community_event_registrations as existing')->where('existing.event_id', $event->id)->where('existing.user_id', $request->user()->id))
                    ->update(['user_id' => $request->user()->id, 'name' => $registration['name'], 'phone' => $registration['phone'], 'role' => $registration['role'], 'updated_at' => now()]);
                $inserted = $claimed;
            }
            if ($inserted && $member && ($request->user()->account_preferences['eventNotify'] ?? false)) {
                $userId = $request->user()->id;
                DB::afterCommit(static fn () => app(\App\Domain\Notifications\ActivityNotifier::class)->forEventRegistration($userId, $event->id, $slug));
            }
        });
        return to_route('events.show', $slug)->with('event_notice', 'Registration received. If already registered, no duplicate registration was created.');
    }

    public function comment(Request $request, string $slug): RedirectResponse
    {
        $member = $this->eligibleMember($request);
        abort_unless($member || ! $request->user(), 403);
        $data = $request->validate(['name' => [$member ? 'nullable' : 'required', 'string', 'max:80'], 'message' => ['required', 'string', 'max:1500']]);
        DB::transaction(function () use ($request, $slug, $member, $data): void {
            $event = CommunityEvent::query()->published()->where('slug', $slug)->lockForUpdate()->firstOrFail();
            if (! $event->discussion_open) throw ValidationException::withMessages(['message' => 'Discussion is closed for this event.']);
            DB::table('community_event_comments')->insert([
                'event_id' => $event->id, 'user_id' => $member ? $request->user()->id : null,
                'name' => $member ? mb_substr($request->user()->name, 0, 80) : $data['name'], 'message' => $data['message'],
                'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
            ]);
        });
        return to_route('events.show', $slug)->with('event_notice', 'Your comment was submitted for review. It will appear after approval.');
    }

    private function eligibleMember(Request $request): bool
    {
        $user = $request->user();
        return $user && ! $user->is_admin && $user->status === 'active' && $user->onboarding_step >= 3
            && (! config('pm-circle.email_verification_required') || $user->email_verified_at !== null);
    }
}
