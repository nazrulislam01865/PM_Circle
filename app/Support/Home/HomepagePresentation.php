<?php

namespace App\Support\Home;

/** The current public homepage, with a non-destructive bridge from the old editor. */
final class HomepagePresentation
{
    public static function defaults(): array
    {
        return config('homepage-v2');
    }

    public static function resolve(array $legacy): array
    {
        $page = self::defaults();
        $old = static fn (string $path, mixed $default = null) => data_get($legacy, $path, $default);
        $copy = static function (array &$target, string $key, mixed $value, mixed $seed = null): void {
            if (is_string($value) && $value !== '' && $value !== $seed) {
                $target[$key] = $value;
            }
        };
        foreach (['hero'=>'hero', 'quick_links'=>'hero', 'certification'=>'pathway', 'courses'=>'pathway', 'community'=>'community', 'scenario'=>'scenario', 'members'=>'members', 'skills'=>'skills', 'ai_features'=>'ai_features', 'resume'=>'careers', 'events'=>'careers', 'join'=>'careers'] as $key => $previous) {
            $page[$key]['enabled'] = $old('sections.'.$previous, true) !== false;
        }
        $slide = &$page['hero']['slides'][0];
        foreach (['eyebrow'=>['eyebrow','The 360° community for project managers'], 'title'=>['title','Your next chapter in project management starts here.'], 'description'=>['description','Learn by doing. Share what works. Meet your people. Build your career.'], 'primary'=>['primary_label','Join the community — free'], 'secondary'=>['secondary_label',"Explore today's discussion"], 'primary_url'=>['primary_url','/register'], 'secondary_url'=>['secondary_url','/community']] as $key => [$field,$seed]) {
            $copy($slide, $key, $old('hero.'.$field), $seed);
        }
        unset($slide);
        foreach (['heading'=>'Practise today. Prepare for your next certification.', 'description'=>'Explore exam simulators for your next professional milestone.'] as $field => $seed) {
            $copy($page['certification'], $field, $old('pathway.exams.'.$field), $seed);
        }
        $copy($page['certification'], 'button_label', $old('pathway.exams.compare_label'));
        $copy($page['certification'], 'button_url', $old('pathway.exams.compare_url'));
        foreach ($page['certification']['items'] as $i => &$card) {
            $item = $old('pathway.exams.items.'.$i, []);
            if (! is_array($item)) continue;
            if (! in_array($item['title'] ?? '', ['PMP Exam Simulator','CSM Exam Simulator','Project Simulation'], true)) $copy($card, 'title', $item['title'] ?? null);
            if (! in_array($item['description'] ?? '', ['Practise project management decisions under exam-style conditions.','Build your Scrum knowledge and practise for your certification assessment.','Explore real-world project situations and practise making decisions.'], true)) $copy($card, 'description', $item['description'] ?? null);
            if (! in_array($item['button_label'] ?? '', ['Try PMP practice','Try CSM practice','Explore simulations','Start exam'], true)) $copy($card, 'button', $item['button_label'] ?? null);
            $copy($card, 'href', $item['button_url'] ?? null, '/learning');
            $copy($card, 'image', $item['icon_image'] ?? null);
        }
        unset($card);
        $copy($page['scenario'], 'read_label', $old('scenario.read_button_label'), 'Read scenario');
        $copy($page['scenario'], 'read_url', $old('scenario.read_url'));
        $featuredId = $old('scenario.featured_id');
        $page['scenario']['featured_id'] = is_numeric($featuredId) && (int) $featuredId > 0 ? (int) $featuredId : null;
        $copy($page['members'], 'heading', $old('members.heading'));
        $copy($page['members'], 'button_url', $old('members.button_url'));
        $page['members']['featured_ids'] = array_slice(array_values(array_unique(array_filter(array_map('intval', (array) $old('members.featured_ids', []))))), 0, 2);
        $copy($page['skills'], 'heading', $old('skills.heading'));
        $skills = $old('skills.items', []);
        if (is_array($skills) && $skills !== []) {
            $page['skills']['items'] = [];
            foreach (array_values(array_slice($skills, 0, 3)) as $i => $skill) {
                $page['skills']['items'][] = ['title'=>$skill['title'], 'href'=>$skill['url'], 'icon'=>['practice','scrum','learn'][$i], 'image'=>''];
            }
        } else {
            $page['skills']['items'] = [
                ['title'=>'PMP practice','href'=>'/exam-simulator/pmp','icon'=>'practice','image'=>''],
                ['title'=>'Scrum and CSM practice','href'=>'/simulators/scrum','icon'=>'scrum','image'=>''],
                ['title'=>'Project management courses','href'=>'/learning','icon'=>'learn','image'=>''],
            ];
        }
        $copy($page['ai_features'], 'heading', $old('ai_features.heading'), 'How AI helps you on PM Circle');
        $copy($page['ai_features'], 'button_label', $old('ai_features.button_label'), 'Explore Plus plans');
        $copy($page['ai_features'], 'button_url', $old('ai_features.button_url'), '/pricing');
        foreach ([0=>0,3=>1,7=>2,4=>3] as $index => $previous) {
            $item = $old('ai_features.cards.'.$previous, []);
            $seed = config('home-ai-features.cards.'.$previous, []);
            foreach (['title','description','image'] as $field) $copy($page['ai_features']['cards'][$index], $field, $item[$field] ?? null, $seed[$field] ?? null);
        }
        foreach (['title'=>'Your experience deserves a clearer resume.', 'description'=>'Turn projects, responsibilities and outcomes into a focused PM resume.', 'button_label'=>'Explore AI resume assistant'] as $field => $seed) $copy($page['resume'], $field, $old('careers.resume.'.$field), $seed);
        $href = $old('careers.resume.button_url');
        if (is_string($href) && ! preg_match('~^/careers(?:[/?#]|$)~', $href)) $copy($page['resume'], 'button_url', $href);
        $copy($page['resume'], 'image', $old('careers.resume.icon_image'));
        foreach (['heading'=>"Don't just manage projects. Grow with people who do.", 'description'=>'Start with one discussion, one lesson, one connection.', 'button_label'=>'Become a member — free', 'button_url'=>null] as $field => $seed) $copy($page['join'], $field, $old('careers.join.'.$field), $seed);
        if (! $page['events']['enabled']) $page['quick_links']['items'] = array_values(array_filter($page['quick_links']['items'], fn ($link) => $link['href'] !== '/events'));
        // Saved section overrides replace whole validated arrays, not indexed merges.
        foreach ($page as $key => $section) {
            $saved = $old('homepage_v2.'.$key);
            if (is_array($saved)) $page[$key] = array_replace($section, array_intersect_key($saved, $section));
        }
        return $page;
    }
}
