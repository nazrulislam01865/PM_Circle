import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const header = read('resources/js/components/dashboard/MemberHomeHeader.tsx');
const navigation = read('resources/js/components/dashboard/memberNavigation.ts');

test('guest header uses the same concise primary labels as the member header', () => {
    assert.match(header, /href=\{isMember \? '\/dashboard' : '\/'\}[\s\S]*?<Home className="pm-nav-icon" aria-hidden="true"\/>Home/);
    assert.match(header, /\{daily && <Link[\s\S]*?<CalendarCheck2 className="pm-nav-icon" aria-hidden="true"\/>Challenge/);
    assert.match(header, /<MessagesSquare className="pm-nav-icon" aria-hidden="true"\/>Community<ChevronDown/);
    assert.match(header, /<BookOpen className="pm-nav-icon" aria-hidden="true"\/>Learn<ChevronDown/);
    assert.match(header, /<ClipboardCheck className="pm-nav-icon" aria-hidden="true"\/>Exams<ChevronDown/);
    assert.doesNotMatch(header, /\{daily\.label\}|\{learning\.label\}/);
});

test('guest Community, Learn, and Exams retain their dropdowns and existing links', () => {
    assert.match(header, /\(community \|\| members\) && <details[^>]+onKeyDown=\{closeOnEscape\}[^>]+onMouseLeave=\{closeDropdownOnMouseLeave\}/);
    assert.match(header, /\{learning && <details[^>]+onKeyDown=\{closeOnEscape\}/);
    assert.match(header, /<details className="pm-member-home-nav-group pm-member-home-exam-group"/);
    for (const link of ['Feed', 'Members', 'Course Library', 'Project Simulator', 'PMP Exam Simulator', 'Scrum Simulator']) {
        assert.match(header, new RegExp(`>${link}<\\/Link>`));
    }
    assert.match(read('resources/css/pm-header-prototype.css'), /\.pm-member-home-nav-home \.pm-nav-icon \{ margin-inline: 0; \}/);
});

test('member Community secondary navigation contains Feed and Members only', () => {
    const community = navigation.match(/community:\s*\[([\s\S]*?)\],\s*learn:/)?.[1] ?? '';
    assert.match(community, /label: 'Feed'/);
    assert.match(community, /label: 'Members'/);
    assert.doesNotMatch(community, /Topics|Saved posts/);
    // Do not remove the pages or alter their direct URL handling.
    assert.match(navigation, /path === '\/saved-posts'/);
    assert.match(navigation, /query\.has\('topic'\)/);
});
