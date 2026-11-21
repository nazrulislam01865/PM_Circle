<?php

namespace App\Console\Commands;

use App\Domain\Community\Media\CommunityImageVariants;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/** On-demand only: no per-feed queries or recurring scan. Rewrites eligible originals in place. */
final class BackfillCommunityImageVariants extends Command
{
    protected $signature = 'community:images-backfill
        {--limit=1000 : Maximum number of published attachments to enqueue}
        {--replace-originals : Acknowledge that existing published images will be overwritten}
        {--after-post=0 : Resume after this post ID}
        {--after-comment=0 : Resume after this comment ID}';

    protected $description = 'Optimize existing published images and queue responsive previews';

    public function handle(CommunityImageVariants $variants): int
    {
        if (! $this->option('replace-originals')) {
            $this->error('This command overwrites existing full-resolution files. Back up your media, then add --replace-originals to proceed.');
            return self::FAILURE;
        }

        $limit = filter_var($this->option('limit'), FILTER_VALIDATE_INT);
        if (! is_int($limit) || $limit < 1 || $limit > 10000) {
            $this->error('The limit must be between 1 and 10000.');
            return self::FAILURE;
        }

        $afterPost = filter_var($this->option('after-post'), FILTER_VALIDATE_INT);
        $afterComment = filter_var($this->option('after-comment'), FILTER_VALIDATE_INT);
        if (! is_int($afterPost) || ! is_int($afterComment) || $afterPost < 0 || $afterComment < 0) {
            $this->error('Resume IDs must be non-negative integers.');
            return self::FAILURE;
        }

        $queued = 0;
        DB::table('posts')->where('id', '>', $afterPost)->where('status', 'published')->whereNull('deleted_at')
            ->whereNotNull('image_path')
            ->select('id', 'visibility', 'image_path')
            ->orderBy('id')->chunkById(100, function ($posts) use ($variants, $limit, &$queued, &$afterPost): bool {
                foreach ($posts as $post) {
                    $afterPost = $post->id;
                    $name = basename((string) parse_url($post->image_path, PHP_URL_PATH));
                    $disk = $post->visibility === 'members' ? 'local' : 'public';
                    $path = ($disk === 'local' ? 'post-images-private/' : 'post-images/').$name;
                    $url = (string) $post->image_path;
                    $expected = $disk === 'local'
                        ? '/posts/'.$post->id.'/media/'.$name : '/post-media/'.$name;
                    $legacy = $disk === 'public' && preg_match(
                        '~\A/?(?:storage/)?post-images/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp)\z~iD', $url,
                    );
                    if ($variants->allowed($disk, $path) && ($url === $expected || $legacy)) {
                        $variants->queue($disk, $path);
                        $queued++;
                    }
                    if ($queued >= $limit) return false;
                }
                return true;
            });

        if ($queued < $limit) {
            DB::table('comments')->where('comments.id', '>', $afterComment)->join('posts', 'posts.id', '=', 'comments.post_id')
                ->where('posts.status', 'published')->whereNull('posts.deleted_at')
                ->whereNull('comments.deleted_at')
                ->where(fn ($query) => $query->whereNull('comments.check_status')
                    ->orWhere('comments.check_status', 'approved'))
                ->whereNotNull('comments.media_path')
                ->select('comments.id', 'comments.media_path')
                ->orderBy('comments.id')->chunkById(100, function ($comments) use ($variants, $limit, &$queued, &$afterComment): bool {
                    foreach ($comments as $comment) {
                        $afterComment = $comment->id;
                        $variants->queue('local', $comment->media_path);
                        $queued++;
                        if ($queued >= $limit) return false;
                    }
                    return true;
                }, 'comments.id', 'id');
        }
        $this->info("Queued up to {$queued} published attachments. Resume with --after-post={$afterPost} --after-comment={$afterComment} if necessary.");
        return self::SUCCESS;
    }
}
