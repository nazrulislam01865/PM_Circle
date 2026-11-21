import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('V2 scenario and community post content aligns with author name without shifting the action bars', () => {
    const tokens = read('resources/css/pm-design-tokens.css');
    const sections = read('resources/css/pm-home-v2-sections.css');
    const scenario = read('resources/js/components/home/v2/HomeCommunity.tsx');
    const post = read('resources/js/components/community/PostCardV2.tsx');
    assert.match(tokens, /--pm-v2-post-avatar-size: 2\.625rem/);
    assert.match(tokens, /--pm-v2-post-content-indent: calc\(var\(--pm-v2-post-avatar-size\) \+ var\(--s2\)\)/);
    assert.match(sections, /\.pm-v2-scenario-card \.pm-v2-post-content,\s*\.pm-v2-post-card \.pm-v2-post-content \{[^}]*margin-inline-start: var\(--pm-v2-post-content-indent\)/);
    assert.match(sections, /\.pm-v2-post-author \{[^}]*gap: var\(--s2\)/);
    assert.match(scenario, /className="pm-v2-post-content"/);
    assert.match(post, /className="pm-v2-post-content"/);
    assert.match(scenario, /EngagementActionBar/);
    assert.match(post, /PostEngagementActions/);
    assert.doesNotMatch(sections, /\.pm-v2-post-actions\s*\{[^}]*margin-inline-start/);
});

test('mobile post content uses the same unindented layout as the canonical feed and font tokens stay central', () => {
    const responsive = read('resources/css/pm-home-v2-responsive.css');
    const tokens = read('resources/css/pm-design-tokens.css');
    const layouts = ['pm-home-v2-layout.css','pm-home-v2-sections.css','pm-home-v2-responsive.css'];
    assert.match(responsive, /max-width: 42rem[^}]*\{\s*\.pm-v2-scenario-card \.pm-v2-post-content,\s*\.pm-v2-post-card \.pm-v2-post-content \{ margin-inline-start: 0/);
    assert.match(tokens, /--font-ui: "Inter"/);
    for (const file of layouts) {
        const css = read('resources/css/' + file);
        assert.doesNotMatch(css, /font-size:\s*(?!0\s*;)(?:\d+(?:\.\d+)?(?:px|rem)|clamp\()/);
    }
    assert.match(read('resources/css/pm-home-v2-layout.css'), /font-family: var\(--font-ui\)/);
});
