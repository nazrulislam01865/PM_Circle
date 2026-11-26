<?php

namespace App\Domain\Notifications;

use App\Jobs\BroadcastNotificationUpdate;
use App\Models\Comment;
use App\Models\Post;
use App\Models\ScenarioResponse;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/** Persist user activity once; WebSockets are optional delivery, never the source of truth. */
final class ActivityNotifier
{
    public function forFollow(User $follower, User $followed): void
    {
        $this->send($followed->id, $follower->id, 'follow:'.$follower->id,
            'follow', $follower->name.' started following you.', route('members.show', $follower->id, false));
    }

    public function forPostReaction(User $actor, Post $post): void
    {
        if ($post->status !== 'published' || $post->notifications_muted_at) return;
        $this->send($post->author_id, $actor->id, 'post-reaction:'.$post->id.':'.$actor->id,
            'reaction', $actor->name.' reacted to your post.', route('posts.show', $post->id, false));
    }

    public function forComment(Comment $comment, ?string $actorName = null): void
    {
        if (! $comment->isVisible() || $comment->trashed()) return;
        $comment->loadMissing('post:id,author_id,status,notifications_muted_at');
        $post = $comment->post;
        if (! $post || $post->status !== 'published' || $post->notifications_muted_at) return;
        $recipientId = $comment->parent_id
            ? (int) Comment::query()->whereKey($comment->parent_id)->value('author_id')
            : (int) $post->author_id;
        if ($recipientId === $comment->author_id) return;
        $name = $actorName ?? User::query()->whereKey($comment->author_id)->value('name') ?? 'A member';
        $this->send($recipientId, $comment->author_id, 'comment:'.$comment->id,
            $comment->parent_id ? 'reply' : 'comment',
            $name.($comment->parent_id ? ' replied to your comment.' : ' commented on your post.'),
            route('posts.show', $post->id, false).'#comment-'.$comment->id);
    }

    public function forCommentReaction(User $actor, Comment $comment): void
    {
        if (! $comment->isVisible() || $comment->trashed()) return;
        $comment->loadMissing('post:id,status,notifications_muted_at');
        if (! $comment->post || $comment->post->status !== 'published' || $comment->post->notifications_muted_at) return;
        $this->send($comment->author_id, $actor->id, 'comment-reaction:'.$comment->id.':'.$actor->id,
            'reaction', $actor->name.' reacted to your comment.',
            route('posts.show', $comment->post_id, false).'#comment-'.$comment->id);
    }

    public function forScenarioReply(User $actor, ScenarioResponse $reply, int $recipientId, string $scenarioSlug): void
    {
        $this->send($recipientId, $actor->id, 'scenario-reply:'.$reply->id, 'reply',
            $actor->name.' replied to your challenge response.', route('scenarios.show', $scenarioSlug, false));
    }

    public function forScenarioReaction(User $actor, ScenarioResponse $response, string $scenarioSlug): void
    {
        $this->send($response->user_id, $actor->id, 'scenario-reaction:'.$response->id.':'.$actor->id,
            'reaction', $actor->name.' reacted to your challenge response.',
            route('scenarios.show', $scenarioSlug, false));
    }

    private function send(int $recipientId, int $actorId, string $eventKey, string $type, string $message, string $url): void
    {
        if ($recipientId <= 0 || $recipientId === $actorId) return;

        try {
            // Only optional social activity uses these preferences; transactional mail and admin alerts are untouched.
            $recipient = User::query()->whereKey($recipientId)->first(['id', 'account_preferences']);
            if (! $recipient) return;
            $preferences = $recipient->account_preferences ?? [];
            $challenge = str_starts_with($eventKey, 'scenario-');
            if (($preferences['inapp'] ?? true) === false
                || ($preferences[$challenge ? 'challengeNotify' : 'communityNotify'] ?? true) === false) return;
            if (($preferences['quiet'] ?? false) === true) {
                $start = $preferences['quietStart'] ?? '22:00';
                $end = $preferences['quietEnd'] ?? '07:00';
                $zone = $preferences['timezone'] ?? 'Asia/Dhaka';
                $time = now($zone)->format('H:i');
                if ($start !== $end && ($start < $end ? $time >= $start && $time < $end : $time >= $start || $time < $end)) return;
            }
            // Database-level uniqueness protects against double requests and retried moderation jobs.
            $inserted = DB::table('notifications')->insertOrIgnore([
                'id' => (string) Str::uuid(),
                'type' => $type,
                'notifiable_type' => User::class,
                'notifiable_id' => $recipientId,
                'event_key' => $eventKey,
                'data' => json_encode(['message' => $message, 'url' => $url], JSON_THROW_ON_ERROR),
                'read_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            if ($inserted > 0) {
                BroadcastNotificationUpdate::dispatch($recipientId)->onQueue('default');
            }
        } catch (Throwable $exception) {
            // A notification transport or migration issue must never invalidate a completed social action.
            Log::warning('Member notification could not be persisted.', ['exception_type' => $exception::class]);
        }
    }
}
