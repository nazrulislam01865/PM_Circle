import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const exists = path => existsSync(new URL(`../../${path}`, import.meta.url));

test('public event listing and details use named GET routes, no booking endpoint or database calls', () => {
    const routes = read('routes/web.php');
    const controller = read('app/Http/Controllers/PublicSite/EventPreviewController.php');
    assert.match(routes, /Route::get\('\/events', \[EventPreviewController::class, 'index'\]\)/);
    assert.match(routes, /Route::get\('\/events\/\{slug\}', \[EventPreviewController::class, 'show'\]\)/);
    assert.match(controller, /PrototypeEventCatalog::find\(\$slug\)/);
    assert.match(controller, /abort_if\(\$event === null, 404\)/);
    assert.match(controller, /'relatedEvents' => PrototypeEventCatalog::relatedTo\(\$event\)/);
    assert.doesNotMatch(controller, /DB::|::query\(|->create\(|->save\(/);
});

test('listing retains original filters, two-slide advertisements and pagination', () => {
    const page = read('resources/js/pages/events/Index.tsx');
    for (const term of ['Advertisements', 'HostPromotion', 'EventListingRow', 'PAGE_SIZE = 10', 'setPlaying', 'setFormat', 'setSort', 'setSearch', 'setPage', 'filtered.slice', 'Clear filters']) {
        assert.match(page, new RegExp(term));
    }
    assert.match(page, /<PublicLayout siteLayout homePrototype guideLayout eventPrototype/);
    assert.doesNotMatch(page, /router\.post|fetch\(|axios\./);
});

test('event detail matches supplied public sponsored-event sections and reuses homepage layout', () => {
    const page = read('resources/js/pages/events/Show.tsx');
    for (const term of ['A career briefing for aspiring project coordinators', 'EventRegistration', 'EventAbout', 'EventLocation', 'RelatedEvents', 'EventDiscussion', 'Register for this event', 'About the event', 'Event location', 'Public discussion', 'Agenda', 'Speakers', 'Full name', 'Email address', 'Phone number', 'Current role or student status', 'Post comment', 'Open in Google Maps']) {
        assert.ok(page.includes(term), `Missing details feature: ${term}`);
    }
    assert.match(page, /<PublicLayout siteLayout homePrototype guideLayout eventPrototype/);
    assert.match(page, /src="\/images\/events\/agargaon-venue-preview\.webp"/);
    assert.ok(exists('public/images/events/agargaon-venue-preview.webp'));
    assert.ok(exists('public/images/home/prototype/leader.webp'));
});

test('registration and comments stay local to browser tab and do not pretend to book or publish', () => {
    const page = read('resources/js/pages/events/Show.tsx');
    assert.match(page, /Prototype only\. Use sample details\. Entries stay in this browser tab/);
    assert.match(page, /No event booking, email or registration was created/);
    assert.match(page, /It has not been published/);
    assert.match(page, /eventAction\.preventDefault\(\)/);
    assert.match(page, /event\.preventDefault\(\)/);
    assert.match(page, /type="email"/);
    assert.match(page, /type="tel"/);
    assert.match(page, /maxLength=\{1500\}/);
    assert.doesNotMatch(page, /router\.post|fetch\(|axios\.|localStorage|sessionStorage/);
});

test('header Events navigation and footer Events fallback open new listing from every page', () => {
    const header = read('resources/js/components/home/v2/HomeHeader.tsx');
    const footer = read('resources/js/components/home/v2/HomeFooter.tsx');
    assert.match(header, /<Link href="\/events" onClick=\{close\}>Events<\/Link>/);
    assert.doesNotMatch(header, /eventsHref|#pm-v2-events-title/);
    assert.match(footer, /\{ href: '\/events', label: 'Events' \}/);
    assert.doesNotMatch(footer, /Homepage design mockup|Sample content/);
});

test('events use the exact guideline rail, shared control classes and no missing design variables', () => {
    const css = read('resources/css/pm-events.css');
    const tokens = read('resources/css/pm-design-tokens.css');
    const app = read('resources/css/app.css');
    const used = [...new Set([...css.matchAll(/var\((--pm-(?:guide|event)-[\w-]+)/g)].map(match => match[1]))];
    for (const variable of used) assert.ok(tokens.includes(`${variable}:`), `Missing design token ${variable}`);
    for (const breakpoint of ['max-width: 33.75rem', 'max-width: 40.625rem', 'max-width: 53.125rem']) assert.ok(css.includes(breakpoint));
    assert.match(css, /width: min\(var\(--pm-guide-container\), calc\(100% - 2 \* var\(--pm-guide-gutter\)\)\)/);
    assert.doesNotMatch(css, /70\.2vw|90vw|--pm-v2-container-width:/);
    assert.match(css, /\.pm-event-listing-copy p \{[^}]*font-size: var\(--pm-guide-text-body\)/);
    assert.match(css, /\.pm-event-listing-copy p\.pm-event-meta \{[^}]*font-size: var\(--pm-guide-text-meta\)/);
    assert.match(css, /\.pm-event-detail-panel > p \{[^}]*font-size: var\(--pm-guide-text-body\)/);
    assert.match(css, /\.pm-event-description \{[^}]*font-size: var\(--pm-guide-text-body\)/);
    assert.doesNotMatch(css, /\.pm-events-page \.pm-event-button|\.pm-event-registration-form :is\(input,textarea\)|\.pm-event-filters :is\(input,select\)/);
    const shared = read('resources/css/pm-ui-guideline.css');
    assert.match(shared, /\.pm-guide-public-shell \.pm-guide-button/);
    assert.match(shared, /\.pm-guide-public-shell \.pm-guide-control/);
    assert.match(shared, /border: 1px solid var\(--pm-guide-control-line\)/);
    assert.match(shared, /\.pm-guide-public-shell \.pm-guide-field-label/);
    const index = read('resources/js/pages/events/Index.tsx');
    const details = read('resources/js/pages/events/Show.tsx');
    const parts = read('resources/js/components/events/EventComponents.tsx');
    assert.match(index, /className="pm-guide-control"/);
    assert.match(index, /className="pm-guide-field-label"/);
    assert.match(details, /className="pm-guide-control"/);
    assert.match(details, /className="pm-guide-field-label"/);
    assert.match(parts, /pm-guide-button/);
    assert.doesNotMatch(index + details + parts, /pm-event-button/);
    assert.match(app, /@import '\.\/pm-events\.css'/);
});
