<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Domain\Community\Services\EngagementStats;
use App\Jobs\AnalyzeProfileResume;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Domain\Billing\Services\ProfileCompletionRewardService;
use App\Domain\Identity\Services\ProfileCompleteness;
use App\Domain\Identity\Services\ProfileFieldPrivacy;
use App\Services\Resume\ApplyProfileImport;
use App\Services\Resume\ProfileImportPresenter;
use App\Services\Resume\ResumeTextExtractor;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\Experience;
use App\Models\Profile;
use App\Models\ProfileImportSession;
use App\Models\ProfileResume;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProfileController extends Controller
{
    /**
     * Show the user's profile suite page with sub-navigation tabs:
     * - overview (p3.png)
     * - edit (p1.png)
     * - imports (p2.png)
     * - privacy
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $activeTab = $request->query('tab', 'overview');
        if (! in_array($activeTab, ['overview', 'edit', 'imports', 'privacy'], true)) {
            $activeTab = 'overview';
        }
        $user->loadMissing(match ($activeTab) {
            'imports' => ['profile', 'certifications', 'experiences', 'educations', 'profileProjects'],
            'privacy' => ['profile'],
            default => ['profile', 'certifications', 'experiences', 'profileProjects', 'educations'],
        });

        $profile = $user->profile ?? new Profile();

        // Edit and overview always use this member's persisted records.
        // Relations are eager-loaded above; do not add per-card queries.
        $experiences = $activeTab === 'privacy' ? collect() : $user->experiences->values();
        $projects = in_array($activeTab, ['imports', 'privacy'], true) ? collect() : $user->profileProjects->values();
        $featuredProject = $projects->firstWhere('is_featured', true) ?? $projects->first();
        $educations = $activeTab === 'privacy' ? collect() : $user->educations->values();
        $certifications = ($activeTab === 'privacy' ? collect() : $user->certifications)->map(fn ($entry) => [
            'id' => $entry->id,
            'name' => $entry->name,
            'credential_number' => $entry->credential_number,
            'valid_until' => $entry->valid_until,
            'verified' => (bool) $entry->verified,
            'status_label' => ($entry->valid_until ? 'Valid until '.$entry->valid_until.' · ' : '').($entry->verified ? 'Verified' : 'Self-reported'),
        ])->values();
        $latestResume = in_array($activeTab, ['overview', 'imports'], true)
            ? $user->resumes()->first() : null;
        $resumeData = $latestResume ? [
            'id' => $latestResume->id,
            'original_name' => $latestResume->original_name,
            'file_size' => $latestResume->file_size,
            'file_size_formatted' => number_format($latestResume->file_size / 1024, 0).' KB',
            'mime_type' => $latestResume->mime_type,
            'updated_at' => $latestResume->updated_at?->format('M d, Y') ?? 'Recently',
            'is_demo' => false,
        ] : null;
        $skills = $profile->skills ?? [];

        // Limit import history. Build comparisons solely from this member's stored extracted values.
        $recentImports = $activeTab === 'imports'
            ? $user->importSessions()->limit(6)->get()
            : collect();
        $activeImport = $activeTab === 'imports'
            ? app(ProfileImportPresenter::class)->present($user, $recentImports->first(), $recentImports)
            : ['id' => null, 'status' => 'empty', 'step' => 1, 'filename' => null, 'comparisons' => [], 'warnings' => [], 'history' => [], 'ai_enabled' => (bool) config('pm-ai.resume_extract_enabled')];

        // The dashboard and profile must use the exact same server-side criteria.
        $completenessScore = app(ProfileCompleteness::class)->percentage($user);

        $stats = $activeTab === 'overview' ? app(\App\Domain\Dashboard\Queries\MemberDashboardStats::class)->forMember($user) : null;
        $plan = app(\App\Domain\Billing\Queries\CurrentMemberPlan::class)->code($user);

        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'activeTab' => $activeTab,
            'privacyFieldGroups' => $activeTab === 'privacy' ? ProfileFieldPrivacy::groups() : [],
            'profileReward' => app(ProfileCompletionRewardService::class)->forMember($user, $completenessScore),
            'profileData' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'headline' => $profile->headline ?? '',
                'role' => $profile->role ?? '',
                'phone' => $profile->phone ?? '',
                'industry' => $profile->industry ?? '',
                'country' => $profile->country ?? '',
                'city' => $profile->city ?? '',
                'about' => $profile->about ?? '',
                'skills' => $skills,
                'cover_photo_path' => $profile->cover_photo_path,
                'avatar_path' => $profile->avatar_path,
                'open_to_opportunities' => $profile->open_to_opportunities ?? true,
                'visibility' => $profile->visibility ?: 'members_only',
                'field_visibility' => $activeTab === 'privacy' ? ProfileFieldPrivacy::choices($profile) : [],
                'resume_employer_visibility' => $profile->resume_employer_visibility ?? true,
                'contact_visibility' => $profile->contact_visibility ?: 'private',
                'linkedin_url' => $profile->linkedin_url ?? '',
                'languages' => $profile->languages ?? [],
                'editor_details' => in_array($activeTab, ['edit', 'overview'], true) ? ($profile->editor_details ?? []) : [],
                'plan_label' => ucfirst($plan).' member',
                'location_label' => implode(', ', array_filter([$profile->city, $profile->country])),
                'status_label' => $profile->open_to_opportunities ? 'Open to opportunities' : 'Not actively looking',
                'completeness' => $completenessScore,
                'insights' => [
                    'views' => $stats['overview']['insights']['last30'] ?? 0,
                    'change' => (string) ($stats['overview']['insights']['thisWeek'] ?? 0),
                    'period' => 'views in the last 7 days',
                ],
                'learning_stats' => [
                    'activities' => ($stats['learning']['completedActivities'] ?? 0) + ($stats['learning']['scenarios'] ?? 0),
                    'hours' => round(($stats['learning']['minutes'] ?? 0) / 60, 1),
                    'achievements' => count($stats['overview']['badges'] ?? []),
                ],
                'experiences' => $experiences,
                'featured_project' => $featuredProject,
                'projects' => $projects,
                'educations' => $educations,
                'certifications' => $certifications,
                'resume' => $resumeData,
                'import' => $activeImport,
            ],
        ]);
    }

    /**
     * Update basic profile and settings.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        if (array_key_exists('editor_details', $validated)) {
            app(\App\Domain\Identity\Services\ProfileEditorSaveService::class)->save($user, $validated);
            Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile details updated successfully.')]);

            return redirect()->route('profile.edit', ['tab' => 'edit']);
        }

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }

        if (isset($validated['email']) && $validated['email'] !== $user->email) {
            $user->email = $validated['email'];
            $user->email_verified_at = null;
        }

        if ($user->isDirty()) {
            $user->save();
        }

        // Update profile model attributes
        $profile = $user->profile ?? new Profile(['user_id' => $user->id]);
        $profile->user_id = $user->id;

        foreach ([
            'headline',
            'phone',
            'role',
            'industry',
            'country',
            'city',
            'about',
            'skills',
            'open_to_opportunities',
            'visibility',
            'resume_employer_visibility',
            'contact_visibility',
            'field_visibility',
            'linkedin_url',
            'languages',
        ] as $field) {
            if (array_key_exists($field, $validated)) {
                $profile->{$field} = $validated[$field];
            }
        }

        $profile->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile details updated successfully.')]);

        if ($request->has('tab')) {
            return redirect()->route('profile.edit', ['tab' => $request->input('tab')]);
        }

        return redirect()->route('profile.edit');
    }

    /**
     * Save or update an experience entry.
     */
    public function saveExperience(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'id' => ['nullable', 'integer'],
            'job_title' => ['required', 'string', 'max:150'],
            'organization' => ['required', 'string', 'max:150'],
            'employment_type' => ['required', 'string', 'max:50'],
            'start_date' => ['required', 'string', 'max:50'],
            'end_date' => ['nullable', 'string', 'max:50'],
            'is_current' => ['boolean'],
            'responsibilities' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user();
        if (! empty($validated['id'])) {
            $experience = Experience::where('user_id', $user->id)->where('id', $validated['id'])->firstOrFail();
            $experience->update($validated);
        } else {
            Experience::create([
                'user_id' => $user->id,
                ...$validated,
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Experience saved successfully.')]);

        return redirect()->route('profile.edit', ['tab' => 'edit']);
    }

    /**
     * Delete an experience entry.
     */
    public function deleteExperience(Experience $experience, Request $request): RedirectResponse
    {
        if ($experience->user_id !== $request->user()->id) {
            abort(403);
        }

        $experience->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Experience entry deleted.')]);

        return redirect()->route('profile.edit', ['tab' => 'edit']);
    }

    /** Serve only previously validated, publicly displayable profile images. */
    public function showProfileImage(string $kind, string $filename): BinaryFileResponse
    {
        abort_unless(in_array($kind, ['avatar', 'cover'], true) && preg_match('/\A[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)\z/iD', $filename), 404);
        $directory = $kind === 'avatar' ? 'profile-avatars' : 'profile-covers';
        $path = $directory.'/'.$filename;
        abort_unless(Storage::disk('public')->exists($path), 404);

        return response()->file(Storage::disk('public')->path($path), [
            'Cache-Control' => 'public, max-age=86400, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Upload cover banner photo.
     */
    public function uploadCover(Request $request): RedirectResponse
    {
        $request->validate([
            'cover_photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $user = $request->user();
        $path = $request->file('cover_photo')->store('profile-covers', 'public');
        abort_unless(is_string($path) && $path !== '', 500, 'Cover image could not be stored.');

        $profile = $user->profile ?? new Profile(['user_id' => $user->id]);
        $previous = $profile->getRawOriginal('cover_photo_path');
        $profile->user_id = $user->id;
        $profile->cover_photo_path = '/storage/'.$path;
        try {
            $profile->save();
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($path);
            throw $exception;
        }
        // Keep an already-loaded member profile in sync for Inertia shared props.
        // No additional read query is necessary after the successful save.
        $user->setRelation('profile', $profile);

        if ($previous && str_starts_with($previous, '/storage/profile-covers/')) {
            Storage::disk('public')->delete(substr($previous, strlen('/storage/')));
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Cover banner updated successfully.')]);

        return redirect()->route('profile.edit', ['tab' => $request->input('tab', 'edit')]);
    }

    /**
     * Upload profile avatar photo.
     */
    public function uploadAvatar(Request $request): RedirectResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $user = $request->user();
        $path = $request->file('avatar')->store('profile-avatars', 'public');
        abort_unless(is_string($path) && $path !== '', 500, 'Profile image could not be stored.');

        $profile = $user->profile ?? new Profile(['user_id' => $user->id]);
        $previous = $profile->getRawOriginal('avatar_path');
        $profile->user_id = $user->id;
        $profile->avatar_path = '/storage/'.$path;
        try {
            $profile->save();
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($path);
            throw $exception;
        }
        // The authenticated user may have cached an empty profile before upload.
        // Refresh the relationship in memory so subsequent page props see this photo.
        $user->setRelation('profile', $profile);

        if ($previous && str_starts_with($previous, '/storage/profile-avatars/')) {
            Storage::disk('public')->delete(substr($previous, strlen('/storage/')));
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Avatar photo updated successfully.')]);

        return redirect()->route('profile.edit', ['tab' => $request->input('tab', 'edit')]);
    }

    /**
     * Remove only the authenticated member's avatar.
     */
    public function removeAvatar(Request $request): RedirectResponse
    {
        $user = $request->user();
        $profile = $user->profile;

        if ($profile && $profile->avatar_path) {
            $storedPath = $profile->getRawOriginal('avatar_path');
            $profile->avatar_path = null;
            $profile->save();
            $user->setRelation('profile', $profile);

            if (str_starts_with($storedPath, '/storage/profile-avatars/')) {
                Storage::disk('public')->delete(substr($storedPath, strlen('/storage/')));
            }
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile photo removed.')]);

        return redirect()->route('profile.edit', ['tab' => 'edit']);
    }

    /** Store a private document and dispatch a single background extraction. */
    public function uploadResume(Request $request): RedirectResponse
    {
        $request->validate([
            'resume' => ['required', 'file', 'mimes:pdf,docx', 'max:5120'],
            'source' => ['nullable', 'in:resume,linkedin_export'],
            'ai_consent' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        if ($request->input('source') === 'linkedin_export' &&
            ! in_array(app(CurrentMemberPlan::class)->code($user), ['plus', 'pro'], true)) {
            abort(403, 'LinkedIn export imports require Plus or Pro membership.');
        }
        $file = $request->file('resume');
        $path = $file->store('resumes/'.$user->id, 'local');
        abort_unless(is_string($path) && $path !== '', 500, 'Resume could not be stored.');

        $consented = $request->boolean('ai_consent');
        if (config('pm-ai.resume_extract_enabled') && ! $consented) {
            Storage::disk('local')->delete($path);
            throw ValidationException::withMessages(['ai_consent' => 'Please consent to AI processing before uploading a CV.']);
        }

        try {
            $import = DB::transaction(function () use ($user, $file, $path, $consented): ProfileImportSession {
                $resume = ProfileResume::create([
                    'user_id' => $user->id,
                    'original_name' => mb_substr(basename($file->getClientOriginalName()), 0, 255),
                    'storage_path' => $path,
                    'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                    'file_size' => $file->getSize(),
                ]);
                $import = ProfileImportSession::create([
                    'user_id' => $user->id,
                    'profile_resume_id' => $resume->id,
                    'source_filename' => $resume->original_name,
                    'extracted_data' => ['fields' => [], 'warnings' => [], 'ai_consent' => $consented],
                    'status' => 'processing',
                ]);
                $profile = $user->profile ?? new Profile(['user_id' => $user->id]);
                $profile->user_id = $user->id;
                if (! $profile->resume_path) {
                    $profile->resume_employer_visibility = false;
                }
                $profile->resume_path = $path;
                $profile->save();

                return $import;
            });
        } catch (\Throwable $error) {
            Storage::disk('local')->delete($path);
            throw $error;
        }

        try {
            AnalyzeProfileResume::dispatch($import->id)
                ->onQueue(config('pm-ai.resume_extract_enabled') ? config('pm-ai.resume_extract_queue') : 'default');
        } catch (\Throwable $error) {
            Log::warning('Resume analysis dispatch failed.', [
                'import_id' => $import->id,
                'exception' => $error::class,
            ]);
            $import->update(['status' => 'failed', 'extracted_data' => ['fields' => [],
                'warnings' => ['Analysis could not be started. The uploaded file is safe; please retry after the queue is restored.'],
                'ai_consent' => $consented]]);
            return redirect()->route('profile.edit', ['tab' => 'imports']);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Resume uploaded. Extraction has started; review before applying any changes.')]);
        return redirect()->route('profile.edit', ['tab' => 'imports']);
    }

    public function downloadResume(Request $request, ?ProfileResume $resume = null): BinaryFileResponse
    {
        $resume ??= $request->user()->resumes()->first();
        abort_unless($resume && $resume->user_id === $request->user()->id, 404);
        abort_unless(Storage::disk('local')->exists($resume->storage_path), 404);

        return response()->download(Storage::disk('local')->path($resume->storage_path), $resume->original_name);
    }

    public function previewResume(Request $request, ProfileResume $resume, ResumeTextExtractor $reader): \Symfony\Component\HttpFoundation\Response
    {
        abort_unless($resume->user_id === $request->user()->id, 403);
        abort_unless(Storage::disk('local')->exists($resume->storage_path), 404);
        if (strtolower(pathinfo($resume->original_name, PATHINFO_EXTENSION)) !== 'pdf') {
            try {
                $text = $reader->extract($resume);
            } catch (\RuntimeException $exception) {
                abort(422, $exception->getMessage());
            }
            return response()->view('profile.resume-preview', ['documentName' => $resume->original_name, 'text' => $text])
                ->header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")
                ->header('X-Frame-Options', 'DENY')
                ->header('Cache-Control', 'private, no-store');
        }

        return response()->file(Storage::disk('local')->path($resume->storage_path), [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="resume.pdf"',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function removeResume(Request $request, ProfileResume $resume): RedirectResponse
    {
        abort_unless($resume->user_id === $request->user()->id, 403);
        $path = $resume->storage_path;
        DB::transaction(function () use ($request, $resume): void {
            ProfileImportSession::where('user_id', $request->user()->id)->where('profile_resume_id', $resume->id)->delete();
            $resume->delete();
            $profile = $request->user()->profile;
            if ($profile && $profile->resume_path === $resume->storage_path) {
                $profile->resume_path = $request->user()->resumes()->value('storage_path');
                $profile->save();
            }
        });
        Storage::disk('local')->delete($path);
        return redirect()->route('profile.edit', ['tab' => 'imports']);
    }

    /** Re-analyse a previously uploaded, owned document; no demo data. */
    public function startImport(Request $request): RedirectResponse
    {
        $validated = $request->validate(['resume_id' => ['required', 'integer'], 'ai_consent' => ['sometimes', 'boolean']]);
        if (config('pm-ai.resume_extract_enabled') && ! $request->boolean('ai_consent')) {
            throw ValidationException::withMessages(['ai_consent' => 'Please consent to AI processing before importing a CV.']);
        }
        $resume = $request->user()->resumes()->findOrFail($validated['resume_id']);
        $import = ProfileImportSession::create([
            'user_id' => $request->user()->id,
            'profile_resume_id' => $resume->id,
            'source_filename' => $resume->original_name,
            'extracted_data' => ['fields' => [], 'warnings' => [], 'ai_consent' => $request->boolean('ai_consent')],
            'status' => 'processing',
        ]);
        AnalyzeProfileResume::dispatch($import->id)
            ->onQueue(config('pm-ai.resume_extract_enabled') ? config('pm-ai.resume_extract_queue') : 'default');
        return redirect()->route('profile.edit', ['tab' => 'imports']);
    }

    /** An owner-only polling response; do not expose extracted personal information. */
    public function importStatus(Request $request, ProfileImportSession $import): JsonResponse
    {
        abort_unless($import->user_id === $request->user()->id, 403);

        $stalled = $import->status === 'processing'
            && $import->updated_at?->lt(now()->subMinutes(5));

        return response()->json([
            'status' => $import->status,
            'stalled' => (bool) $stalled,
            'can_retry' => $import->status === 'failed' || (bool) $stalled,
        ])->header('Cache-Control', 'private, no-store');
    }

    /** Retry only a failed or long-stalled, owned import without reuploading a private file. */
    public function retryImport(Request $request, ProfileImportSession $import): RedirectResponse
    {
        $request->validate(['ai_consent' => ['sometimes', 'boolean']]);
        $replacement = DB::transaction(function () use ($request, $import): ProfileImportSession {
            $original = ProfileImportSession::query()
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->findOrFail($import->id);

            $retryAllowed = $original->status === 'failed'
                || ($original->status === 'processing'
                    && $original->updated_at?->lt(now()->subMinutes(5)));
            if (! $retryAllowed) {
                throw ValidationException::withMessages(['import' => 'The import is still being processed or has already been reviewed.']);
            }

            $resume = $original->resume;
            if (! $resume || $resume->user_id !== $request->user()->id
                || ! Storage::disk('local')->exists($resume->storage_path)) {
                throw ValidationException::withMessages(['import' => 'The original resume is unavailable. Please upload a new file.']);
            }

            $consented = $request->boolean('ai_consent') || ($original->extracted_data['ai_consent'] ?? false) === true;
            if (config('pm-ai.resume_extract_enabled') && ! $consented) {
                throw ValidationException::withMessages(['ai_consent' => 'Please consent to AI processing before retrying this CV.']);
            }

            // Cancel the prior attempt so any delayed worker cannot publish its result.
            $original->update(['status' => 'cancelled']);

            return ProfileImportSession::create([
                'user_id' => $request->user()->id,
                'profile_resume_id' => $resume->id,
                'source_filename' => $resume->original_name,
                'extracted_data' => ['fields' => [], 'warnings' => [], 'ai_consent' => $consented],
                'status' => 'processing',
            ]);
        });

        try {
            AnalyzeProfileResume::dispatch($replacement->id)
                ->onQueue(config('pm-ai.resume_extract_enabled') ? config('pm-ai.resume_extract_queue') : 'default');
        } catch (\Throwable $error) {
            Log::warning('Resume analysis retry dispatch failed.', [
                'import_id' => $replacement->id,
                'exception' => $error::class,
            ]);
            $replacement->update(['status' => 'failed', 'extracted_data' => ['fields' => [],
                'warnings' => ['Analysis could not be started. Please retry after the queue is restored.']]]);
            throw ValidationException::withMessages(['import' => 'The queue is unavailable. Your uploaded file has been preserved.']);
        }

        return redirect()->route('profile.edit', ['tab' => 'imports']);
    }

    /** Cancel a pending review without deleting the privately stored source file. */
    public function cancelImport(Request $request): RedirectResponse
    {
        $validated = $request->validate(['import_id' => ['required', 'integer']]);
        $changed = ProfileImportSession::query()
            ->where('id', $validated['import_id'])
            ->where('user_id', $request->user()->id)
            ->where('status', 'ready')
            ->update(['status' => 'cancelled']);

        abort_unless($changed === 1, 404);

        return redirect()->route('profile.edit', ['tab' => 'imports']);
    }

    public function applyImport(Request $request, ApplyProfileImport $service): RedirectResponse
    {
        $data = $request->validate([
            'import_id' => ['required', 'integer'],
            'decisions' => ['required', 'array', 'max:'.count(\App\Services\Resume\ResumeImportShape::LABELS)],
            'decisions.*' => ['required', 'in:keep,replace,merge'],
        ]);
        $count = $service->apply($request->user(), (int) $data['import_id'], $data['decisions']);
        Inertia::flash('toast', ['type' => 'success', 'message' => __("$count profile updates applied successfully.")]);
        return redirect()->route('profile.edit', ['tab' => 'overview']);
    }

    /** Private, printable PDF/Word export of the member's own profile. */
    public function exportResume(Request $request): \Illuminate\Http\Response
    {
        $format = $request->validate(['format' => ['required', 'in:pdf,word']])['format'];
        $user = $request->user();
        $user->loadMissing(['profile', 'experiences', 'educations', 'certifications']);
        $html = view('profile.resume-export', ['member' => $user, 'format' => $format])->render();
        if ($format === 'word') {
            return response($html)->header('Content-Type', 'application/msword; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="pm-circle-resume.doc"')
                ->header('X-Content-Type-Options', 'nosniff');
        }

        // The browser's print dialog supports Save as PDF without a heavy PDF dependency.
        return response($html)->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'no-store, private')
            ->header('X-Frame-Options', 'DENY');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        abort_if(config('community.engagement_write_gate', false), 503,
            'Account removal is briefly unavailable during engagement maintenance. Please retry.');
        $user = $request->user();

        DB::transaction(function () use ($user): void {
            if (EngagementStats::writesEnabled()) {
                EngagementStats::lockMember($user->id);
                EngagementStats::beforeMemberDeletion($user->id);
            }
            $user->delete();
        }, 3);

        Storage::disk('local')->deleteDirectory('support/'.$user->id);
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
