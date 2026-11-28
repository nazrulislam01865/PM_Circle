import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const page = name => read(`resources/js/pages/auth/${name}.tsx`);
const component = name => read(`resources/js/components/${name}.tsx`);
const css = name => read(`resources/css/${name}.css`);

test('remember me uses the theme-aware semantic muted colour', () => {
    assert.match(page('login'), /text-sm text-muted-foreground[^>]*>.*Remember me/);
    assert.doesNotMatch(page('login'), /text-slate-600/);
    assert.match(css('app'), /--color-muted-foreground: var\(--muted-foreground\)/);
    assert.match(css('pm-design-tokens'), /--muted-foreground: var\(--muted\)/);
});

test('email verification success uses the central green token', () => {
    const source = page('verify-email');
    assert.match(source, /status === 'verification-link-sent'[\s\S]*?text-\[color:var\(--green\)\]/);
    assert.doesNotMatch(source, /text-green-600/);
    assert.match(css('pm-design-tokens'), /--green: var\(--pm-guide-green\)/);
    assert.match(source, /<Form \{\.\.\.send\.form\(\)\}/);
});

test('password confirmation, passkey confirmation, and both MFA modes reuse default semantic validation', () => {
    const shared = component('input-error');
    assert.match(shared, /className=\{cn\('pm-validation-error', className\)\}/);
    assert.doesNotMatch(shared, /text-red-|semantic\s*=/);
    assert.match(shared, /return message \?/);
    assert.match(shared, /\) : null;/);
    assert.match(css('pm-circle'), /\.pm-validation-error\s*\{\s*color: var\(--red\); font: var\(--regular\) var\(--text-ui\)\/var\(--line-body\) var\(--font-ui\)/);
    assert.match(css('pm-design-tokens'), /--red: var\(--pm-guide-error\)/);
    assert.match(css('app'), /@import '\.\/pm-circle\.css'/);
    assert.match(page('confirm-password'), /<InputError message=\{errors\.password\}/);
    assert.match(component('passkey-verify'), /<InputError message=\{error\}/);
    assert.match(page('two-factor-challenge'), /<InputError\s+message=\{errors\.recovery_code\}/);
    assert.match(page('two-factor-challenge'), /<InputError message=\{errors\.code\}/);
});

test('legacy registration remains inactive and inherits shared validation without route changes', () => {
    const provider = read('app/Providers/FortifyServiceProvider.php');
    assert.match(provider, /Fortify::registerView\(fn \(\) => Inertia::render\('auth\/RegisterStep1'/);
    assert.doesNotMatch(provider, /Inertia::render\('auth\/register'/);
    assert.equal((page('register').match(/<InputError\b/g) || []).length, 4);
});

test('admin login descriptive copy uses the body role while metadata remains compact', () => {
    const source = css('pm-admin');
    assert.match(page('admin-login'), /className="pm-admin-login-description"/);
    assert.match(source, /\.pm-admin-login-description\{color:var\(--muted\);font-size:var\(--text-body\);line-height:var\(--line-body\)\}/);
    assert.match(source, /\.pm-admin-login-security,\.pm-admin-login-back\{[^}]*font-size:var\(--text-sm\)/);
    assert.match(css('pm-design-tokens'), /--text-body: 1rem;/);
    assert.match(page('admin-login'), /form\.post\('\/admin\/login'/);
});
