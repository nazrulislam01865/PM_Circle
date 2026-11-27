<?php

namespace App\Domain\Community\Jobs;

use App\Domain\Community\Media\CommunityImageVariants;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

final class DeleteCommentMedia implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    public int $tries = 3;
    public function __construct(public array $paths) {}
    public function handle(CommunityImageVariants $variants): void
    {
        // Keep paths still referenced by any comment, including soft-deleted ones.
        $paths = array_filter($this->paths, fn ($path) => is_string($path) && preg_match('~\Acomment-media/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp|gif)\z~iD', $path));
        $referenced = DB::table('comments')->whereIn('media_path', $paths)->pluck('media_path')->all();
        foreach (array_diff($paths, $referenced) as $path) {
            $variants->deleteVariants('local', $path);
            Storage::disk('local')->delete($path);
        }
    }
}
