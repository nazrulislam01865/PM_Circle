<?php

namespace App\Http\Requests\Admin;

use App\Support\Admin\HomepageMasterData;
use App\Support\Home\HomepagePresentation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

final class UpdateHomepageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public function rules(): array
    {
        $sections = HomepagePresentation::defaults();
        $key = $this->input('section');
        $rules = ['version'=>['required','integer','min:1'], 'section'=>['required','string',Rule::in(array_keys($sections))], 'content'=>['required','array']];
        if (! is_string($key) || ! isset($sections[$key])) return $rules;
        $route = static function ($attribute, $value, $fail): void {
            if (! is_string($value) || ! HomepageMasterData::isAllowedNewValue('header_menu', $value)) $fail('Choose a valid same-site page destination.');
        };
        $image = static function ($attribute, $value, $fail): void {
            $prefix = Storage::disk('public')->url('homepage/');
            $name = is_string($value) && str_starts_with($value, $prefix) ? substr($value, strlen($prefix)) : '';
            if (! preg_match('~^[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)$~D', $name)) $fail('Choose an image uploaded through the homepage editor.');
        };
        $walk = function (array $shape, string $path) use (&$walk, &$rules, $route, $image, $key): void {
            $rules[$path] = ['required','array:'.implode(',', array_keys($shape))];
            foreach ($shape as $field => $value) {
                $p = $path.'.'.$field;
                if ($field === 'featured_id') {
                    $rules[$p] = ['present','nullable','integer',Rule::exists('scenarios','id')->where(fn ($query) => $query->where('status','published')->where('published_at','<=',now())->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at','>',now())))];
                } elseif ($field === 'featured_ids') {
                    $rules[$p] = ['present','array','list','max:2'];
                    $rules[$p.'.*'] = ['integer','distinct',Rule::exists('users','id')->where(fn ($query) => $query->where('status','active')->where('is_admin',false)->when(config('pm-circle.email_verification_required'), fn ($q) => $q->whereNotNull('email_verified_at'))->whereExists(fn ($q) => $q->selectRaw('1')->from('profiles')->whereColumn('profiles.user_id','users.id')->where('profiles.visibility','public')))];
                } elseif (is_array($value)) {
                    $rules[$p] = ['required','array','list','min:1','max:'.($field === 'slides' ? 6 : 12)];
                    $walk($value[0], $p.'.*');
                } elseif (is_bool($value)) {
                    $rules[$p] = ['required','boolean'];
                } elseif (is_int($value)) {
                    $rules[$p] = ['required','integer','min:1','max:'.($key === 'courses' ? 12 : 6)];
                } elseif ($field === 'image') {
                    $rules[$p] = ['present','nullable','string','max:1024',$image];
                } elseif ($field === 'href' || str_ends_with($field,'_url')) {
                    $rules[$p] = [$field === 'read_url' ? 'present' : 'required', $field === 'read_url' ? 'nullable' : 'string','string','max:160',$route];
                } elseif ($field === 'photo') {
                    $rules[$p] = ['required','string',Rule::in(['exam','scrum','stakeholder','foundations','leader','review','feedback','tutor','moderation','hero-community'])];
                } elseif ($field === 'icon') {
                    $rules[$p] = ['required','string',Rule::in($key === 'resume' ? ['upload','edit','report','save'] : ['practice','scrum','learn'])];
                } else {
                    $rules[$p] = ['required','string','max:'.(in_array($field,['description','empty_message','note'],true) ? 3000 : 500)];
                }
            }
        };
        $walk($sections[$key], 'content');
        return $rules;
    }
}
