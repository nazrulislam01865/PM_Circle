<?php

namespace App\Http\Controllers\Account;

use App\Domain\Support\SupportTopics;
use App\Http\Controllers\Controller;
use App\Http\Requests\Support\CreateSupportRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

final class SupportController extends Controller
{
    public function entry(Request $request)
    {
        if ($request->user() && ! $request->user()->is_admin && $request->user()->onboarding_step >= 3) {
            return to_route('support.guides');
        }
        return Inertia::render('public/Support', ['mode' => 'help']);
    }

    public function guides() { return Inertia::render('support/HelpCentre'); }
    public function create() { return Inertia::render('support/ContactSupport', ['topics' => SupportTopics::ALL]); }

    public function store(CreateSupportRequest $request)
    {
        $data = $request->validated();
        $user = $request->user()->id;
        $existing = DB::table('support_requests')->where('user_id', $user)->where('submission_key', $data['submission_key'])->value('id');
        if ($existing) return to_route('support.show', $existing);
        $path = null;
        if ($request->hasFile('screenshot')) {
            $path = $request->file('screenshot')->store('support/'.$user, 'local');
            if (! $path) throw ValidationException::withMessages(['screenshot' => 'The screenshot could not be saved. Please try again.']);
        }
        try {
            [$id, $inserted] = DB::transaction(function () use ($user, $data, $path): array {
                abort_unless(DB::table('users')->where('id', $user)->lockForUpdate()->first(['id']), 404);
                // The unique key makes a repeated submission safe even under concurrent requests.
                $inserted = DB::table('support_requests')->insertOrIgnore([
                    'user_id' => $user, 'topic' => $data['topic'], 'subject' => $data['subject'], 'details' => $data['details'],
                    'submission_key' => $data['submission_key'], 'screenshot_path' => $path, 'status' => 'open', 'created_at' => now(), 'updated_at' => now(),
                ]);
                $id = DB::table('support_requests')->where('user_id', $user)->where('submission_key', $data['submission_key'])->value('id');
                abort_unless($id, 503);
                return [$id, $inserted];
            }, 3);
            if (! $inserted && $path) Storage::disk('local')->delete($path);
        } catch (\Throwable $exception) {
            if ($path) Storage::disk('local')->delete($path);
            throw $exception;
        }
        return to_route('support.show', $id)->with('status', 'Support request submitted.');
    }

    public function index(Request $request)
    {
        return Inertia::render('support/Requests', ['tickets' => DB::table('support_requests')->where('user_id', $request->user()->id)
            ->orderByDesc('updated_at')->orderByDesc('id')->paginate(20, ['id', 'topic', 'subject', 'status', 'updated_at'])]);
    }

    private function owned(Request $request, int $ticket): object
    {
        $query = DB::table('support_requests')->where('id', $ticket);
        if (! $request->user()->is_admin) $query->where('user_id', $request->user()->id);
        return $query->first() ?? abort(404);
    }

    private function detail(Request $request, int $ticket): array
    {
        $row = $this->owned($request, $ticket);
        return ['ticket' => [
            'id' => $row->id, 'topic' => $row->topic, 'subject' => $row->subject, 'details' => $row->details,
            'status' => $row->status, 'created_at' => $row->created_at, 'hasScreenshot' => (bool) $row->screenshot_path,
        ], 'replies' => DB::table('support_request_replies')->where('support_request_id', $ticket)->orderByDesc('id')
            ->paginate(30, ['id', 'is_staff', 'body', 'created_at'])];
    }

    public function show(Request $request, int $ticket) { return Inertia::render('support/RequestDetails', $this->detail($request, $ticket)); }

    public function screenshot(Request $request, int $ticket)
    {
        $row = $this->owned($request, $ticket);
        abort_unless($row->screenshot_path && Storage::disk('local')->exists($row->screenshot_path), 404);
        return Storage::disk('local')->download($row->screenshot_path, 'support-screenshot.'.pathinfo($row->screenshot_path, PATHINFO_EXTENSION), ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function adminIndex(Request $request)
    {
        $filter = $request->validate(['status' => ['nullable', Rule::in(SupportTopics::STATUSES)]]);
        return Inertia::render('admin/SupportRequests', ['tickets' => DB::table('support_requests')->join('users', 'users.id', '=', 'support_requests.user_id')
            ->when($filter['status'] ?? null, fn ($query, $status) => $query->where('support_requests.status', $status))
            ->orderByDesc('support_requests.updated_at')->orderByDesc('support_requests.id')->paginate(25, ['support_requests.id', 'topic', 'subject', 'support_requests.status', 'support_requests.updated_at', 'users.name'])->withQueryString(), 'statusFilter' => $filter['status'] ?? '', 'statuses' => SupportTopics::STATUSES]);
    }

    public function adminShow(Request $request, int $ticket) { return Inertia::render('admin/SupportRequestDetails', [...$this->detail($request, $ticket), 'statuses' => SupportTopics::STATUSES]); }

    public function reply(Request $request, int $ticket)
    {
        $data = $request->validate(['body' => ['nullable', 'string', 'max:5000'], 'submission_key' => ['required', 'uuid'], 'status' => ['required', Rule::in(SupportTopics::STATUSES)]]);
        DB::transaction(function () use ($request, $ticket, $data): void {
            $row = DB::table('support_requests')->where('id', $ticket)->lockForUpdate()->first();
            abort_unless($row, 404);
            if (DB::table('support_request_replies')->where('support_request_id', $ticket)->where('submission_key', $data['submission_key'])->exists()) return;
            if (filled($data['body'] ?? null)) {
                DB::table('support_request_replies')->insert(['support_request_id' => $ticket, 'author_id' => $request->user()->id, 'is_staff' => true, 'submission_key' => $data['submission_key'], 'body' => $data['body'], 'created_at' => now(), 'updated_at' => now()]);
            }
            DB::table('support_requests')->where('id', $ticket)->update(['status' => $data['status'], 'updated_at' => now()]);
        });
        return to_route('admin.support.show', $ticket)->with('status', 'Support request updated.');
    }
}
