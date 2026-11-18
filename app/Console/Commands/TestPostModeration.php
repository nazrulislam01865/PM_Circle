<?php

namespace App\Console\Commands;

use App\Domain\AI\Services\PostContentCheckService;
use Illuminate\Console\Command;
use Throwable;

/** Live, read-only provider smoke test; creates no posts or database records. */
final class TestPostModeration extends Command
{
    protected $signature = 'pm:post-check-test
        {--text= : Synthetic sample text to check (never logged)}
        {--image= : Optional local JPEG, PNG or WebP to check}';

    protected $description = 'Check dedicated community moderation API configuration with a live synthetic request';

    public function handle(PostContentCheckService $checker): int
    {
        $text = $this->option('text');
        $text = is_string($text) && $text !== ''
            ? $text : 'This is a routine project management update about our delivery schedule.';
        $bytes = null;
        $mime = null;
        $path = $this->option('image');
        if (is_string($path) && $path !== '') {
            if (! is_file($path) || ! is_readable($path) || filesize($path) > 5 * 1024 * 1024) {
                $this->error('Image must be a readable local file up to 5 MB.');
                return self::FAILURE;
            }
            $mime = mime_content_type($path);
            if (! in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
                $this->error('Image must be JPEG, PNG or WebP.');
                return self::FAILURE;
            }
            $bytes = file_get_contents($path);
            if ($bytes === false) {
                $this->error('Unable to read image.');
                return self::FAILURE;
            }
        }

        try {
            $model = PostContentCheckService::selectedModel();
            $result = $checker->inspect($text, $bytes, $mime);
        } catch (Throwable $exception) {
            // Never print HTTP bodies, request content, or credentials.
            $safeCodes = [
                'POST_CHECK_NOT_CONFIGURED', 'POST_CHECK_INVALID_PROVIDER',
                'MODEL_NOT_ALLOWLISTED', 'POST_CHECK_INVALID_IMAGE',
                'POST_CHECK_INVALID_INPUT', 'POST_CHECK_KEY_DENIED',
                'POST_CHECK_RATE_LIMITED', 'POST_CHECK_PROVIDER_UNAVAILABLE',
                'POST_CHECK_MODERATION_UNAVAILABLE', 'POST_CHECK_MODERATION_DENIED',
                'POST_CHECK_MODERATION_INVALID', 'POST_CHECK_INVALID_RESULT',
            ];
            $code = $exception->getMessage();
            $this->error('Moderation smoke test failed: '.(in_array($code, $safeCodes, true)
                ? $code : 'POST_CHECK_UNEXPECTED_ERROR'));
            return self::FAILURE;
        }
        $this->info('Moderation request succeeded.');
        $this->line('Model: '.$model);
        $this->line('Decision: '.($result['violates'] ? 'restricted'
            : ($result['needs_review'] ? 'pending_review' : 'approved')));
        $this->line('Category: '.$result['category']);
        $this->line('Target: '.$result['target']);
        $this->line('This command does not create posts or run queue jobs.');
        return self::SUCCESS;
    }
}
