// Staging-only load harness. Use distinct synthetic authenticated sessions, never real member cookies.
import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import { Trend } from 'k6/metrics';

const base = (__ENV.PMC_STAGING_URL || '').replace(/\/$/, '');
if (__ENV.PMC_ALLOW_STAGING_LOAD !== 'YES' || !/^https?:\/\//.test(base) || !__ENV.PMC_SESSIONS_FILE) {
    throw new Error('Explicit staging approval, staging URL and synthetic session file are required.');
}
const sessions = new SharedArray('synthetic sessions', () => JSON.parse(open(__ENV.PMC_SESSIONS_FILE)));
const rate = Number(__ENV.PMC_FEED_RATE || 75);
const duration = __ENV.PMC_DURATION || '30m';
const appTime = new Trend('feed_server_ms', true);
const scenario = (r, name, vus) => ({ executor: 'constant-arrival-rate', rate: r, timeUnit: '1s', duration,
    preAllocatedVUs: vus, maxVUs: vus, exec: name });
const feedVus = Number(__ENV.PMC_FEED_VUS || 150);
if (sessions.length < feedVus + 90) throw new Error('Provide enough distinct synthetic sessions for all VUs.');
export const options = {
    scenarios: { feed: scenario(rate, 'feed', feedVus), dashboard: scenario(10, 'dashboard', 30),
        comments: scenario(10, 'comments', 30), reactions: scenario(5, 'reactions', 30) },
    thresholds: { feed_server_ms: ['p(95)<=250', 'p(99)<=750'], http_req_failed: ['rate<=0.001'],
        checks: ['rate==1'], dropped_iterations: ['count==0'], 'http_req_waiting{kind:dashboard}': ['p(95)<=500'] },
};
let cursor = null;
let reacted = false;
function session() { return sessions[exec.vu.idInTest - 1]; }
function headers(extra = {}) { const s = session(); return { Cookie: s.cookie, Accept: 'application/json', 'X-CSRF-TOKEN': s.csrf, ...extra }; }
function initial(only = false) {
    return http.get(`${base}/dashboard`, { headers: headers({ 'X-Inertia': 'true', ...(only ? {
        'X-Inertia-Partial-Component': 'account/Dashboard', 'X-Inertia-Partial-Data': __ENV.PMC_LEGACY === '1' ? 'dashboard' : 'feed',
    } : {}) }), tags: { kind: only ? 'feed-bootstrap' : 'dashboard' }, redirects: 0 });
}
export function feed() {
    if (!cursor) {
        const response = initial(true);
        if (!check(response, { 'initial feed 200': r => r.status === 200 })) return;
        const props = response.json('props');
        cursor = props.feed?.feedPage?.next_cursor ?? props.dashboard?.feedPage?.next_cursor ?? null;
        if (!cursor) { check(response, { 'seeded feed has continuation': () => false }); return; }
    }
    const response = http.get(`${base}/community/feed-page?tab=all&topic=All&context=dashboard&cursor=${encodeURIComponent(cursor)}`,
        { headers: headers(), tags: { kind: 'feed' }, redirects: 0 });
    const ok = check(response, { 'feed 200': r => r.status === 200, 'private no-store': r => /no-store/.test(r.headers['Cache-Control'] || '') });
    if (!ok) { cursor = null; return; }
    const timing = /(?:^|,)\s*app;dur=([\d.]+)/.exec(response.headers['Server-Timing'] || '');
    check(response, { 'server timing available': () => Boolean(timing) });
    if (timing) appTime.add(Number(timing[1]));
    const data = response.json();
    check(data, { 'page bounded': d => d.data.length <= 12, 'no duplicate IDs': d => new Set(d.data.map(p => p.id)).size === d.data.length });
    cursor = data.next_cursor;
}
export function dashboard() { check(initial(), { 'dashboard 200': r => r.status === 200 }); }
export function comments() { check(http.get(`${base}/posts/${session().post_id}/comments/preview`, { headers: headers(), tags: { kind: 'comments' }, redirects: 0 }), { 'comments 200': r => r.status === 200 }); }
export function reactions() {
    const url = `${base}/posts/${session().post_id}/reactions`;
    const params = { headers: headers({ 'Content-Type': 'application/json' }), tags: { kind: 'reaction' }, redirects: 0 };
    const response = reacted ? http.del(url, null, params) : http.post(url, JSON.stringify({ type: 'like' }), params);
    if (check(response, { 'reaction 200': r => r.status === 200 })) reacted = !reacted;
}
