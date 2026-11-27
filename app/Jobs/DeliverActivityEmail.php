<?php

namespace App\Jobs;

use App\Domain\Notifications\ActivityPreferences;
use App\Mail\ActivityUpdate;
use App\Models\User;
use App\Services\Email\EmailService;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/** Claim a bounded batch before transport; uncertain sends are never replayed automatically. */
final class DeliverActivityEmail implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, Queueable;

    public int $tries = 1;
    public int $timeout = 45;
    public int $uniqueFor = 600;

    public function __construct(public int $recipientId, public string $dueAt) {}

    public function uniqueId(): string
    {
        return $this->recipientId.':'.$this->dueAt;
    }

    public function handle(EmailService $email): void
    {
        $rows = DB::transaction(function () {
            $rows = DB::table('notifications')->where('notifiable_type', User::class)
                ->where('notifiable_id', $this->recipientId)->where('email_due_at', $this->dueAt)
                ->where('email_due_at', '<=', now())->where('email_status', 'pending')
                ->orderBy('created_at')->orderBy('id')->limit(50)->lockForUpdate()->get(['id', 'event_key', 'data']);
            if ($rows->isNotEmpty()) DB::table('notifications')->whereIn('id', $rows->pluck('id'))->update(['email_status' => 'claimed']);
            return $rows;
        });
        if ($rows->isEmpty()) return;
        $recipient = User::query()->whereKey($this->recipientId)->where('status', 'active')->first(['id', 'email', 'email_verified_at', 'account_preferences']);
        $preferences = $recipient?->account_preferences ?? [];
        $now = CarbonImmutable::now('UTC');
        $items = [];
        $ids = [];
        if ($recipient?->email_verified_at && ($preferences['mail'] ?? false) && ($preferences['digest'] ?? 'Instant') !== 'Off') {
            foreach ($rows as $row) {
                if (! ActivityPreferences::allows($preferences, $row->event_key, $now)) continue;
                $data = json_decode($row->data, true);
                $path = $data['url'] ?? '';
                if (! is_string($path) || ! str_starts_with($path, '/') || str_starts_with($path, '//')) continue;
                $items[] = ['message' => (string) ($data['message'] ?? ''), 'url' => rtrim(config('app.url'), '/').$path];
                $ids[] = $row->id;
            }
        }
        $skipped = $rows->pluck('id')->diff($ids);
        if ($skipped->isNotEmpty()) DB::table('notifications')->whereIn('id', $skipped)->update(['email_status' => 'skipped']);
        if ($items === []) return;
        try {
            if (! app()->environment('testing') && config('transactional-mail.provider') === 'laravel' && in_array(config('mail.default'), ['log', 'array'], true)) {
                throw new \RuntimeException('Email delivery is not configured.');
            }
            $email->send($recipient->email, new ActivityUpdate($items));
            DB::table('notifications')->whereIn('id', $ids)->update(['email_status' => 'sent']);
        } catch (Throwable $exception) {
            DB::table('notifications')->whereIn('id', $ids)->update(['email_status' => 'unknown']);
            Log::warning('Optional activity email could not be confirmed.', ['exception_type' => $exception::class]);
        }
    }
}
