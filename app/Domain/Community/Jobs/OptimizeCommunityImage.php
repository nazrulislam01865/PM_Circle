<?php

namespace App\Domain\Community\Jobs;

use App\Domain\Community\Media\CommunityImageVariants;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/** Replace an oversized upload with one optimized image, then generate responsive previews. */
final class OptimizeCommunityImage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 90;

    public function __construct(public string $disk, public string $path) {}

    public function handle(CommunityImageVariants $variants): void
    {
        if (! config('community.media_variants_enabled', true)
            || ! $variants->allowed($this->disk, $this->path)
            || ! extension_loaded('gd') || ! function_exists('imagewebp')) {
            return;
        }

        // Existing WebP uploads are left alone. Animated formats must not be flattened.
        $ext = strtolower(pathinfo($this->path, PATHINFO_EXTENSION));
        if (! in_array($ext, ['jpg', 'jpeg', 'png'], true)) {
            return;
        }
        $storage = Storage::disk($this->disk);
        if (! $storage->exists($this->path)) {
            return;
        }
        $source = $storage->path($this->path);
        $info = @getimagesize($source);
        if (! is_array($info) || ! isset($info[0], $info[1]) || $info[0] < 1 || $info[1] < 1
            || $info[0] * $info[1] > (int) config('community.media_variants_max_pixels', 12000000)
            || ! in_array($info['mime'] ?? '', $ext === 'png' ? ['image/png'] : ['image/jpeg'], true)) {
            return;
        }

        // A checksum marker prevents repeated JPEG encoding on queue retries and backfills.
        $marker = $variants->optimizationMarkerPath($this->path);
        $beforeHash = hash_file('sha256', $source);
        if ($beforeHash !== false && $storage->exists($marker)
            && trim($storage->get($marker)) === $beforeHash) {
            return;
        }

        $orientation = 1;
        if ($ext !== 'png') {
            if (! function_exists('exif_read_data')) {
                return; // Do not risk displaying a rotated phone photo.
            }
            $exif = @exif_read_data($source);
            $orientation = is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;
            if ($orientation < 1 || $orientation > 8) {
                return;
            }
        }

        $image = $ext === 'png' ? @imagecreatefrompng($source) : @imagecreatefromjpeg($source);
        if (! $image instanceof \GdImage) {
            return;
        }
        try {
            if ($orientation !== 1) {
                $oriented = $this->orient($image, $orientation);
                if (! $oriented instanceof \GdImage) {
                    return;
                }
                $image = $oriented;
            }

            $width = imagesx($image);
            $height = imagesy($image);
            $limit = max(640, min(4096, (int) config('community.media_max_dimension', 2048)));
            $scale = min(1, $limit / max($width, $height));
            $targetWidth = max(1, (int) round($width * $scale));
            $targetHeight = max(1, (int) round($height * $scale));
            $resized = $scale < 1;

            $display = $image;
            if ($resized) {
                $display = imagecreatetruecolor($targetWidth, $targetHeight);
                if (! $display) {
                    return;
                }
                $this->enableAlpha($display);
                if (! imagecopyresampled($display, $image, 0, 0, 0, 0,
                    $targetWidth, $targetHeight, $width, $height)) {
                    imagedestroy($display);
                    return;
                }
            }
            try {
                $temporary = tempnam(dirname($source), 'pm-image-');
                if ($temporary === false) {
                    throw new RuntimeException('Cannot create temporary optimized image.');
                }
                try {
                    $quality = min(100, max(80, (int) config('community.media_variants_quality', 92)));
                    $encoded = $ext === 'png'
                        ? @imagepng($display, $temporary, 8)
                        : @imagejpeg($display, $temporary, $quality);
                    if (! $encoded || ! filesize($temporary)) {
                        throw new RuntimeException('Image optimization failed.');
                    }
                    // A smaller already-optimized upload may be better than re-encoding it.
                    $shouldReplace = $resized || $orientation !== 1
                        || filesize($temporary) < filesize($source);
                    if ($shouldReplace) {
                        @chmod($temporary, (fileperms($source) & 0777) ?: 0644);
                        if (! @rename($temporary, $source)) {
                            throw new RuntimeException('Cannot replace image atomically.');
                        }
                    }
                } finally {
                    @unlink($temporary);
                }

                // If an existing upload changed at the same path, discard its stale variants.
                $variants->deleteVariants($this->disk, $this->path);
                foreach (CommunityImageVariants::WIDTHS as $variantWidth) {
                    if ($variantWidth >= $targetWidth) {
                        continue;
                    }
                    $variantHeight = max(1, (int) round($targetHeight * $variantWidth / $targetWidth));
                    $preview = imagecreatetruecolor($variantWidth, $variantHeight);
                    if (! $preview) {
                        continue;
                    }
                    try {
                        $this->enableAlpha($preview);
                        if (! imagecopyresampled($preview, $display, 0, 0, 0, 0,
                            $variantWidth, $variantHeight, $targetWidth, $targetHeight)) {
                            continue;
                        }
                        $tmp = tempnam(sys_get_temp_dir(), 'pm-img-');
                        if ($tmp === false) {
                            continue;
                        }
                        try {
                            if (! @imagewebp($preview, $tmp, $quality) || ! filesize($tmp)
                                || filesize($tmp) >= filesize($source)) {
                                continue;
                            }
                            $stream = fopen($tmp, 'rb');
                            if ($stream !== false) {
                                try {
                                    $storage->put($variants->variantPath($this->path, $variantWidth), $stream);
                                } finally {
                                    fclose($stream);
                                }
                            }
                        } finally {
                            @unlink($tmp);
                        }
                    } finally {
                        imagedestroy($preview);
                    }
                }
                // This is the only retained full-size file: the optimized replacement.
                $hash = hash_file('sha256', $source);
                if ($hash !== false) {
                    $storage->put($marker, $hash);
                }
            } finally {
                if ($display !== $image) {
                    imagedestroy($display);
                }
            }
        } finally {
            imagedestroy($image);
        }
    }

    private function enableAlpha(\GdImage $image): void
    {
        imagealphablending($image, false);
        imagesavealpha($image, true);
        imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
    }

    private function orient(\GdImage $image, int $orientation): \GdImage|false
    {
        if (in_array($orientation, [2, 4, 5, 7], true)) {
            imageflip($image, $orientation === 4 ? IMG_FLIP_VERTICAL : IMG_FLIP_HORIZONTAL);
        }
        $degrees = match ($orientation) {
            3 => 180, 5, 8 => 90, 6, 7 => -90, default => 0,
        };
        if ($degrees === 0) {
            return $image;
        }
        $rotated = imagerotate($image, $degrees, 0);
        if ($rotated instanceof \GdImage) {
            imagedestroy($image);
        }
        return $rotated;
    }
}
