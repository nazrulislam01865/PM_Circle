# AI Resume Assistant — local extraction and template completeness

## Scope
The assistant now uploads a temporary PDF/DOCX to its own authenticated, verified, onboarded, entitled JSON endpoint. The original Resume & imports page, upload endpoint, AI services, profile header and CV template are unchanged. Extraction does not save a source document or update the member profile. It returns a proposed draft and readable source text for explicit review. Applying replaces only detected fields and sections; undetected sections are kept. Account email remains controlled by Edit profile. Save draft and Submit profile retain the existing behavior.

The legacy `throttle:5,10` profile upload route shares a generic authenticated signature with other numeric throttles; the new named per-member limiter has independent limits of 3/minute and 20/hour. The dialog handles 429 (including Retry-After), validation, permissions, expired sessions, upload-size limits, network errors and timeouts without an Inertia error popup. No automatic retries occur. The exact origin of a production 429 still requires server logs.

## Local extraction
Reuses ResumeTextExtractor and adds a conservative template parser. The approved document's heading aliases, date ranges, separated and aligned entry columns, skills, awards, interests and languages are recognized. The original source is available for manual correction. PDF processing covers the first ten pages; DOCX uses bounded ZipArchive reading. Source text is limited to 30,000 characters and fields/entries follow existing validation limits. Scanned PDFs, complex layouts and hidden hyperlink targets may require manual entry or future AI extraction. The temporary upload is not added to the saved document list; existing AI review continues to use previously saved uploads. No AI provider, new tables, queue jobs or extra profile writes are involved.

## Score
Ten equal-weight deterministic completeness checks use the editable CV, not stale profile-derived fields. Optional sections do not cost points if absent. Repeated filler does not meet summary word-diversity thresholds. The checks are not semantic quality, ATS matching or hiring predictions. The existing score card explains its criteria.

## Design
Scoped assistant and modal styling uses existing central typography, control heights, borders, colors and spacing. The shared profile header, navigation, footer, form fields, dialog and progress bar remain reusable. Document-specific preview scaling is unchanged.

## Verification
Node regression suite with `--experimental-strip-types`: 390/391 passed; the unrelated full mock counter assertion failed. Eight targeted builder/score checks passed. PHP lint and TS/TSX transpilation passed. The parser was exercised on text extracted from the supplied DOCX and a corresponding PDF; both yielded matching counts for eight populated template categories. Local PHP lacks mbstring and ZipArchive, so parser-only verification used an iconv test shim for mb_substr, not production code. Full Laravel HTTP/database tests, dependency-backed typecheck, production build and live browser verification remain unverified. Integration tests for authorization and rate limiting are included. No migration required.

## Deploy
Apply the patch to the exact latest Archive 6(1) source. Ensure PHP mbstring/ZipArchive and Poppler pdftotext are available. Run `npm run types:check`, `npm run build`, `php artisan optimize:clear` and restore normal production cache policy. Run `php artisan test --filter=ResumeAssistantBuilderTest` against the test database. Test the assistant with a text-based PDF and DOCX and confirm the review remains in the assistant tab.
