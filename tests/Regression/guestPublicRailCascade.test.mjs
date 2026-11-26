import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = read('resources/css/pm-public-layout-consistency.css');
const app = read('resources/css/app.css');
const layout = read('resources/js/layouts/pm/PublicLayout.tsx');
const course = read('resources/js/pages/learning/CourseShow.tsx');
const footer = read('resources/js/components/pm/SiteFooter.tsx');

test('guest content, header and shared footer use a rule stronger than the legacy site-wide container', () => {
    assert.match(css, /\.pm-app\.pm-page-shell\.pm-guest-public-shell > main \.pm-container\s*\{[^}]*width:\s*var\(--pm-v2-container-width\)/s);
    assert.match(css, /\.pm-app\.pm-page-shell\.pm-guest-public-shell > \.pm-v2-header \.pm-v2-header-inner/);
    assert.match(css, /\.pm-app\.pm-page-shell\.pm-guest-public-shell > \.pm-v2-site-footer \.pm-v2-container/);
    assert.match(app, /@import '\.\/pm-public-layout-consistency\.css';/);
    assert.match(layout, /isPublicView \? ' pm-guest-public-shell'/);
});

test('guest course canvas matches the shared catalog while the rail and footer are preserved', () => {
    assert.match(css, /\.pm-app\.pm-page-shell\.pm-guest-public-shell > main \.pm-course-detail\s*\{[^}]*background:\s*var\(--canvas\)/s);
    assert.match(course, /<CourseDetailHero course=\{course\}/);
    assert.match(course, /<CourseDetailTabs onChange=\{jump\}/);
    assert.match(course, /<CourseAccessCard course=\{course\}/);
    assert.match(footer, /<HomeFooter content=\{content\}/);
});
