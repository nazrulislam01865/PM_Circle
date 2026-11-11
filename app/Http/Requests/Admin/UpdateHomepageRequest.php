<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use App\Support\Admin\HomepageMasterData;

final class UpdateHomepageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public function rules(): array
    {
        $text = ['required', 'string', 'max:500'];
        $body = ['required', 'string', 'max:3000'];
        $label = ['required', 'string', 'max:160'];
        // One indexed lookup supplies all allowed dropdown choices for this request.
        $catalog = HomepageMasterData::options();
        $choice = static fn (string $category): array => ['required', 'string', Rule::in(array_column($catalog[$category] ?? [], 'value'))];
        $r = [
            'version' => ['required', 'integer', 'min:1'],
            'content' => ['required', 'array:sections,hero,pathway,scenario,community,members,skills,careers'],
            'content.sections' => ['required', 'array:hero,pathway,scenario,community,members,skills,careers'],
        ];

        foreach (['hero', 'pathway', 'scenario', 'community', 'members', 'skills', 'careers'] as $key) {
            $r["content.sections.{$key}"] = ['required', 'boolean'];
        }

        $fields = [
            'hero' => ['eyebrow' => $label, 'title' => $text, 'description' => $body, 'primary_label' => $label, 'secondary_label' => $label, 'primary_url' => $choice('hero_primary_url'), 'secondary_url' => $choice('hero_secondary_url'), 'caption_learn' => $label, 'caption_discuss' => $label, 'caption_career' => $label],
            'scenario' => ['heading' => $label, 'status_label' => $label, 'button_label' => $label, 'read_button_label' => $label, 'discussion_button_label' => $label, 'responses_heading' => $label, 'score_label' => $label, 'view_all_label' => $label, 'empty_message' => $body, 'empty_responses_message' => $body, 'hint' => $body],
            'members' => ['heading' => $text, 'hint' => $body, 'button_label' => $label, 'empty_message' => $body],
            'skills' => ['heading' => $text],
            'community' => ['heading' => $text, 'view_all_label' => $label, 'prompt_title' => $text, 'prompt_description' => $body, 'button_label' => $label, 'empty_message' => $body],
            'careers' => ['heading' => $text, 'opportunities_heading' => $text, 'jobs_view_all_label' => $label, 'empty_message' => $body],
            'pathway.steps' => ['heading' => $text],
            'pathway.exams' => ['heading' => $text, 'description' => $body, 'compare_label' => $label, 'more_label' => $label],
            'pathway.banner' => ['heading' => $text, 'description' => $body, 'button_label' => $label],
            'careers.resume' => ['title' => $text, 'description' => $body, 'button_label' => $label],
            'careers.join' => ['heading' => $text, 'description' => $body, 'button_label' => $label, 'hint' => $body],
        ];
        foreach ($fields as $group => $names) {
            $r['content.'.$group] = ['required', 'array:'.implode(',', array_keys($names))
                .($group === 'hero' ? ',people' : '')
                .($group === 'skills' ? ',items' : '')
                .($group === 'scenario' ? ',featured_id' : '')
                .($group === 'members' ? ',featured_ids' : '')
                .($group === 'community' ? ',topics,featured_ids' : '')
                .($group === 'careers' ? ',features,opportunities,resume,join,show_sample_opportunities' : '')
                .($group === 'pathway.steps' ? ',items' : '')
                .($group === 'pathway.exams' ? ',items' : '')];
            foreach ($names as $field => $rules) {
                $r['content.'.$group.'.'.$field] = $rules;
            }
        }

        $r += [
            'content.pathway' => ['required', 'array:steps,exams,banner'],
            'content.hero.people' => ['present', 'array', 'max:5'],
            'content.hero.people.*' => ['array:name,avatar_path'],
            'content.hero.people.*.name' => $label,
            'content.hero.people.*.avatar_path' => ['nullable', 'string', 'max:1024', function ($attribute, $value, $fail): void {
                if (! is_string($value)) {
                    $fail('Choose a valid image address.');
                    return;
                }
                $publicPrefix = Storage::disk('public')->url('homepage/');
                $demoImage = preg_match('~^/images/demo/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)$~D', $value) === 1;
                $storedName = str_starts_with($value, $publicPrefix) ? substr($value, strlen($publicPrefix)) : '';
                $uploadedImage = preg_match('~^[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)$~D', $storedName) === 1;
                if (! $demoImage && ! $uploadedImage) {
                    $fail('Choose an uploaded image or an existing PM Circle demo image.');
                }
            }],
            'content.pathway.steps.items' => ['present', 'array', 'max:10'],
            'content.pathway.steps.items.*' => ['array:title,description,icon'],
            'content.pathway.steps.items.*.title' => $text,
            'content.pathway.steps.items.*.description' => $body,
            'content.pathway.steps.items.*.icon' => $choice('pathway_step_icon'),
            'content.pathway.exams.items' => ['present', 'array', 'max:10'],
            'content.pathway.exams.items.*' => ['array:title,description,icon,features,button_label,plans_label'],
            'content.pathway.exams.items.*.title' => $text,
            'content.pathway.exams.items.*.description' => $body,
            'content.pathway.exams.items.*.icon' => $choice('pathway_exam_icon'),
            'content.pathway.exams.items.*.button_label' => $label,
            'content.pathway.exams.items.*.plans_label' => $label,
            'content.pathway.exams.items.*.features' => ['present', 'array', 'max:8'],
            'content.pathway.exams.items.*.features.*' => $label,
            'content.skills.items' => ['present', 'array', 'max:10'],
            'content.skills.items.*' => ['array:title,description,url,icon'],
            'content.skills.items.*.title' => $text,
            'content.skills.items.*.description' => $body,
            'content.skills.items.*.url' => $choice('skills_url'),
            'content.skills.items.*.icon' => $choice('skills_icon'),
            'content.community.topics' => ['required', 'array', 'min:1', 'max:10'],
            'content.community.topics.*' => $label,
            'content.careers.features' => ['present', 'array', 'max:12'],
            'content.careers.features.*' => ['array:title,description,url,icon'],
            'content.careers.features.*.title' => $text,
            'content.careers.features.*.description' => $body,
            'content.careers.features.*.url' => $choice('careers_feature_url'),
            'content.careers.features.*.icon' => $choice('careers_feature_icon'),
            'content.careers.show_sample_opportunities' => ['required', 'boolean'],
            'content.careers.opportunities' => ['present', 'array', 'max:12'],
            'content.careers.opportunities.*' => ['array:role,company,location,type,icon'],
            'content.careers.opportunities.*.role' => $text,
            'content.careers.opportunities.*.company' => $text,
            'content.careers.opportunities.*.location' => $choice('careers_location'),
            'content.careers.opportunities.*.type' => $choice('careers_type'),
            'content.careers.opportunities.*.icon' => $choice('careers_opportunity_icon'),
            'content.scenario.featured_id' => ['nullable', 'integer', Rule::exists('scenarios', 'id')->where('status', 'published')],
            'content.community.featured_ids' => ['present', 'array', 'max:2'],
            'content.community.featured_ids.*' => ['integer', 'distinct', Rule::exists('posts', 'id')->where('status', 'published')->where('visibility', 'public')],
            'content.members.featured_ids' => ['present', 'array', 'max:3'],
            'content.members.featured_ids.*' => ['integer', 'distinct', Rule::exists('users', 'id')->where('status', 'active')],
        ];

        return $r;
    }

    public function messages(): array
    {
        return [
            'content.community.featured_ids.max' => 'Choose no more than two featured community posts.',
            'content.members.featured_ids.max' => 'Choose no more than three featured members.',
            'content.scenario.featured_id.exists' => 'That scenario is no longer published. Please choose another.',
        ];
    }
}
