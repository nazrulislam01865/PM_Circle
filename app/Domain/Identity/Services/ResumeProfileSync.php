<?php

namespace App\Domain\Identity\Services;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/** Merge an explicitly reviewed CV into the existing profile schema. No deletion or verification grants. */
final class ResumeProfileSync
{
    public function __construct(private readonly ProfileEditorSaveService $editor) {}

    public function apply(User $user, Profile $profile, array $document): void
    {
        $details = $profile->editor_details ?? [];
        $records = $details['records'] ?? [];
        $oldGroups = $records['skill_groups'] ?? [];
        foreach (['headline' => 180, 'phone' => 32] as $field => $max) {
            $value = trim((string) ($document[$field] ?? ''));
            if ($value === '') continue;
            $this->limit($value, $max, 'document.'.$field);
            if ($field === 'phone' && (! preg_match('/^[+()\d\s.-]+$/D', $value) || ! in_array(strlen(preg_replace('/\D/', '', $value)), range(7, 15), true))) {
                throw ValidationException::withMessages(['document.phone' => 'Enter a valid phone number with 7 to 15 digits.']);
            }
            $profile->{$field} = $value;
        }
        foreach (['portfolio', 'github'] as $field) {
            if (filled($document[$field] ?? null)) $details[$field] = trim($document[$field]);
        }
        if (filled($document['linkedin'] ?? null)) {
            $link = trim($document['linkedin']);
            if (preg_match('/^[a-zA-Z0-9_-]+$/D', $link)) $link = 'https://www.linkedin.com/in/'.$link;
            if (! filter_var($link, FILTER_VALIDATE_URL) || ! in_array(strtolower((string) parse_url($link, PHP_URL_SCHEME)), ['http', 'https'], true)) {
                throw ValidationException::withMessages(['document.linkedin' => 'Enter a LinkedIn username or valid HTTP(S) URL.']);
            }
            $profile->linkedin_url = $link;
            $links = $records['links'] ?? [];
            $found = false;
            foreach ($links as &$item) {
                if (stripos((string) ($item['label'] ?? ''), 'linkedin') !== false) { $item['url'] = $link; $found = true; }
            }
            unset($item);
            if (! $found) $links[] = ['label' => 'LinkedIn', 'url' => $link];
            $records['links'] = $links;
        }

        $specs = [
            'education' => ['educations', 'educations', ['title' => 'institution', 'subtitle' => 'degree', 'description' => 'honours'], ['institution', 'degree'], ['institution' => 180, 'degree' => 180], ['institution' => 'institution', 'degree' => 'degree', 'end_month' => 'year']],
            'experience' => ['experiences', 'experiences', ['title' => 'organization', 'subtitle' => 'job_title', 'description' => 'responsibilities'], ['organization', 'job_title'], ['organization' => 150, 'job_title' => 150], ['organization' => 'organization', 'job_title' => 'job_title', 'responsibilities' => 'responsibilities', 'start_month' => 'start_date', 'end_month' => 'end_date', 'is_current' => 'is_current']],
            'projects' => ['projects', 'profileProjects', ['subtitle' => 'organization', 'description' => 'scope'], ['title'], ['title' => 180], ['title' => 'title', 'scope' => 'summary']],
            'certifications' => ['certifications', 'certifications', ['title' => 'name', 'subtitle' => 'issuing_organization', 'description' => 'details'], ['name'], ['name' => 100], ['name' => 'name', 'expiry_month' => 'valid_until']],
        ];
        foreach ($specs as $section => [$key, $relation, $map, $identity, $limits, $columns]) {
            if (empty($document[$section])) continue;
            $existing = $user->{$relation}; // already loaded for the optimistic version check
            $extras = collect($records[$key] ?? [])->keyBy('id');
            $byIdentity = $existing->groupBy(fn (Model $row) => $this->signature($row->getAttributes(), $identity));
            foreach ($document[$section] as $index => $item) {
                $path = 'document.'.$section.'.'.$index;
                $entry = $this->mapped($item, $map);
                if ($entry === []) continue;
                $this->requireIdentity($entry, $identity, $limits, $path);
                $signature = $this->signature($entry, $identity);
                $matches = $byIdentity->get($signature, collect());
                if ($matches->isNotEmpty() && $key !== 'certifications' && filled($entry['period'] ?? null)) {
                    $exact = $matches->filter(fn (Model $row) => $this->periodKey($this->period($key, $row, $extras->get($row->id, []))) === $this->periodKey($entry['period']));
                    $matches = $exact->isNotEmpty() ? $exact : $matches->filter(fn (Model $row) => blank($this->period($key, $row, $extras->get($row->id, []))));
                }
                if ($matches->count() > 1) throw ValidationException::withMessages([$path.'.title' => 'Multiple profile entries match this résumé entry. Resolve them in Edit profile first.']);
                $row = $matches->first();
                // A self-reported résumé cannot modify an independently verified credential.
                if ($key === 'certifications' && $row?->verified) continue;
                if (! $row) {
                    if ($existing->count() >= 40) throw ValidationException::withMessages([$path.'.title' => 'This profile section already contains 40 entries.']);
                    $row = $user->{$relation}()->make();
                    if ($key === 'projects') { $row->is_featured = false; $row->is_anonymized = true; }
                    if ($key === 'certifications') $row->verified = false;
                }
                $old = $extras->get($row->id, []);
                $entry['period'] ??= $this->period($key, $row, $old);
                if ($key === 'projects' && $row->exists && empty($old['organization']) && ($entry['organization'] ?? null) === $row->role) unset($entry['organization']);
                // The profile editor already owns free-text period normalization and legacy metadata preservation.
                if ($key === 'experiences' && ! isset($entry['responsibilities'])) $entry['responsibilities'] = implode("\n", array_filter([$row->responsibilities, $old['achievements'] ?? '']));
                if ($key === 'projects' && ! isset($entry['scope'])) $entry['scope'] = implode("\n", array_filter([$row->summary, $old['outcomes'] ?? '']));
                if ($key === 'certifications') $entry['issuing_organization'] ??= $old['issuing_organization'] ?? '';
                $merged = $this->editor->mergeAlignedRecord($key, $entry, $old, $row);
                foreach ($columns as $field => $column) {
                    if (! array_key_exists($field, $merged)) continue;
                    $value = $merged[$field];
                    if ($key === 'educations' && $field === 'end_month') $value = filled($value) ? substr($value, 0, 4) : null;
                    $row->{$column} = $value;
                }
                if ($key === 'experiences' && $row->is_current) $row->end_date = null;
                $new = ! $row->exists;
                if ($new || $row->isDirty()) $row->save();
                $extras->put($row->id, [...$merged, 'id' => $row->id]);
                if ($new) { $existing->push($row); $byIdentity->put($signature, $byIdentity->get($signature, collect())->push($row)); }
            }
            $records[$key] = $extras->values()->all();
        }

        foreach ([
            'research' => ['research', ['subtitle' => 'team_role'], 'title'],
            'skills' => ['skill_groups', ['title' => 'category', 'description' => 'skills'], 'category'],
            'achievements' => ['awards', ['title' => 'name', 'subtitle' => 'organization'], 'name'],
            'interests' => ['interests', [], 'title'],
            'languages' => ['languages', ['title' => 'name', 'description' => 'proficiency'], 'name'],
        ] as $section => [$key, $map, $identity]) {
            if (empty($document[$section])) continue;
            $current = $records[$key] ?? ($key === 'languages' ? array_map(fn ($name) => ['name' => $name], $profile->languages ?? []) : []);
            $positions = [];
            foreach ($current as $index => $entry) $positions[$this->signature($entry, [$identity])] = $index;
            foreach ($document[$section] as $index => $item) {
                $entry = $this->mapped($item, $map);
                if ($entry === []) continue;
                $path = 'document.'.$section.'.'.$index;
                $this->requireIdentity($entry, [$identity], [$identity => $key === 'languages' ? 50 : 255], $path);
                $signature = $this->signature($entry, [$identity]);
                if (isset($positions[$signature])) $current[$positions[$signature]] = array_replace($current[$positions[$signature]], $entry);
                else {
                    if (count($current) >= ($key === 'languages' ? 20 : 40)) throw ValidationException::withMessages([$path.'.title' => 'This profile section has reached its entry limit.']);
                    $positions[$signature] = count($current);
                    $current[] = $entry;
                }
            }
            $records[$key] = array_values($current);
        }
        if (! empty($document['skills'])) {
            $previous = array_fill_keys(array_map(fn ($skill) => mb_strtolower($skill), $this->skills($oldGroups)), true);
            $ungrouped = array_filter($profile->skills ?? [], fn ($skill) => ! isset($previous[mb_strtolower($skill)]));
            $skills = [];
            foreach ([...$ungrouped, ...$this->skills($records['skill_groups'] ?? [])] as $skill) {
                if (mb_strlen($skill) > 50) throw ValidationException::withMessages(['document.skills' => 'Individual profile skills must contain at most 50 characters. Separate skills with commas.']);
                $skills[mb_strtolower($skill)] = $skill;
            }
            if (count($skills) > 100) throw ValidationException::withMessages(['document.skills' => 'A profile can contain at most 100 skills.']);
            $profile->skills = array_values($skills);
        }
        if (! empty($document['languages'])) $profile->languages = array_values(array_unique(array_column($records['languages'] ?? [], 'name')));
        if (! empty($document['experience'])) {
            $current = $user->experiences->filter(fn ($row) => $row->is_current)->pluck('organization')->unique()->values();
            if ($current->count() === 1) $details['current_organization'] = $current->first();
        }
        $details['records'] = $records;
        $profile->editor_details = $details;
    }

    private function mapped(array $item, array $map): array
    {
        $entry = [];
        foreach ($item as $key => $value) {
            if (filled($value)) $entry[$map[$key] ?? $key] = trim((string) $value);
        }
        return $entry;
    }

    private function signature(array $entry, array $keys): string
    {
        return json_encode(array_map(fn ($key) => mb_strtolower(trim((string) ($entry[$key] ?? ''))), $keys), JSON_THROW_ON_ERROR);
    }

    private function requireIdentity(array $entry, array $keys, array $limits, string $path): void
    {
        foreach ($keys as $key) {
            if (blank($entry[$key] ?? null)) throw ValidationException::withMessages([$path.'.title' => 'Complete the required title and identity fields for this entry.']);
            $this->limit($entry[$key], $limits[$key], $path.'.title');
        }
    }

    private function limit(string $value, int $max, string $field): void
    {
        if (mb_strlen($value) > $max) throw ValidationException::withMessages([$field => 'Use at most '.$max.' characters for this profile field.']);
    }

    private function periodKey(string $period): string
    {
        return mb_strtolower(trim(preg_replace('/\s*(?:–|—|\s-\s|\bto\b)\s*/iu', ' – ', $period)));
    }

    private function period(string $section, Model $row, array $old): string
    {
        if (isset($old['period'])) return $old['period'];
        $format = fn ($start, $end) => implode(' – ', array_filter([$start, $end]));
        return match ($section) {
            'experiences' => $format($row->start_date, $row->is_current ? 'Present' : $row->end_date),
            'educations' => $format($old['start_month'] ?? '', ($old['is_current'] ?? false) ? 'Present' : ($old['end_month'] ?? $row->year)),
            'projects' => $format($old['start_month'] ?? '', $old['end_month'] ?? ''),
            'certifications' => $format($old['issue_month'] ?? '', ($old['does_not_expire'] ?? false) ? 'Does not expire' : $row->valid_until),
        };
    }

    private function skills(array $groups): array
    {
        return array_values(array_filter(array_map('trim', preg_split('/[,\r\n]+/', implode("\n", array_column($groups, 'skills'))))));
    }
}
