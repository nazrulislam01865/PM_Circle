<?php

namespace App\Domain\Community\Media;

use App\Domain\Community\Jobs\OptimizeCommunityImage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Uploaded images are replaced by a high-quality optimized file at the same path.
 * Derived feed images remain optional and the existing access checks are unchanged.
 * The existing, permission-checked media routes decide who can read either file.
 */
final class CommunityImageVariants
{
    public const WIDTHS = [320, 640, 1200];

    public function queue(string $disk, ?string $path): void
    {
        if (! config('community.media_variants_enabled', true) || ! $path || ! $this->allowed($disk, $path)) {
            return;
        }

        try {
            OptimizeCommunityImage::dispatch($disk, $path)
                ->onQueue((string) config('community.media_variants_queue', 'default'));
        } catch (\Throwable $exception) {
            // Posting must not fail just because optional background optimization is offline.
            Log::warning('Community media variant could not be queued', [
                'disk' => $disk, 'error' => $exception->getMessage(),
            ]);
        }
    }

    public function allowed(string $disk, string $path): bool
    {
        $folder = match ($disk) {
            'public' => 'post-images',
            'local' => null,
            default => false,
        };
        if ($folder === false) {
            return false;
        }
        $pattern = '~\A(?:'.($folder ?: 'post-images-private|comment-media').')/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp)\z~iD';

        return (bool) preg_match($pattern, $path);
    }

    public function optimizationMarkerPath(string $path): string
    {
        return $path.'.optimized';
    }

    public function variantPath(string $original, int $width): string
    {
        return $original.'.w'.$width.'.webp';
    }

    /** The variant is selected only AFTER the original route's authorization checks. */
    public function response(string $diskName, string $path, ?int $width, bool $public): BinaryFileResponse
    {
        $disk = Storage::disk($diskName);
        abort_unless($disk->exists($path), 404);
        $variant = $width && in_array($width, self::WIDTHS, true)
            && config('community.media_variants_enabled', true)
            && $this->allowed($diskName, $path)
            ? $this->variantPath($path, $width) : null;
        $optimized = $variant && $disk->exists($variant);
        $selected = $optimized ? $variant : $path;
        $ext = strtolower(pathinfo($selected, PATHINFO_EXTENSION));

        return response()->file($disk->path($selected), [
            'Content-Type' => match ($ext) {
                'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif', default => 'image/jpeg',
            },
            'Content-Disposition' => 'inline',
            'Cache-Control' => $public
                ? ($width && ! $optimized ? 'public, max-age=60' : 'public, max-age=3600')
                : 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function deleteVariants(string $diskName, string $path): void
    {
        if (! $this->allowed($diskName, $path)) {
            return;
        }
        $disk = Storage::disk($diskName);
        $disk->delete([...array_map(fn (int $width) => $this->variantPath($path, $width), self::WIDTHS), $this->optimizationMarkerPath($path)]);
    }
}
