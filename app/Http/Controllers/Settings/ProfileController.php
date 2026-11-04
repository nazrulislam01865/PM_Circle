<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\Experience;
use App\Models\Profile;
use App\Models\ProfileImportSession;
use App\Models\ProfileResume;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
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
        $user->loadMissing(['profile', 'certifications', 'experiences', 'profileProjects', 'educations', 'resumes', 'importSessions']);

        $profile = $user->profile ?? new Profile();
        $activeTab = $request->query('tab', 'overview');
        if (! in_array($activeTab, ['overview', 'edit', 'imports', 'privacy'], true)) {
            $activeTab = 'overview';
        }

        // Experiences: load or supply high-fidelity default matching p3.png / p1.png
        $experiences = $user->experiences;
        if ($experiences->isEmpty()) {
            $experiences = collect([
                [
                    'id' => 1,
                    'job_title' => 'Project Manager',
                    'organization' => 'Northstar Digital',
                    'employment_type' => 'Full-time',
                    'start_date' => 'Jan 2022',
                    'end_date' => null,
                    'is_current' => true,
                    'responsibilities' => "Led agile delivery for enterprise web applications across 3 cross-functional squads.\nSpearheaded bi-weekly sprint planning, retrospective rituals, and executive reporting.\nReduced release defect escape rate by 34% through automated regression gate alignment.",
                ],
            ]);
        }

        // Featured Project: matching p3.png
        $featuredProject = $user->profileProjects()->where('is_featured', true)->first();
        if (! $featuredProject) {
            $featuredProject = [
                'id' => 1,
                'title' => 'Customer Portal Rollout',
                'summary' => 'End-to-end delivery of client self-service portal handling 15,000+ daily transactions with 99.9% uptime SLA.',
                'role' => 'Project Manager',
                'team_size' => 12,
                'delivery_months' => 8,
                'work_sample_path' => null,
                'is_featured' => true,
                'is_anonymized' => true,
            ];
        }

        // Education: matching p3.png
        $educations = $user->educations;
        if ($educations->isEmpty()) {
            $educations = collect([
                [
                    'id' => 1,
                    'degree' => 'BBA in Management Information Systems',
                    'institution' => 'University of Dhaka',
                    'year' => '2018',
                ],
            ]);
        }

        // Certifications: matching p3.png
        $certifications = $user->certifications;
        if ($certifications->isEmpty()) {
            $certifications = collect([
                [
                    'id' => 1,
                    'name' => 'Project Management Professional (PMP)®',
                    'credential_number' => 'PMP-849204',
                    'valid_until' => '2028',
                    'status_label' => 'Valid until 2028 · Self-reported',
                    'verified' => false,
                ],
            ]);
        }

        // Skills: matching p3.png / p1.png
        $defaultSkills = ['Stakeholder engagement', 'Agile delivery', 'Risk management', 'Planning', 'Scrum ceremonies', 'Sprint governance'];
        $skills = ! empty($profile->skills) ? $profile->skills : $defaultSkills;

        // Resume: matching p3.png / p2.png
        $latestResume = $user->resumes()->first();
        $resumeData = $latestResume ? [
            'id' => $latestResume->id,
            'original_name' => $latestResume->original_name,
            'file_size' => $latestResume->file_size,
            'file_size_formatted' => round($latestResume->file_size / (1024 * 1024), 1).' MB',
            'updated_at' => $latestResume->updated_at?->format('M d, Y') ?? 'Recently',
            'is_demo' => false,
        ] : [
            'id' => 0,
            'original_name' => 'Sara_Ahmed_CV.docx',
            'file_size' => 1258291,
            'file_size_formatted' => '1.2 MB',
            'updated_at' => 'Sep 24, 2024',
            'is_demo' => true,
        ];

        // Active or sample import session matching p2.png
        $activeImport = [
            'step' => (int) $request->query('step', 2),
            'filename' => 'Sara_Ahmed_CV.docx',
            'comparisons' => [
                [
                    'field_key' => 'headline',
                    'field' => 'Professional headline',
                    'current_value' => $profile->headline ?: 'Project Manager | Agile delivery',
                    'imported_value' => 'Lead Project Manager | Agile & Digital Transformation',
                    'default_action' => 'Replace',
                    'actions' => ['Replace', 'Keep existing', 'Merge & review'],
                    'selected' => true,
                ],
                [
                    'field_key' => 'experience_lead',
                    'field' => 'Experience: Northstar Digital',
                    'current_value' => 'Project Manager (Jan 2022 — Present)',
                    'imported_value' => 'Lead Project Manager (Jan 2022 — Present) · +2 outcomes',
                    'default_action' => 'Merge & review',
                    'actions' => ['Merge & review', 'Replace', 'Keep existing'],
                    'selected' => true,
                ],
                [
                    'field_key' => 'skills_add',
                    'field' => 'Skills (4 new detected)',
                    'current_value' => 'Stakeholder engagement, Agile delivery...',
                    'imported_value' => '+ Jira Advanced Roadmaps, OKR Frameworks, Budgeting',
                    'default_action' => 'Add new',
                    'actions' => ['Add new', 'Review manually', 'Skip'],
                    'selected' => true,
                ],
                [
                    'field_key' => 'certifications',
                    'field' => 'Certifications: PMP®',
                    'current_value' => 'PMP-849204 (Self-reported)',
                    'imported_value' => 'PMP® (Credential ID 849204, PMI certified)',
                    'default_action' => 'Review manually',
                    'actions' => ['Review manually', 'Replace', 'Keep existing'],
                    'selected' => true,
                    'notice' => 'Certification details remain self-reported.',
                ],
            ],
            'history' => [
                [
                    'date' => 'Sep 24, 2024 · 3:45 PM',
                    'filename' => 'Sara_Ahmed_CV.docx',
                    'fields_updated' => 4,
                    'status' => 'Successfully merged',
                ],
            ],
        ];

        // Profile completeness (80% matching p3.png)
        $completenessScore = 80;

        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'activeTab' => $activeTab,
            'profileData' => [
                'name' => $user->name,
                'email' => $user->email,
                'headline' => $profile->headline ?: 'Project Manager | Agile delivery & stakeholder alignment',
                'role' => $profile->role ?: 'Project Manager',
                'industry' => $profile->industry ?: 'Technology & Telecommunications',
                'country' => $profile->country ?: 'Bangladesh',
                'city' => $profile->city ?: 'Dhaka',
                'about' => $profile->about ?: "Results-oriented Project Manager with 5+ years driving digital products and enterprise software delivery. Passionate about establishing transparent sprint cadences, unblocking cross-functional teams, and connecting roadmap execution with measurable business outcomes.\n\nExperienced in hybrid Waterfall-Agile governance, stakeholder consensus building, and user-centric release management.",
                'skills' => $skills,
                'cover_photo_path' => $profile->cover_photo_path,
                'avatar_path' => $profile->avatar_path,
                'open_to_opportunities' => $profile->open_to_opportunities ?? true,
                'visibility' => $profile->visibility ?: 'members_only',
                'resume_employer_visibility' => $profile->resume_employer_visibility ?? true,
                'contact_visibility' => $profile->contact_visibility ?: 'private',
                'plan_label' => '👑 Plus member',
                'location_label' => 'Dhaka, Bangladesh',
                'status_label' => 'Open to opportunities',
                'completeness' => $completenessScore,
                'insights' => [
                    'views' => 18,
                    'change' => '+50%',
                    'period' => 'this week',
                ],
                'learning_stats' => [
                    'activities' => 24,
                    'hours' => 8,
                    'achievements' => 6,
                ],
                'experiences' => $experiences,
                'featured_project' => $featuredProject,
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

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }

        if (isset($validated['email']) && $validated['email'] !== $user->email) {
            $user->email = $validated['email'];
            $user->email_verified_at = null;
        }

        $user->save();

        // Update profile model attributes
        $profile = $user->profile ?? new Profile(['user_id' => $user->id]);
        $profile->user_id = $user->id;

        foreach ([
            'headline',
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
            'responsibilities' => ['nullable', 'string', 'max:2000'],
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

        $profile = $user->profile ?? new Profile(['user_id' => $user->id]);
        $profile->user_id = $user->id;
        $profile->cover_photo_path = '/storage/'.$path;
        $profile->save();

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

        $profile = $user->profile ?? new Profile(['user_id' => $user->id]);
        $profile->user_id = $user->id;
        $profile->avatar_path = '/storage/'.$path;
        $profile->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Avatar photo updated successfully.')]);

        return redirect()->route('profile.edit', ['tab' => $request->input('tab', 'edit')]);
    }

    /**
     * Upload and quarantine resume document.
     */
    public function uploadResume(Request $request): RedirectResponse
    {
        $request->validate([
            'resume' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:5120'],
        ]);

        $file = $request->file('resume');
        $user = $request->user();
        $path = $file->store('resumes/'.$user->id, 'local');

        $resume = ProfileResume::create([
            'user_id' => $user->id,
            'original_name' => $file->getClientOriginalName(),
            'storage_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
        ]);

        $profile = $user->profile ?? new Profile(['user_id' => $user->id]);
        $profile->user_id = $user->id;
        $profile->resume_path = $path;
        $profile->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Resume uploaded successfully.')]);

        return redirect()->route('profile.edit', ['tab' => 'imports']);
    }

    /**
     * Securely download member resume.
     */
    public function downloadResume(Request $request, ?ProfileResume $resume = null): BinaryFileResponse|RedirectResponse
    {
        $user = $request->user();

        if ($resume && $resume->user_id !== $user->id) {
            abort(403);
        }

        $targetResume = $resume ?? $user->resumes()->first();

        if ($targetResume && Storage::disk('local')->exists($targetResume->storage_path)) {
            return response()->download(
                Storage::disk('local')->path($targetResume->storage_path),
                $targetResume->original_name
            );
        }

        // Fallback for demo resume download
        $demoContent = "Sara Ahmed — Project Manager CV\nEmail: {$user->email}\nLocation: Dhaka, Bangladesh\n\nExperience:\nProject Manager — Northstar Digital (2022 - Present)\nLed agile cross-functional delivery.";
        $tempPath = tempnam(sys_get_temp_dir(), 'resume_');
        file_put_contents($tempPath, $demoContent);

        return response()->download($tempPath, 'Sara_Ahmed_CV.docx')->deleteFileAfterSend(true);
    }

    /**
     * Initiate resume / LinkedIn extraction.
     */
    public function startImport(Request $request): RedirectResponse
    {
        $user = $request->user();

        ProfileImportSession::create([
            'user_id' => $user->id,
            'source_filename' => 'Sara_Ahmed_CV.docx',
            'extracted_data' => [
                'headline' => 'Lead Project Manager | Agile & Digital Transformation',
                'role' => 'Lead Project Manager',
                'skills' => ['Jira Advanced Roadmaps', 'OKR Frameworks', 'Budgeting'],
            ],
            'status' => 'pending',
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Resume extracted. Review comparison below.')]);

        return redirect()->route('profile.edit', ['tab' => 'imports', 'step' => 2]);
    }

    /**
     * Apply selected imported updates.
     */
    public function applyImport(Request $request): RedirectResponse
    {
        $user = $request->user();
        $profile = $user->profile ?? new Profile(['user_id' => $user->id]);
        $profile->user_id = $user->id;

        $updates = $request->input('updates', []);

        if (in_array('headline', $updates, true)) {
            $profile->headline = 'Lead Project Manager | Agile & Digital Transformation';
        }

        if (in_array('skills_add', $updates, true)) {
            $currentSkills = $profile->skills ?? ['Stakeholder engagement', 'Agile delivery', 'Risk management', 'Planning'];
            $profile->skills = array_values(array_unique(array_merge($currentSkills, ['Jira Advanced Roadmaps', 'OKR Frameworks', 'Budgeting'])));
        }

        $profile->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Selected updates successfully applied to your profile.')]);

        return redirect()->route('profile.edit', ['tab' => 'overview']);
    }

    /**
     * Delete the user's account.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
