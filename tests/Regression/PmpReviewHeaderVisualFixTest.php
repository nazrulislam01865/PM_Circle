<?php

// No database or application bootstrap required. Keep the three scoped UI
// corrections present without changing exam scoring or shared navigation.
$root = dirname(__DIR__, 2);
$read = static fn (string $file): string => (string) file_get_contents($root.'/'.$file);
$check = static function (bool $passed, string $message): void {
    if (! $passed) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    echo "PASS: {$message}\n";
};

$shared = $read('resources/js/components/exam/ExamShared.tsx');
$reviewCss = $read('resources/css/pm-pmp-review-prototype.css');
$tokens = $read('resources/css/pm-design-tokens.css');
$badgeCss = $read('resources/css/pm-profile-reward.css');
$header = $read('resources/js/components/dashboard/MemberHomeHeader.tsx');
$navCss = $read('resources/css/pm-member-home.css');

$check(str_contains($shared, '<span className="pm-exam-donut-label">Questions</span>')
    && str_contains($reviewCss, '.pm-exam-review-page .pm-exam-donut-label')
    && str_contains($reviewCss, 'display: flex; flex-direction: column; align-items: center; justify-content: center;')
    && str_contains($reviewCss, 'font-size: var(--text-sm)')
    && str_contains($tokens, '--text-donut-label:'),
    'The screenshot-style donut number and label remain centered with shared typography tokens');

$check(str_contains($badgeCss, 'background: linear-gradient(105deg, var(--reward-surface-bright), var(--reward-surface))')
    && str_contains($badgeCss, 'background: linear-gradient(105deg, var(--reward-surface), var(--reward-surface-bright))')
    && str_contains($badgeCss, 'border: 1px solid var(--reward-border)')
    && str_contains($badgeCss, 'color: var(--reward-icon-ink);')
    && str_contains($header, 'pm-header-profile-reward-badge')
    && str_contains($tokens, '--reward-surface: #fff7e6;')
    && str_contains($tokens, '--reward-surface-bright: #fffdf6;'),
    'The shared header promotion matches the pale cream simulator discount notice');

$check(substr_count($header, 'onMouseLeave={closeDropdownOnMouseLeave}') === 4
    && str_contains($header, 'event.currentTarget.open = false')
    && str_contains($header, 'onKeyDown={closeOnEscape}')
    && ! str_contains($navCss, '.pm-member-home-nav-group:focus-within > .pm-member-home-submenu'),
    'All four nav menus close on mouse leave without disabling Escape or keyboard activation');

$check(str_contains($navCss, '.pm-member-home-nav-group[open] > .pm-member-home-submenu')
    && str_contains($navCss, '.pm-member-home-nav-group:hover > .pm-member-home-submenu'),
    'Dropdowns still support hover and open-on-click before pointer exit');
