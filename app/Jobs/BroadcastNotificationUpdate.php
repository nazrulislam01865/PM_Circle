<?php

namespace App\Jobs;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use Throwable;

/** Fan out a non-sensitive invalidation signal to both transports independently. */
final class BroadcastNotificationUpdate implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public int $recipientId) {}

    public function handle(): void
    {
        foreach (['pusher', 'reverb'] as $connection) {
            if (! config("broadcasting.connections.{$connection}.key")) continue;
            try {
                Broadcast::connection($connection)->broadcast(
                    [new PrivateChannel('users.'.$this->recipientId)],
                    'notifications.updated',
                    ['refresh' => true],
                );
            } catch (Throwable $exception) {
                // Failures are isolated. Reverb and database polling remain available when Pusher fails.
                Log::warning('Notification broadcast transport unavailable.', [
                    'transport' => $connection, 'exception_type' => $exception::class,
                ]);
            }
        }
    }
}
