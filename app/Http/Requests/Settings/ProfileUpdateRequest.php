<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use App\Domain\Identity\Services\ProfileFieldPrivacy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    protected function prepareForValidation(): void
    {
        if ($this->has('email') && is_string($this->input('email'))) {
            $this->merge(['email' => mb_strtolower(trim($this->string('email')->toString()))]);
        }
    }

    public function rules(): array
    {
        $rules = $this->profileRules($this->user()->id);
        // Privacy and contact controls send partial PATCH requests.
        // Validate a name/email when present, without requiring both on every PATCH.
        if (! $this->has('compact_details')) {
            $rules['name'] = ['sometimes', ...$rules['name']];
            $rules['email'] = ['sometimes', ...$rules['email']];
        }

        $fieldRules = ProfileFieldPrivacy::validationRules();

        return array_merge($rules, $fieldRules, $this->editorRules(), $this->compactRules(), [
            // Basic-profile saves require a valid private contact number. Independent
            // privacy-only PATCH requests may omit it to preserve existing controls.
            'phone' => [
                Rule::requiredIf(fn (): bool => $this->input('tab') === 'edit'
                    || $this->hasAny(['headline', 'role', 'industry', 'country', 'city', 'about'])),
                'string', 'max:32', 'regex:/^[+()\d\s.-]+$/',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! is_string($value)) return;
                    $digits = preg_replace('/\D/', '', $value);
                    if (strlen($digits) < 7 || strlen($digits) > 15) {
                        $fail('Enter a valid phone number with 7 to 15 digits, including the country code.');
                    }
                },
            ],
            'headline' => ['nullable', 'string', 'max:180'],
            'role' => [Rule::requiredIf(fn (): bool => $this->has('compact_details')), 'nullable', 'string', 'max:80'],
            'industry' => ['nullable', 'string', 'max:120'],
            'country' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'about' => ['nullable', 'string', 'max:2000'],
            'skills' => ['nullable', 'array'],
            'skills.*' => ['string', 'max:50'],
            'linkedin_url' => ['nullable', 'url:http,https', 'max:500'],
            'languages' => ['nullable', 'array', 'max:20'],
            'languages.*' => ['string', 'max:50'],
            'open_to_opportunities' => ['nullable', 'boolean'],
            'visibility' => ['nullable', 'string', 'in:public,members_only,private'],
            'resume_employer_visibility' => ['nullable', 'boolean'],
            'contact_visibility' => ['nullable', 'string', 'in:private,members'],
        ]);
    }

    /** Compact editor fields are profile summaries, not replacement record collections. */
    private function compactRules(): array
    {
        if (! $this->has('compact_details')) {
            return [];
        }

        return [
            'compact_details' => ['required', 'array:current_organization,profile_photo_url,cover_photo_url,display_location,employment_period,responsibilities,selected_projects,degree,institution,certification,professional_development,public_speaking'],
            'compact_details.current_organization' => ['required', 'string', 'max:160'],
            'compact_details.profile_photo_url' => ['nullable', 'url:https', 'max:500'],
            'compact_details.cover_photo_url' => ['nullable', 'url:https', 'max:500'],
            'compact_details.display_location' => ['nullable', 'string', 'max:255'],
            'compact_details.employment_period' => ['nullable', 'string', 'max:255'],
            'compact_details.responsibilities' => ['nullable', 'string', 'max:4000'],
            'compact_details.selected_projects' => ['nullable', 'string', 'max:4000'],
            'compact_details.degree' => ['nullable', 'string', 'max:255'],
            'compact_details.institution' => ['nullable', 'string', 'max:255'],
            'compact_details.certification' => ['nullable', 'string', 'max:255'],
            'compact_details.professional_development' => ['nullable', 'string', 'max:4000'],
            'compact_details.public_speaking' => ['nullable', 'string', 'max:4000'],
            'editor_details' => ['prohibited'],
            'removed_entries' => ['prohibited'],
        ];
    }

    /** Allowlisted prototype fields. Nested arrays are bounded and validated server-side. */
    private function editorRules(): array
    {
        if (! $this->has('editor_details')) {
            return [];
        }

        if ($this->boolean('editor_details.resume_aligned')) {
            return $this->alignedEditorRules();
        }

        $rules = [
            'editor_details' => ['required', 'array:current_organization,profile_photo_url,cover_photo_url,tools_software,delivery_methods,portfolio,github,career,records'],
            'editor_details.current_organization' => ['nullable', 'string', 'max:160'],
            'editor_details.profile_photo_url' => ['nullable', 'url:https', 'max:500'],
            'editor_details.cover_photo_url' => ['nullable', 'url:https', 'max:500'],
            'editor_details.tools_software' => ['nullable', 'string', 'max:1000'],
            'editor_details.delivery_methods' => ['nullable', 'string', 'max:500'],
            'editor_details.portfolio' => ['nullable', 'string', 'max:255'],
            'editor_details.github' => ['nullable', 'string', 'max:255'],
            'editor_details.career' => ['required', 'array:availability,target_roles,seniority,locations,work_arrangement,employment_type,notice_period,relocation'],
            'editor_details.career.availability' => ['required', Rule::in(['open', 'not_looking'])],
            'editor_details.career.relocation' => ['required', 'boolean'],
            'editor_details.records' => ['required', 'array:experiences,projects,educations,certifications,courses,awards,publications,volunteering,languages,links,research,skill_groups,interests'],
            'removed_entries' => ['sometimes', 'array:experiences,projects,educations,certifications'],
        ];

        foreach (['target_roles', 'seniority', 'locations', 'work_arrangement', 'employment_type', 'notice_period'] as $key) {
            $rules['editor_details.career.'.$key] = ['nullable', 'string', 'max:180'];
        }

        $sets = [
            'experiences' => ['job_title', 'organization', 'employment_type', 'location', 'work_arrangement', 'start_month', 'end_month', 'is_current', 'responsibilities', 'achievements', 'technical', 'soft'],
            'projects' => ['title', 'role', 'organization', 'industry', 'start_month', 'end_month', 'status', 'scale', 'scope', 'outcomes', 'work_url', 'location', 'team', 'technical', 'soft'],
            'educations' => ['degree', 'institution', 'field_of_study', 'location', 'start_month', 'end_month', 'is_current', 'grade', 'honours', 'courses'],
            'certifications' => ['name', 'issuing_organization', 'issue_month', 'expiry_month', 'does_not_expire', 'credential_number', 'verification_url', 'details'],
            'courses' => ['name', 'provider', 'completion_month', 'hours', 'evidence_url'],
            'awards' => ['name', 'organization', 'award_month', 'details'],
            'publications' => ['title', 'publisher', 'month', 'details', 'url'],
            'volunteering' => ['role', 'organization', 'start_month', 'end_month', 'is_current', 'contribution'],
            'languages' => ['name', 'proficiency'],
            'links' => ['label', 'url'],
            'research' => ['title', 'location', 'team_role', 'period', 'description', 'technical', 'soft'],
            'skill_groups' => ['category', 'skills'],
            'interests' => ['title', 'description'],
        ];
        $required = [
            'experiences' => ['job_title', 'organization', 'start_month'],
            'projects' => ['title', 'role'],
            'educations' => ['degree', 'institution'],
            'certifications' => ['name', 'issuing_organization'],
            'courses' => ['name'], 'awards' => ['name'], 'publications' => ['title'],
            'volunteering' => ['role', 'organization'],
            'languages' => ['name'], 'links' => ['label', 'url'],
            'research' => ['title'], 'skill_groups' => ['category'], 'interests' => ['title'],
        ];
        foreach ($sets as $section => $columns) {
            $prefix = 'editor_details.records.'.$section;
            $rules[$prefix] = [in_array($section, ['research', 'skill_groups', 'interests'], true) ? 'sometimes' : 'present', 'array', 'max:40', 'list'];
            $rules[$prefix.'.*'] = ['required', 'array:id,'.implode(',', $columns)];
            if (in_array($section, ['experiences', 'projects', 'educations', 'certifications'], true)) {
                $rules[$prefix.'.*.id'] = ['sometimes', 'nullable', 'integer', 'min:1'];
                $rules['removed_entries.'.$section] = ['sometimes', 'array', 'max:40'];
                $rules['removed_entries.'.$section.'.*'] = ['integer', 'min:1', 'distinct'];
            }
            foreach ($columns as $column) {
                $path = $prefix.'.*.'.$column;
                if (in_array($column, ['is_current', 'does_not_expire'], true)) {
                    $rules[$path] = ['required', 'boolean'];
                } elseif (in_array($column, ['start_month', 'end_month', 'issue_month', 'expiry_month', 'completion_month', 'award_month', 'month'], true)) {
                    $rules[$path] = in_array($column, $required[$section] ?? [], true)
                        ? ['required', 'date_format:Y-m'] : ['nullable', 'date_format:Y-m'];
                } elseif (in_array($column, ['work_url', 'verification_url', 'evidence_url', 'url'], true)) {
                    $rules[$path] = in_array($column, $required[$section] ?? [], true)
                        ? ['required', 'url:http,https', 'max:500'] : ['nullable', 'url:http,https', 'max:500'];
                } else {
                    $rules[$path] = [in_array($column, $required[$section] ?? [], true) ? 'required' : 'nullable', 'string',
                        in_array($column, ['responsibilities', 'achievements', 'scope', 'outcomes', 'honours', 'details', 'contribution', 'courses', 'description', 'skills'], true) ? 'max:4000' : 'max:255'];
                }
            }
        }

        return $rules;
    }

    /** Exact CV-shaped profile fields. Legacy data is merged from the owned profile, never accepted as hidden inputs. */
    private function alignedEditorRules(): array
    {
        $sets = [
            'educations' => ['institution', 'location', 'degree', 'period', 'honours', 'courses'],
            'experiences' => ['organization', 'location', 'job_title', 'period', 'responsibilities', 'technical', 'soft'],
            'research' => ['title', 'location', 'team_role', 'period', 'description', 'technical', 'soft'],
            'projects' => ['title', 'location', 'organization', 'period', 'scope', 'technical', 'soft', 'team'],
            'skill_groups' => ['category', 'skills'],
            'awards' => ['period', 'name', 'organization'],
            'interests' => ['title', 'description'],
            'languages' => ['name', 'proficiency'],
            'certifications' => ['name', 'issuing_organization', 'period', 'details'],
        ];
        $required = [
            'educations' => ['institution', 'degree'], 'experiences' => ['organization', 'job_title'],
            'research' => ['title'], 'projects' => ['title'], 'skill_groups' => ['category'],
            'awards' => ['name'], 'interests' => ['title'], 'languages' => ['name'], 'certifications' => ['name'],
        ];
        // Keep the existing column limits where the profile also writes relational records.
        $limits = ['educations' => ['institution' => 180, 'degree' => 180],
            'experiences' => ['organization' => 150, 'job_title' => 150],
            'projects' => ['title' => 180], 'certifications' => ['name' => 100], 'languages' => ['name' => 50]];
        $relational = ['educations', 'experiences', 'projects', 'certifications'];
        $rules = [
            'editor_details' => ['required', 'array:resume_aligned,portfolio,github,display_location,records'],
            'editor_details.resume_aligned' => ['required', 'accepted'],
            'editor_details.portfolio' => ['nullable', 'string', 'max:255'],
            'editor_details.github' => ['nullable', 'string', 'max:255'],
            'editor_details.display_location' => ['sometimes', 'nullable', 'string', 'max:241'],
            'editor_details.records' => ['required', 'array:'.implode(',', array_keys($sets))],
            'removed_entries' => ['sometimes', 'array:experiences,projects,educations,certifications'],
        ];
        foreach ($sets as $section => $columns) {
            $prefix = 'editor_details.records.'.$section;
            $hasId = in_array($section, $relational, true);
            $allowed = [...$columns, ...($hasId ? ['id'] : []), ...($section === 'awards' ? ['source_index'] : [])];
            $rules[$prefix] = ['present', 'array', $section === 'languages' ? 'max:20' : 'max:40', 'list'];
            $rules[$prefix.'.*'] = ['required', 'array:'.implode(',', $allowed)];
            if ($hasId) {
                $rules[$prefix.'.*.id'] = ['sometimes', 'integer', 'min:1', 'distinct'];
                $rules['removed_entries.'.$section] = ['sometimes', 'array', 'max:40'];
                $rules['removed_entries.'.$section.'.*'] = ['integer', 'min:1', 'distinct'];
            }
            if ($section === 'awards') $rules[$prefix.'.*.source_index'] = ['sometimes', 'integer', 'min:0', 'max:39', 'distinct'];
            foreach ($columns as $column) {
                $limit = $limits[$section][$column] ?? (in_array($column, ['honours', 'courses', 'responsibilities', 'description', 'scope', 'skills', 'details'], true) ? 4000 : 255);
                $rules[$prefix.'.*.'.$column] = [in_array($column, $required[$section], true) ? 'required' : 'nullable', 'string', 'max:'.$limit];
            }
        }
        return $rules;
    }

}
