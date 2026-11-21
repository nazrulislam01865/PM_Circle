<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class UpdatePmpExamSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_admin;
    }

    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'full_question_count' => ['required', 'integer', 'between:1,180'],
            'full_duration_minutes' => ['required', 'integer', 'between:1,480'],
            'focused_question_count' => ['required', 'integer', 'between:1,100'],
            'focused_duration_minutes' => ['required', 'integer', 'between:1,240'],
            'shuffle_questions' => ['required', 'boolean'],
            'needs_improvement_below' => ['required', 'integer', 'between:1,97'],
            'target_below' => ['required', 'integer', 'between:2,98'],
            'above_target_from' => ['required', 'integer', 'between:3,99'],
            'sample_duration_seconds' => ['required', 'integer', 'between:30,900'],
            'sample_question_id' => ['nullable', 'integer', Rule::exists('pmp_exam_questions', 'id')->where('is_active', true)],
            'sample_question_ids' => ['sometimes', 'array', 'max:20'],
            'sample_question_ids.*' => ['required', 'integer', 'min:1', 'distinct:strict'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            $a = (int) $this->input('needs_improvement_below');
            $b = (int) $this->input('target_below');
            $c = (int) $this->input('above_target_from');
            if (! ($a < $b && $b < $c)) {
                $validator->errors()->add('target_below', 'Performance thresholds must increase in order.');
            }

            // One bounded query validates every selected ID against the live active bank.
            $ids = $this->input('sample_question_ids');
            if (is_array($ids) && $ids !== [] && ! $validator->errors()->has('sample_question_ids')) {
                $validIds = array_filter($ids, fn ($id) => is_int($id) || (is_string($id) && ctype_digit($id)));
                if (count($validIds) !== count($ids) || count($ids) > 20) {
                    return;
                }
                $count = DB::table('pmp_exam_questions')->where('is_active', true)
                    ->whereIn('id', array_values(array_unique($validIds)))->count();
                if ($count !== count($ids)) {
                    $validator->errors()->add('sample_question_ids', 'Select only active, unique questions from the exam bank.');
                }
            }
        }];
    }
}
