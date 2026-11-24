import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// An app-wide source audit, not a claim of pixel-perfect browser verification.
// The only source of approved type sizing is the Nov 23 HTML design guideline.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = file => readFileSync(path.join(root, file), 'utf8');
const cssDir = path.join(root, 'resources/css');
const cssNames = readdirSync(cssDir).filter(name => name.endsWith('.css'));
const pageDir = path.join(root, 'resources/js/pages');
const allFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? allFiles(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const pageNames = allFiles(pageDir).filter(name => name.endsWith('.tsx'));
const allClientNames = allFiles(path.join(root, 'resources/js')).filter(name => name.endsWith('.tsx'));
const allCss = cssNames.map(name => [name, read(`resources/css/${name}`)]);
const tokenCss = read('resources/css/pm-design-tokens.css');
const appCss = read('resources/css/app.css');
const ref = read('PM_Circle_Design_Guidelines (1).html').split('@font-face')[0];
const token = (name) => tokenCss.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`))?.[1]?.trim();

// The guide is scoped to .pm in its example HTML, whereas the application uses
// several actual layout roots. They must share canonical font and roles.
test('latest guide governs all public, member, admin and authentication typography roles', () => {
    assert.match(ref, /--pm-font: Inter, system-ui, Arial, sans-serif/);
    assert.match(ref, /font: 400 1rem\/1\.6 var\(--pm-font\)/);
    for (const [name, expected] of Object.entries({
        'text-body': '1rem', 'line-body': '1.6',
        'text-h1': 'var(--pm-guide-text-h1)', 'line-h1': 'var(--pm-guide-line-h1)',
        'text-h2': 'var(--pm-guide-text-h2)', 'line-h2': 'var(--pm-guide-line-h2)',
        'text-h3': 'var(--pm-guide-text-h3)', 'line-h3': 'var(--pm-guide-line-h3)',
        'text-h4': 'var(--pm-guide-text-h4)', 'line-h4': 'var(--pm-guide-line-h4)',
        'text-sm': 'var(--pm-guide-text-meta)', 'text-ui': '.875rem',
        'type-lead': 'var(--pm-guide-text-lead)',
        'pm-v2-font-body': 'var(--pm-guide-text-body)',
        'pm-v2-font-body-mobile': 'var(--pm-guide-text-body)',
        'pm-v2-font-ui': 'var(--pm-guide-text-control)',
        'pm-v2-font-hero': 'var(--pm-guide-text-h1)',
        'pm-v2-font-section-heading': 'var(--pm-guide-text-h2)',
    })) assert.equal(token(name), expected, `${name} differs from HTML guideline`);
    assert.match(read('resources/views/app.blade.php'), /Inter:wght@400;600;700/);
    assert.match(appCss, /h1 \{ font-size: var\(--text-h1\); line-height: var\(--line-h1\);/);
    assert.match(appCss, /h2 \{ font-size: var\(--text-h2\); line-height: var\(--line-h2\);/);
    assert.match(appCss, /h3 \{ font-size: var\(--text-h3\); line-height: var\(--line-h3\);/);
    assert.match(appCss, /h4 \{ font-size: var\(--text-h4\); line-height: var\(--line-h4\);/);
    assert.doesNotMatch(appCss, /--text-h1: 1\.5rem/, 'mobile headings may not shrink below the guide minimum');
});

test('all 83 CSS modules centralize typography declarations and use defined type variables', () => {
    assert.ok(cssNames.length >= 80, `Expected complete CSS inventory, got ${cssNames.length}`);
    const declared = new Set([...allCss.flatMap(([, css]) => [...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))]);
    let count = 0;
    for (const [name, css] of allCss) {
        for (const match of css.matchAll(/(?<![\w-])(font-size|font-family|font-weight|line-height|font)\s*:\s*([^;{}]+)/g)) {
            const [, property, value] = match;
            const size = value.trim();
            count++;
            assert.ok(/var\(--/.test(size) || size === 'inherit' || (property === 'font-size' && size === '0'), `${name}: uncentralized ${property}: ${size}`);
            for (const v of size.matchAll(/var\(\s*(--[\w-]+)/g)) {
                assert.ok(declared.has(v[1]), `${name}: missing definition for ${v[1]}`);
            }
        }
    }
    assert.ok(count > 3000, `Suspiciously small CSS typography inventory: ${count}`);
});

test('every React page and shared component avoids independent font families or literal font sizes', () => {
    assert.ok(pageNames.length >= 70, `Missing page family: ${pageNames.length}`);
    assert.ok(allClientNames.length >= 200, `Missing shared components: ${allClientNames.length}`);
    const allowDynamicAvatar = 'resources/js/components/pm/Avatar.tsx';
    for (const file of allClientNames) {
        const relative = path.relative(root, file);
        const source = readFileSync(file, 'utf8');
        for (const m of source.matchAll(/\b(fontFamily|fontSize)\s*:\s*([^,}\n]+)/g)) {
            if (relative === allowDynamicAvatar && m[1] === 'fontSize' && /Math\.max\(11/.test(m[2])) continue;
            assert.match(m[2], /var\(--/, `${relative}: independent ${m[1]}=${m[2]}`);
        }
        for (const m of source.matchAll(/(?:text|font)-\[([^\]]+)\]/g)) {
            // Bracketed Tailwind typography is allowed only when it uses a shared token.
            if (/^text-\[/.test(m[0])) assert.match(m[1], /var\(--/, `${relative}: arbitrary type size ${m[0]}`);
        }
    }
});

test('member/admin/public/auth roots all inherit shared Inter rather than loading their own fonts', () => {
    for (const file of [
        'resources/js/layouts/pm/PublicLayout.tsx',
        'resources/js/layouts/pm/MemberDashboardLayout.tsx',
        'resources/js/layouts/admin/AdminLayout.tsx',
        'resources/js/layouts/pm/AuthPageFrame.tsx',
    ]) assert.ok(read(file).length > 0, `Missing ${file}`);
    for (const selector of ['.pm-app', '.pm-admin', '.pm-dashboard']) {
        assert.ok(allCss.some(([, css]) => css.includes(selector)), `Root ${selector} has no stylesheet`);
    }
    assert.match(appCss, /html \{ font-family: var\(--font-ui\); \}/);
    assert.match(appCss, /body \{\s*font-family: var\(--font-ui\);\s*font-size: var\(--text-body\);/);
});
