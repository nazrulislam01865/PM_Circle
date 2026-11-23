import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tokens = readFileSync(path.join(root, 'resources/css/pm-design-tokens.css'), 'utf8');
const layout = readFileSync(path.join(root, 'resources/css/pm-home-v2-layout.css'), 'utf8');
const responsive = readFileSync(path.join(root, 'resources/css/pm-home-v2-responsive.css'), 'utf8');

// Make the header independent of the homepage body scale.
test('Homepage navigation uses the canonical 14px UI token, not the 16px body token', () => {
    assert.match(tokens, /--text-ui:\s*\.875rem;/);
    assert.match(tokens, /--pm-v2-font-body:\s*var\(--pm-guide-text-body\);/);
    assert.match(tokens, /--pm-v2-font-header-nav:\s*var\(--text-ui\);/);
    assert.match(layout, /\.pm-v2-header-nav > a, \.pm-v2-header-nav summary, \.pm-v2-header-utilities \.pm-v2-login[^\n]*font-size:\s*var\(--pm-v2-font-header-nav\);/);
    assert.match(layout, /\.pm-v2-nav-dropdown a[^\n]*font-size:\s*var\(--pm-v2-font-header-nav\);/);
    assert.match(layout, /\.pm-v2-header-utilities \.pm-v2-search-toggle[^\n]*font-size:\s*var\(--pm-v2-font-header-nav\);/);
    assert.match(layout, /\.pm-home-v2-shell \.pm-v2-header-utilities \.pm-v2-button[^\n]*font-size:\s*var\(--pm-v2-font-header-nav\);/);
});

test('Narrow header uses the central compact-size token without changing the body scale', () => {
    assert.match(tokens, /--pm-v2-font-header-nav-compact:\s*var\(--pm-guide-text-meta\);/);
    assert.match(responsive, /\.pm-v2-header-nav > a, \.pm-v2-header-nav summary \{ font-size: var\(--pm-v2-font-header-nav-compact\); \}/);
});
