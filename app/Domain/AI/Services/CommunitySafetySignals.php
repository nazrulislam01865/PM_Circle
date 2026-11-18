<?php

namespace App\Domain\AI\Services;

use Illuminate\Support\Facades\DB;

/** Bounded indicators for the AI reviewer, never automatic violations or strikes. */
final class CommunitySafetySignals
{
    /** @return array<string, int|bool> */
    public function forText(string $text, int $authorId, ?int $postId = null, ?int $commentId = null): array
    {
        $text = mb_substr(trim($text), 0, 5500);
        $ascii = mb_strtolower($text);
        $compact = preg_replace('/[\s\p{P}\p{Z}\x{200B}-\x{200D}\x{FEFF}]+/u', '', $ascii) ?? $ascii;
        // A deliberately small, illustrative lexicon. Never block solely on a match:
        // quotation, criticism, and colloquial language are often legitimate.
        $examples = ['harami', 'shala', 'sala', 'madarchod', 'banchod', 'হারামি', 'শালা', 'গাধা'];
        $possibleInsult = false;
        foreach ($examples as $word) {
            if (str_contains($compact, $word)) {
                $possibleInsult = true;
                break;
            }
        }
        $links = preg_match_all('~https?://[^\s<>]+~iu', $text);
        $repeatCount = 0;
        if (mb_strlen($text) >= 20 && $authorId > 0) {
            $repeatCount = DB::table('posts')->where('author_id', $authorId)
                ->where('body', $text)->where('created_at', '>=', now()->subDay())
                ->when($postId, fn ($query) => $query->where('id', '!=', $postId))
                ->limit(11)->pluck('id')->count();
        }
        $commentRepeats = 0;
        if (mb_strlen($text) >= 20 && $authorId > 0) {
            $commentRepeats = DB::table('comments')->where('author_id', $authorId)
                ->where('body', $text)->where('created_at', '>=', now()->subDay())
                ->when($commentId, fn ($query) => $query->where('id', '!=', $commentId))
                ->limit(11)->pluck('id')->count();
        }
        return [
            'same_author_exact_comment_repeats_24h' => min(10, $commentRepeats),
            'possible_disguised_insult' => $possibleInsult,
            'link_count' => min(20, (int) $links),
            'contains_contact_number' => (bool) preg_match('/(?:\+?\d[\s().-]?){9,15}/u', $text),
            'mentions_otp_or_credentials' => (bool) preg_match('/\b(?:otp|one.time.pass(?:word|code)|password|login|verification.code)\b|ওটিপি|পাসওয়ার্ড|লগইন/iu', $text),
            'mentions_advance_payment' => (bool) preg_match('/\b(?:advance.payment|pay.first|send.money|bkash|nagad)\b|অগ্রিম|আগে টাকা|বিকাশ|নগদ/iu', $text),
            'same_author_exact_post_repeats_24h' => min(10, $repeatCount),
        ];
    }
}
