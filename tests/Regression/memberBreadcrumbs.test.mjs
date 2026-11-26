import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { memberBreadcrumbs } from '../../resources/js/components/dashboard/memberBreadcrumbs.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const labels = (url, props, fallback) => memberBreadcrumbs(url, props, fallback).map(item => item.label);

test('member navigation destinations have a consistent Home-rooted trail', () => {
    const routes = {
        '/dashboard': ['Home'], '/learning': ['Home','Learn & Practice','Browse courses'],
        '/dashboard/learning?tab=my-learning': ['Home','Learn & Practice','My learning'],
        '/dashboard/learning/certificates': ['Home','Learn & Practice','Certificates'],
        '/exams/pmp': ['Home','Learn & Practice','Exam Simulator','PMP exams'],
        '/exams/scrum': ['Home','Learn & Practice','Exam Simulator','Scrum / CSM exams'],
        '/dashboard/daily-challenge': ['Home','Learn & Practice','Daily challenge'],
        '/settings/profile': ['Home','Profile & career','My profile'],
        '/settings/profile?tab=edit': ['Home','Profile & career','My profile','Edit profile'],
        '/settings/profile?tab=privacy': ['Home','Profile & career','My profile','Privacy'],
        '/settings/profile?tab=assistant': ['Home','Profile & career','AI Resume Assistant'],
        '/dashboard/resume-assistant': ['Home','Profile & career','AI Resume Assistant'],
        '/interview-preparation': ['Home','Profile & career','Interview preparation'],
        '/dashboard/features/achievements': ['Home','Profile & career','Achievements'],
        '/community': ['Home','Community','Community feed'], '/members': ['Home','Community','Members'],
        '/saved-posts': ['Home','Community','Saved posts'], '/membership': ['Home','Account','Plan & usage'],
        '/settings/account': ['Home','Account','Settings'], '/settings/security': ['Home','Account','Settings','Security'],
        '/settings/appearance': ['Home','Account','Settings','Appearance'], '/activity-log': ['Home','Account','Activity log'],
        '/dashboard/features/notifications': ['Home','Account','Notifications'], '/help-center': ['Home','Help Centre'],
    };
    for (const [url, expected] of Object.entries(routes)) {
        assert.deepEqual(labels(url), expected, url);
        const items = memberBreadcrumbs(url);
        assert.equal(items.at(-1).href, undefined, url);
        if (items.length > 1) assert.equal(items[0].href, '/dashboard', url);
        for (const item of items) if (item.href) assert.match(item.href, /^\/(?!\/)/, url);
    }
});

test('deep course, exam, interview and community pages preserve their parent routes', () => {
    const props = {course:{title:'Agile & Scrum Fundamentals'},lesson:{title:'Incremental delivery'}};
    const lesson = memberBreadcrumbs('/dashboard/learning/courses/agile/lessons/2', props);
    assert.deepEqual(lesson.map(item => item.label), ['Home','Learn & Practice','My learning','Agile & Scrum Fundamentals','Incremental delivery']);
    assert.equal(lesson.at(-2).href, '/learning/courses/agile');
    assert.deepEqual(labels('/learning/courses/agile/practice/10/result',props), ['Home','Learn & Practice','Browse courses','Agile & Scrum Fundamentals','Practice result']);
    assert.equal(memberBreadcrumbs('/exams/pmp/attempts/42/review').at(-2).href, '/exams/pmp');
    assert.equal(labels('/exams/pmp/attempts/42/result').at(-1), 'Exam result');
    assert.equal(labels('/interview-preparation/sessions/3').at(-1),'Practice interview');
    assert.equal(memberBreadcrumbs('/interview-preparation/results/3').at(-2).href, '/interview-preparation/results');
    assert.equal(labels('/members/5',{member:{name:'Member Name'}}).at(-1), 'Member Name');
    assert.equal(labels('/scenarios/scenario-one',{scenario:{title:'Managing change'}}).at(-1), 'Managing change');
    assert.equal(labels('/events/event-one',{event:{title:'PM event'}}).at(-1), 'PM event');
    assert.equal(labels('/help-center/requests/3').at(-1), 'Support request');
    assert.equal(labels('/dashboard/learning/certificates/reference').at(-1), 'Certificate');
    assert.equal(labels('/learning/student-beginner/modules/1/activities/2',{path:{level:'Beginner'},activity:{title:'Activity'}}).at(-1),'Activity');
});

test('aliases, query strings, fallback and non-navigable groups are safe', () => {
    assert.deepEqual(memberBreadcrumbs('/learning?tab=courses&page=2'),memberBreadcrumbs('/dashboard/learning?tab=courses'));
    assert.deepEqual(memberBreadcrumbs('/exams/pmp?tab=ai'),memberBreadcrumbs('/exams/pmp/'));
    assert.equal(memberBreadcrumbs('/exams/pmp').find(item => item.label === 'Exam Simulator').href, undefined);
    assert.deepEqual(memberBreadcrumbs('/unknown-route'), []);
    assert.deepEqual(labels('/unknown-route',{}, {title:'Page title',parents:[{label:'Parent',href:'/learning'}]}),['Home','Parent','Page title']);
    assert.deepEqual(labels('/settings/profile?tab=imports'), ['Home','Profile & career','My profile']);
});

test('one member layout owns the accessible trail and suppresses only replaced member legacy trails', () => {
    const layout = read('resources/js/layouts/pm/MemberDashboardLayout.tsx');
    const publicLayout = read('resources/js/layouts/pm/PublicLayout.tsx');
    const view = read('resources/js/components/dashboard/MemberBreadcrumb.tsx');
    const css = read('resources/css/pm-member-breadcrumb.css');
    assert.match(layout, /memberBreadcrumbs\(page.url, page.props, breadcrumbFallback\)/);
    assert.match(layout, /<MemberBreadcrumb items=\{breadcrumbs\}\/>\{children\}/);
    assert.match(publicLayout, /<MemberDashboardLayout dashboard=\{memberShell\} breadcrumbFallback=\{banner\}/);
    assert.match(view, /<nav className="pm-member-breadcrumb" aria-label="Breadcrumb">/);
    assert.match(view, /aria-current=\{last \? 'page' : undefined\}/);
    assert.match(view, /<Link href=\{item.href\}>/);
    assert.match(css, /font-size: var\(--pm-guide-text-meta\)/);
    assert.match(css, /font-family: var\(--pm-guide-font\)/);
    assert.match(css, /flex-wrap: wrap/);
    assert.match(css, /\.pm-dash-body\[data-member-breadcrumb="shared"\] :is\(nav\[aria-label="Breadcrumb"\]:not\(\.pm-member-breadcrumb\)/);
    assert.match(read('resources/css/app.css'), /@import "\.\/pm-member-breadcrumb.css"/);
    assert.doesNotMatch(css,/position:\s*(sticky|fixed)/);
});
