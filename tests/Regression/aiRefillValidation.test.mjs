import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRefill, refillServerErrors } from '../../resources/js/lib/ai-refill-validation.ts';

const valid = { kind: 'add', title: 'Starter', credits: '50000', price: '300.25', expiry: '10', reason: 'Approved offer' };
test('reports all missing required fields before submitting, not optional expiry', () => {
    const { errors } = validateRefill({ kind: 'add', title: ' ', credits: '', price: '', expiry: '', reason: ' ' });
    assert.deepEqual(Object.keys(errors), ['title', 'credits', 'price', 'reason']);
});
test('matches server ranges and keeps exact minor-unit prices', () => {
    assert.deepEqual(validateRefill(valid), { errors: {}, priceMinor: 30025 });
    assert.deepEqual(validateRefill({ ...valid, kind: 'edit', price: '0.01', credits: '1', expiry: '' }), { errors: {}, priceMinor: 1 });
    assert.deepEqual(validateRefill({ ...valid, price: '1000000', credits: '100000', expiry: '3650' }), { errors: {}, priceMinor: 100000000 });
    for (const price of ['0', '-1', '1.001', '1000000.01', 'NaN', '1e2']) assert.ok(validateRefill({ ...valid, price }).errors.price);
    for (const credits of ['0', '100001', '1.5', '1e2']) assert.ok(validateRefill({ ...valid, credits }).errors.credits);
    for (const expiry of ['0', '3651', '1.5', 'abc']) assert.ok(validateRefill({ ...valid, expiry }).errors.expiry);
    assert.ok(validateRefill({ ...valid, title: 'a'.repeat(121) }).errors.title);
    assert.ok(validateRefill({ ...valid, reason: 'a'.repeat(501) }).errors.reason);
});
test('removal requires only an audit reason', () => {
    assert.deepEqual(validateRefill({ kind: 'archive', title: '', credits: '', price: '', expiry: '', reason: '' }).errors, { reason: 'Enter a change reason for the audit record.' });
    assert.deepEqual(validateRefill({ ...valid, kind: 'archive' }), { errors: {}, priceMinor: 0 });
});
test('maps all server field errors and retains non-field errors', () => {
    assert.deepEqual(refillServerErrors({ price_minor: ['Price invalid'], expires_after_days: ['Days invalid'], reason: ['Required'], replace_id: ['Stale'] }), { fields: { price: 'Price invalid', expiry: 'Days invalid', reason: 'Required' }, general: ['Stale'] });
});
test('refill editor opts out of native validation and renders accessible inline errors and right aligned actions', () => {
    const page = readFileSync(new URL('../../resources/js/pages/admin/AiRefillPackages.tsx', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../../resources/css/pm-admin.css', import.meta.url), 'utf8');
    assert.match(page, /<form[^>]+noValidate>/);
    assert.equal((page.match(/\{requiredMark\}/g) ?? []).length, 4);
    for (const field of ['title', 'credits', 'price', 'expiry', 'reason']) {
        assert.ok(page.includes(`fieldProps('${field}')`));
        assert.ok(page.includes(`fieldError('${field}')`));
    }
    assert.match(page, /aria-describedby/);
    assert.match(page, /aria-invalid/);
    assert.match(page, /if \(Object.keys\(errors\).length\) return;/);
    assert.match(page, /response.status === 422/);
    assert.match(css, /\.pm-refill-admin \.pm-refill-required\{color:var\(--red\)/);
    assert.match(css, /\.pm-admin-content:has\(>\.pm-refill-admin\)>\.pm-admin-page-heading\{display:flex;align-items:center;justify-content:space-between/);
    assert.match(css, /\.pm-refill-admin \.pm-refill-save-actions,\.pm-refill-admin \.pm-course-admin-row-actions\{justify-content:flex-end\}/);
});
