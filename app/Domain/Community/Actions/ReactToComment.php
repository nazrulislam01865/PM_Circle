<?php

namespace App\Domain\Community\Actions;

use App\Domain\Community\Services\EngagementStats;
use App\Models\Comment;
use App\Models\User;
use App\Support\Community\ReactionIconCatalog;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

final class ReactToComment
{
    /** For legacy /like only, toggle Like. All typed reactions use desired-state semantics. */
    public function execute(User $user, Comment $comment, ?string $type, bool $toggleLike = false): array
    {
        if ($type !== null && ! in_array($type, ReactionIconCatalog::activeTypes(), true)) {
            throw new InvalidArgumentException('Unsupported comment reaction type.');
        }
        return DB::transaction(function () use ($user, $comment, $type, $toggleLike): array {
            EngagementStats::lockReaction($user->id);
            EngagementStats::lockAccessiblePost($comment->post_id, $user);
            $comment = EngagementStats::lockComment($comment);
            abort_unless($comment->isVisible(), 404);
            $query = DB::table('comment_likes')->where('comment_id', $comment->id)->where('user_id', $user->id);
            $old = $query->value('type');
            if ($toggleLike) {
                $type = $old !== null ? null : 'like';
            }
            if ($old !== $type) {
                if ($type === null) {
                    $query->delete();
                } elseif ($old === null) {
                    DB::table('comment_likes')->insert([
                        'comment_id' => $comment->id, 'user_id' => $user->id,
                        'type' => $type, 'created_at' => now(), 'updated_at' => now(),
                    ]);
                } else {
                    $query->update(['type' => $type, 'updated_at' => now()]);
                }
            }

            EngagementStats::applyCommentReaction($comment->id, $old, $type);
            if ($old === null && $type !== null) {
                DB::afterCommit(static fn () => app(\App\Domain\Notifications\ActivityNotifier::class)
                    ->forCommentReaction($user, $comment));
            }
            return ['comment_id' => $comment->id, 'reaction' => $type, ...EngagementStats::commentSummary($comment->id)];
        }, 3);
    }
}
