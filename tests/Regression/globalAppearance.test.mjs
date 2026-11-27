import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const hook = stripTypeScriptTypes(read('resources/js/hooks/use-appearance.tsx')).replace(/^import[^\n]*\n/m, '').replace(/\bexport\s+/g, '');
const earlyScript = read('resources/views/app.blade.php').match(/<script>([\s\S]*?)<\/script>/)[1];
function browser({ saved = null, cookie = '', mode = 'system', systemDark = false, blocked = false } = {}) {
    const root = { dataset: { appearance: mode }, classList: { toggle: (_, value) => { root.dark = value; } } };
    const events = new Map();
    const media = { matches: systemDark, addEventListener: (name, callback) => events.set(`media:${name}`, callback) };
    let cookieValue = cookie;
    const context = vm.createContext({
        document: { documentElement: root, get cookie() { return cookieValue; }, set cookie(value) { if (!blocked) cookieValue = value.split(';')[0]; } },
        window: { matchMedia: () => media, addEventListener: (name, callback) => events.set(name, callback) },
        localStorage: { getItem: () => { if (blocked) throw Error('blocked'); return saved; }, setItem: (_, value) => { if (blocked) throw Error('blocked'); saved = value; } },
        location: { protocol: 'https:' }, useSyncExternalStore: (_, snapshot) => snapshot(),
    });
    vm.runInContext(earlyScript, context);
    vm.runInContext(hook + '\ninitializeTheme(); globalThis.readAppearance = useAppearance;', context);
    return { root, media, events, get state() { return context.readAppearance(); } };
}
test('saved browser appearance applies before rendering and follows explicit modes', () => {
    const env = browser({ saved: 'dark', mode: 'light' });
    assert.equal(env.root.dark, true);
    assert.equal(env.state.appearance, 'dark');
    assert.equal(env.state.updateAppearance('light'), true);
    assert.equal(env.root.dark, false);
    env.media.matches = true; env.events.get('media:change')();
    assert.equal(env.root.dark, false);
    assert.equal(env.state.updateAppearance('system'), true);
    assert.equal(env.root.dark, true);
    env.media.matches = false; env.events.get('media:change')();
    assert.equal(env.root.dark, false);
});
test('appearance follows storage changes and falls back when persistence is blocked', () => {
    const env = browser({ saved: 'light' });
    env.events.get('storage')({ key: 'appearance', newValue: 'dark' });
    assert.equal(env.root.dark, true);
    const restricted = browser({ mode: 'dark', cookie: 'appearance=dark', blocked: true });
    assert.equal(restricted.root.dark, true);
    assert.equal(restricted.state.updateAppearance('light'), false);
    assert.equal(restricted.root.dark, false);
});
test('all shared workspaces inherit root palette and paper remains independently light', () => {
    const css = read('resources/css/pm-design-tokens.css');
    assert.match(css, /@media screen\s*\{\s*:root\.dark\s*\{/);
    for (const key of ['surface','pm-guide-ink','pm-guide-body-color','pm-guide-soft','pm-guide-blue','pm-guide-line','pm-action-blue','popover','sidebar']) assert.match(css.slice(css.indexOf('/* Global dark palette')), new RegExp(`--${key}:`));
    assert.match(css, /:root\.dark :is\(\.pm-resume-paper, \.pm-course-certificate-sheet\)\s*\{\s*color-scheme: light;/);
    assert.doesNotMatch(css, /\.pm-settings-theme-dark/);
    assert.match(read('resources/js/app.tsx'), /initializeTheme\(\);\s*void createInertiaApp/);
    assert.match(read('resources/css/pm-admin.css'), /\.pm-admin-button-primary\{background:var\(--pm-action-blue\);[^}]*color:var\(--pm-on-solid\)/);
});
