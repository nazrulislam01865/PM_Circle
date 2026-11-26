import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('event routes use published database data and gated writes', () => {
    const routes = read('routes/web.php');
    const controller = read('app/Http/Controllers/PublicSite/EventPreviewController.php');
    assert.match(routes, /Route::get\('\/events', \[EventPreviewController::class, 'index'\]\)/);
    assert.match(routes, /Route::post\('\/events', \[EventPreviewController::class, 'store'\]\)/);
    assert.match(routes, /Route::post\('\/events\/\{slug\}\/register'/);
    assert.match(routes, /Route::post\('\/events\/\{slug\}\/comments'/);
    assert.match(controller, /CommunityEvent::query\(\)->published\(\)->upcoming\(\)/);
    assert.match(controller, /->paginate\(10, CommunityEvent::listingColumns\(\)\)/);
    assert.doesNotMatch(controller, /PrototypeEventCatalog/);
});

test('listing uses server search, filters, ads and shared pagination', () => {
    const page = read('resources/js/pages/events/Index.tsx');
    for (const term of ['Advertisements', 'HostPromotion', 'EventListingRow', 'setPlaying', 'setFormat', 'setSort', 'setSearch', 'events.data', 'LinkedPagination', 'Clear filters', 'content.advertisements', 'Create event']) assert.ok(page.includes(term), term);
    assert.match(page, /<PublicLayout siteLayout homePrototype guideLayout eventPrototype/);
    assert.doesNotMatch(page, /Sample placements|sample data|const advertisements/);
});

test('event detail retains approved sections and renders event-specific data', () => {
    const page = read('resources/js/pages/events/Show.tsx');
    for (const term of ['EventRegistration', 'EventAbout', 'EventLocation', 'RelatedEvents', 'EventDiscussion', 'Register for this event', 'About the event', 'Event location', 'Public discussion', 'Agenda', 'Speakers', 'Full name', 'Email address', 'Phone number', 'Current role or student status', 'Post comment', 'Open in Google Maps', 'event.mapUrl', 'event.coverUrl', 'event.agenda', 'event.speakers']) assert.ok(page.includes(term), term);
    assert.match(page, /<PublicLayout siteLayout homePrototype guideLayout eventPrototype/);
    assert.doesNotMatch(page, /careerPreview|initialComments|agargaon-venue-preview/);
});

test('registration and discussion persist with deduplication and moderation', () => {
    const page = read('resources/js/pages/events/Show.tsx');
    const controller = read('app/Http/Controllers/PublicSite/EventPreviewController.php');
    const migration = read('database/migrations/2026_11_25_000001_create_community_events.php');
    assert.match(page, /form\.post/);
    assert.match(page, /disabled=\{form.processing\}/);
    assert.match(controller, /insertOrIgnore/);
    assert.match(controller, /lockForUpdate/);
    assert.match(controller, /'status' => 'pending'/);
    assert.match(controller, /where\('status', 'approved'\)/);
    assert.match(migration, /unique\(\['event_id', 'email'\]\)/);
    assert.match(migration, /unique\(\['event_id', 'user_id'\]\)/);
    assert.doesNotMatch(page, /Sample form|browser tab/);
});

test('shared editor and administrator approval preserve member access boundaries', () => {
    const editor = read('resources/js/components/events/EventEditor.tsx');
    const writer = read('app/Domain/Events/EventWriter.php');
    const admin = read('app/Http/Controllers/Admin/CommunityEventController.php');
    assert.match(read('resources/js/pages/events/Create.tsx'), /<EventEditor\/>/);
    assert.match(read('resources/js/pages/admin/EventEditor.tsx'), /<EventEditor event=\{event\} admin\/>/);
    for (const term of ['cover_image', 'map_image', 'agenda', 'speakers', 'registration_open', 'discussion_open']) assert.ok(editor.includes(term), term);
    assert.match(writer, /\$data\['status'\] = 'pending'/);
    assert.match(writer, /\$data\['sponsored'\] = \$admin &&/);
    assert.match(admin, /->where\('event_id', \$event->id\)->where\('id', \$comment\)/);
    assert.match(admin, /HomePageContent::query\(\)->updateOrCreate/);
});

test('header Events navigation and footer Events fallback open new listing from every page', () => {
    const header = read('resources/js/components/home/v2/HomeHeader.tsx');
    const footer = read('resources/js/components/home/v2/HomeFooter.tsx');
    assert.match(header, /<Link href="\/events" onClick=\{close\}>Events<\/Link>/);
    assert.doesNotMatch(header, /eventsHref|#pm-v2-events-title/);
    assert.ok(read('app/Support/Admin/SiteFooterContent.php').includes("$link('Events', '/events')"));
    assert.doesNotMatch(footer, /Homepage design mockup|Sample content/);
});

test('events use the exact guideline rail, shared control classes and no missing design variables', () => {
    const css = read('resources/css/pm-events.css');
    const tokens = read('resources/css/pm-design-tokens.css');
    const app = read('resources/css/app.css');
    const used = [...new Set([...css.matchAll(/var\((--pm-(?:guide|event)-[\w-]+)/g)].map(match => match[1]))];
    for (const variable of used) assert.ok(tokens.includes(`${variable}:`), `Missing design token ${variable}`);
    for (const breakpoint of ['max-width: 33.75rem', 'max-width: 40.625rem', 'max-width: 53.125rem']) assert.ok(css.includes(breakpoint));
    assert.match(css, /width: var\(--pm-v2-container-width\)/);
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

test('event forms use shared dropdowns and local image upload with accessible previews', () => {
    const editor = read('resources/js/components/events/EventEditor.tsx');
    const upload = read('resources/js/components/pm/ImageUploadField.tsx');
    for (const page of [editor, read('resources/js/pages/admin/Events.tsx'), read('resources/js/pages/events/Index.tsx')]) {
        assert.match(page, /PMDropdown/);
        assert.doesNotMatch(page, /<select\b/);
    }
    assert.match(editor, /ImageUploadField/);
    assert.match(editor, /ProgressBar/);
    for (const term of ['URL.createObjectURL', 'URL.revokeObjectURL', 'onDrop', 'Choose image', 'Replace image', 'Clear selection', 'Remove image', 'Undo removal', 'role="alert"']) assert.ok(upload.includes(term), term);
    assert.doesNotMatch(upload, /fetch\(|axios\.|router\.post/);
    assert.match(read('resources/css/app.css'), /@import '\.\/pm-image-upload\.css'/);
});

test('map link is additive, validated, persisted and used with address fallback', () => {
    const editor = read('resources/js/components/events/EventEditor.tsx');
    const request = read('app/Http/Requests/Events/SaveEventRequest.php');
    const writer = read('app/Domain/Events/EventWriter.php');
    const model = read('app/Models/CommunityEvent.php');
    const detail = read('resources/js/pages/events/Show.tsx');
    const migration = read('database/migrations/2026_11_25_000002_add_map_link_to_community_events.php');
    assert.match(editor, /Google Maps link \(optional\)/);
    assert.match(editor, /form\.data\.format === 'in-person'/);
    assert.match(request, /'map_link' => \['exclude_if:format,online', 'nullable', 'string', 'max:2048', 'url:https'/);
    assert.match(request, /maps\.app\.goo\.gl/);
    assert.match(writer, /\$data\['map_link'\] = null/);
    assert.match(writer, /\$request->boolean\('remove_'\.\$field\)/);
    assert.match(model, /'mapLink' => \$this->map_link/);
    assert.match(detail, /event\.mapLink \|\| `https:\/\/www\.google\.com\/maps\/search/);
    assert.match(migration, /\$table->string\('map_link', 2048\)->nullable\(\)/);
});
