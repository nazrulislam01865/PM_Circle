import assert from 'node:assert/strict';
import { test } from 'node:test';
import { examSecondsUntilExpiry, examServerClockOffset, remainingTimePercentage, remainingTimeSeconds } from '../../resources/js/components/exam/examCountdownMath.ts';
import { shouldShowSiteFooter } from '../../resources/js/components/pm/siteFooterVisibility.ts';

test('time bar starts full, shrinks with the same countdown and ends empty', () => {
    assert.equal(remainingTimePercentage(600, 600), 100);
    assert.equal(remainingTimePercentage(599, 600), (599 / 600) * 100);
    assert.equal(remainingTimePercentage(300, 600), 50);
    assert.ok(Math.abs(remainingTimePercentage(1, 600) - (1 / 6)) < 1e-10);
    assert.equal(remainingTimePercentage(0, 600), 0);
    for (let seconds = 600; seconds > 0; seconds--) {
        assert.ok(remainingTimePercentage(seconds - 1, 600) < remainingTimePercentage(seconds, 600));
    }
});

test('resuming an exam retains its original duration rather than resetting the bar to 100%', () => {
    const originalDuration = 600;
    const remainingAtResume = 150;
    assert.equal(remainingTimePercentage(remainingAtResume, originalDuration), 25);
    assert.equal(remainingTimePercentage(149, originalDuration), (149 / 600) * 100);
    assert.notEqual(remainingTimePercentage(remainingAtResume, originalDuration), 100);
});

test('server time sync prevents browser clock drift from keeping the bar full', () => {
    // Backend issued a ten-minute attempt with exactly five minutes remaining.
    const serverNow = '2026-11-16T13:05:00+06:00';
    const expiresAt = '2026-11-16T13:10:00+06:00';
    const clientNowMs = Date.parse('2026-11-16T13:04:30+06:00'); // Laptop is 30s behind.
    const offset = examServerClockOffset(serverNow, clientNowMs);
    assert.equal(offset, 30000);
    const remaining = examSecondsUntilExpiry(expiresAt, clientNowMs, offset);
    assert.equal(remaining, 300);
    assert.equal(remainingTimePercentage(remaining, 600), 50);
    assert.equal(examSecondsUntilExpiry(expiresAt, clientNowMs + 1000, offset), 299);
    assert.equal(examServerClockOffset(undefined, clientNowMs), 0); // Older payloads still work.
    assert.equal(examSecondsUntilExpiry('bad-date', clientNowMs, offset), 0);
});

test('invalid durations and clock drift never show a negative or overfull progress bar', () => {
    assert.equal(remainingTimePercentage(900, 600), 100);
    assert.equal(remainingTimePercentage(-10, 600), 0);
    assert.equal(remainingTimePercentage(Number.NaN, 600), 0);
    assert.equal(remainingTimePercentage(1, 0), 100);
    assert.equal(remainingTimePercentage(5, Number.NaN), 100);
    assert.equal(remainingTimeSeconds(-10, 600), 0);
});

test('shared footer covers public/member/exam results and preserves previously approved focus exceptions', () => {
    for (const path of [
        '/contact', '/community', '/members', '/learning', '/pricing', '/pm-trends',
        '/settings/profile', '/dashboard/features/scrum', '/simulators/scrum',
        '/exam-simulator/pmp', '/exams/pmp', '/exams/pmp/attempts/123/result',
        '/exams/pmp/attempts/123/review', '/exams/pmp?tab=history',
    ]) assert.equal(shouldShowSiteFooter(path), true, `Footer missing on ${path}`);
    for (const path of [
        '/', '/home', '/dashboard', '/dashboard/home', '/exams/pmp/attempts/123',
        '/exams/pmp/attempts/123?active=1', '/admin', '/admin/profile-rewards',
    ]) assert.equal(shouldShowSiteFooter(path), false, `Unexpected footer on ${path}`);
});
