<?php

namespace App\Domain\Identity\Services;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Support\Arr;

/** Explicit read-only projection: never send the owner's account or resume payload. */
final class MemberProfileOverview
{
    public function forMember(User $member, Profile $profile, ?User $viewer, bool $includeSections = true): array
    {
        $visible = array_values(array_filter(ProfileFieldPrivacy::keys(),
            fn (string $key) => ProfileFieldPrivacy::visible($profile, $key, $viewer, $member->id)));
        $can = fn (string $key): bool => in_array($key, $visible, true);
        $value = fn (string $key, mixed $value, mixed $default = '') => $can($key) ? $value : $default;
        $details = $profile->editor_details ?? [];
        $safeDetails = [];
        foreach (['current_organization' => 'current_organisation', 'profile_photo_url' => 'profile_photo_url', 'cover_photo_url' => 'cover_photo_url', 'tools_software' => 'tools_and_software', 'delivery_methods' => 'delivery_methods', 'portfolio' => 'portfolio_and_links', 'github' => 'portfolio_and_links'] as $field => $privacy) {
            if ($can($privacy) && isset($details[$field])) {
                $safeDetails[$field] = $details[$field];
            }
        }
        // Compact summaries inherit the same per-section privacy controls as structured records.
        if ($includeSections) {
            foreach (['employment_period' => 'experience', 'responsibilities' => 'experience',
                'selected_projects' => 'selected_projects', 'degree' => 'education', 'institution' => 'education',
                'certification' => 'certifications_and_licences', 'professional_development' => 'courses_and_professional_development',
                'public_speaking' => 'publications_and_speaking'] as $field => $privacy) {
                if ($can($privacy) && isset($details['compact'][$field])) {
                    $safeDetails['compact'][$field] = $details['compact'][$field];
                }
            }
        }
        // Display location must not reveal a city or country the owner has hidden.
        if ($can('city') && $can('country') && isset($details['compact']['display_location'])) {
            $safeDetails['compact']['display_location'] = $details['compact']['display_location'];
        }
        $safeDetails['career'] = [];
        foreach (['availability' => 'availability', 'target_roles' => 'target_roles', 'seniority' => 'seniority',
            'locations' => 'preferred_work_locations', 'work_arrangement' => 'preferred_work_arrangement',
            'employment_type' => 'preferred_employment_type', 'notice_period' => 'notice_period_or_earliest_start',
            'relocation' => 'open_to_relocation'] as $field => $privacy) {
            if ($can($privacy) && array_key_exists($field, $details['career'] ?? [])) {
                $safeDetails['career'][$field] = $details['career'][$field];
            }
        }
        $sections = [
            'experiences' => ['experience', 'experiences', ['id', 'job_title', 'organization', 'employment_type', 'start_date', 'end_date', 'is_current', 'responsibilities'], ['id', 'job_title', 'organization', 'employment_type', 'location', 'work_arrangement', 'start_month', 'end_month', 'is_current', 'responsibilities', 'achievements', 'technical', 'soft', 'period']],
            'projects' => ['selected_projects', 'profileProjects', ['id', 'title', 'role', 'summary', 'team_size', 'delivery_months', 'is_featured'], ['id', 'title', 'role', 'organization', 'industry', 'start_month', 'end_month', 'status', 'scale', 'scope', 'outcomes', 'work_url', 'location', 'team', 'technical', 'soft', 'period']],
            'educations' => ['education', 'educations', ['id', 'degree', 'institution', 'year'], ['id', 'degree', 'institution', 'field_of_study', 'location', 'start_month', 'end_month', 'is_current', 'grade', 'honours', 'courses', 'period']],
            'certifications' => ['certifications_and_licences', 'certifications', ['id', 'name', 'credential_number', 'valid_until'], ['id', 'name', 'issuing_organization', 'issue_month', 'expiry_month', 'does_not_expire', 'credential_number', 'verification_url', 'details', 'period']],
            'courses' => ['courses_and_professional_development', null, [], ['id', 'name', 'provider', 'completion_month', 'hours', 'evidence_url']],
            'awards' => ['awards_and_honours', null, [], ['id', 'name', 'organization', 'award_month', 'details', 'period']],
            'publications' => ['publications_and_speaking', null, [], ['id', 'title', 'publisher', 'month', 'details', 'url']],
            'volunteering' => ['volunteering', null, [], ['id', 'role', 'organization', 'start_month', 'end_month', 'is_current', 'contribution']],
            'languages' => ['languages', null, [], ['id', 'name', 'proficiency']],
            'links' => ['portfolio_and_links', null, [], ['id', 'label', 'url']],
            'research' => ['research_work', null, [], ['title', 'location', 'team_role', 'period', 'description', 'technical', 'soft']],
            'skill_groups' => ['core_skills', null, [], ['category', 'skills']],
            'interests' => ['interests', null, [], ['title', 'description']],
        ];
        $relations = [];
        foreach ($sections as $section => [$privacy, $relation, $columns, $fields]) {
            if ($relation) {
                $relations[$section] = $includeSections && $can($privacy)
                    ? $member->{$relation}()->get($columns)->map(fn ($row) => Arr::only($row->toArray(), $columns))->all()
                    : [];
            }
            if ($includeSections && $can($privacy) && is_array($details['records'][$section] ?? null)) {
                $safeDetails['records'][$section] = array_values(array_map(
                    fn (array $row) => Arr::only($row, $fields),
                    array_filter($details['records'][$section], 'is_array')));
            }
        }
        $featured = collect($relations['projects'])->firstWhere('is_featured', true) ?? ($relations['projects'][0] ?? null);

        return [
            'visibleFields' => $visible,
            'featuredProjectId' => $featured['id'] ?? null,
            'profile' => array_merge($relations, [
                'name' => $value('full_name', $member->name, 'PM Circle member'),
                'headline' => $value('professional_headline', $profile->headline ?? ''),
                'role' => $value('current_job_title', $profile->role ?? ''),
                'industry' => $value('industry', $profile->industry ?? ''),
                'country' => $value('country', $profile->country ?? ''),
                'city' => $value('city', $profile->city ?? ''),
                'about' => $value('professional_summary', $profile->about ?: ($profile->bio ?? '')),
                'skills' => $value('core_skills', $profile->skills ?? [], []),
                'avatar_path' => $value('profile_photo_url', $profile->avatar_path, null),
                'cover_photo_path' => $value('cover_photo_url', $profile->cover_photo_path, null),
                'open_to_opportunities' => $value('availability', (bool) $profile->open_to_opportunities, false),
                'languages' => $value('languages', $profile->languages ?? [], []),
                'linkedin_url' => $value('portfolio_and_links', $profile->linkedin_url ?? ''),
                'editor_details' => $safeDetails,
            ]),
        ];
    }
}
