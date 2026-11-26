import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const require = createRequire(import.meta.url);

test('all interview selections reuse admin dropdown, including the empty question-set selection', () => {
    const source = read('resources/js/pages/interview/Index.tsx');
    assert.match(source, /import \{ AdminChoice \}/);
    assert.match(source, /<AdminChoice id=\{id\}/);
    assert.match(source, /value: key \|\| allValue/);
    assert.match(source, /next === allValue \? '' : next/);
    assert.doesNotMatch(source, /<select\b/);
    assert.equal((source.match(/<SelectField disabled=\{busy\}/g) ?? []).length, 8);
});

test('job description picker supports browse/drop, file limits, busy and errors', () => {
    const source = read('resources/js/components/interview/JobDescriptionUpload.tsx');
    assert.match(source, /input.current\?\.click\(\)/);
    assert.match(source, /select\(event.dataTransfer.files\)/);
    assert.match(source, /5 \* 1024 \* 1024/);
    assert.match(source, /aria-busy=\{busy\}/);
    assert.match(source, /files.length !== 1/);
    const setup = read('resources/js/pages/interview/Index.tsx');
    assert.match(setup, /uploadLock.current = true/);
    assert.match(setup, /result.errors\?\.file\?\.\[0\]/);
    assert.match(setup, /<JobDescriptionUpload/);
});

test('answer input is taller than shared single-line controls, and dictation is visible in every mode', () => {
    const practice = read('resources/js/pages/interview/Practice.tsx');
    assert.match(practice, /rows=\{9\}/);
    assert.match(practice, /session.mode === 'type' \? 'type' : 'speak'/);
    assert.doesNotMatch(practice, /session.mode !== 'type' &&/);
    assert.match(practice, /readOnly=\{recording\}/);
    const css = read('resources/css/pm-interview.css');
    assert.match(css, /\.pm-interview-flow \.pm-if-answer-editor textarea\.pm-if-answer[^}]*min-height:var\(--pm-interview-flow-answer-height\)/);
    assert.match(read('resources/css/pm-design-tokens.css'), /--pm-interview-flow-answer-height: 12rem/);
});

// Execute the real hook against a minimal deterministic React hook harness and
// mock browser recognition. This checks callback lifecycle, not physical audio.
function harness({ supported = true, secure = true } = {}) {
    const ts = require('typescript');
    const slots = []; const cleanups = []; let cursor = 0; let instance;
    const react = {
        useRef(value) { const i = cursor++; return slots[i] ?? (slots[i] = { current: value }); },
        useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
        useCallback(fn, deps) { const i = cursor++; const old = slots[i]; if (!old || deps.some((d, j) => d !== old.deps[j])) slots[i] = { fn, deps }; return slots[i].fn; },
        useEffect(fn, deps) { const i = cursor++; const old = slots[i]; if (!old || deps.some((d, j) => d !== old[j])) { cleanups[i]?.(); cleanups[i] = fn(); slots[i] = deps; } },
    };
    class Recognition {
        constructor() { instance = this; }
        start() { this.started = true; }
        stop() { this.stopped = true; }
        abort() { this.aborted = true; }
    }
    const window = { isSecureContext: secure, ...(supported ? { webkitSpeechRecognition: Recognition } : {}), setTimeout, clearTimeout };
    const compiled = ts.transpileModule(read('resources/js/components/interview/useSpeechAnswer.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    new Function('require', 'exports', 'window', compiled)(name => { assert.equal(name, 'react'); return react; }, exports, window);
    let transcript = 'Existing answer';
    const onTranscript = value => { transcript = value; };
    const render = () => { cursor = 0; return exports.useSpeechAnswer(onTranscript, transcript); };
    return { render, current: () => instance, text: () => transcript, unmount: () => cleanups.forEach(fn => fn?.()) };
}
const result = (...texts) => ({ results: texts.map(transcript => ({ 0: { transcript }, isFinal: true })) });

test('dictation starts directly, appends editable text, and accepts final results after Stop', () => {
    const h = harness(); let speech = h.render(); speech.start(); const mic = h.current();
    assert.equal(mic.started, true); assert.equal(h.render().state, 'requesting');
    mic.onstart(); assert.equal(h.render().state, 'listening');
    mic.onresult(result('first words')); assert.equal(h.text(), 'Existing answer first words');
    mic.onresult(result('revised words')); assert.equal(h.text(), 'Existing answer revised words');
    h.render().stop(); assert.equal(mic.stopped, true); assert.equal(h.render().state, 'stopping');
    mic.onresult(result('final words')); mic.onend();
    assert.equal(h.text(), 'Existing answer final words'); assert.equal(h.render().state, 'idle');
    h.render().start(); const next = h.current(); next.onstart(); next.onresult(result('more detail'));
    assert.equal(h.text(), 'Existing answer final words more detail');
    h.unmount(); assert.equal(next.aborted, true);
});

test('dictation supports 6000 characters and safely handles errors and cancellation', () => {
    const h = harness(); h.render().start(); let mic = h.current(); mic.onstart(); mic.onresult(result('x'.repeat(7000)));
    assert.equal(h.text().length, 6000); mic.onerror({ error: 'network' });
    assert.match(h.render().error, /could not connect/); assert.equal(h.render().state, 'idle');
    h.render().replaceTranscript('New draft'); h.render().start(); mic = h.current();
    h.render().stop(); assert.equal(mic.aborted, true); assert.equal(h.render().state, 'idle');
    h.render().start(); mic = h.current(); mic.onerror({ error: 'not-allowed' });
    assert.match(h.render().error, /permission was denied/); h.unmount();
});

test('unsupported and insecure browsers retain typing fallback', () => {
    const unsupported = harness({ supported: false }); unsupported.render().start(); assert.match(unsupported.render().error, /does not support/); assert.equal(unsupported.current(), undefined);
    const insecure = harness({ secure: false }); insecure.render().start(); assert.match(insecure.render().error, /HTTPS/); assert.equal(insecure.current(), undefined);
});

test('practice actions are adjacent and routine instructional copy is removed', () => {
    const practice = read('resources/js/pages/interview/Practice.tsx');
    const actions = practice.match(/<div className="pm-if-answer-actions">([\s\S]*?)<\/div>/)?.[1] ?? '';
    assert.equal((actions.match(/<button\b/g) ?? []).length, 2);
    assert.ok(actions.indexOf('Start dictation') < actions.indexOf('Evaluate answer'));
    assert.match(actions, /onClick=\{\(\) => void save\(\)\}/);
    assert.doesNotMatch(practice, /Evaluate your answer to continue|Return to interview setup/);
    assert.match(practice, /speech.error && <p role="alert"/);
    assert.match(practice, /id="interview-dictation-status" role="status"/);
    assert.match(read('resources/css/pm-interview.css'), /\.pm-if-answer-actions \{[^}]*display:flex[^}]*flex-wrap:wrap/);
});

test('setup and shared brief omit sample and redundant explanatory copy', () => {
    const setup = read('resources/js/pages/interview/Index.tsx');
    assert.doesNotMatch(setup, /Use sample JD|const sample =|Question selection and answer evaluation use local rules|Dictation is available as an optional/);
    assert.match(setup, /<JobDescriptionUpload/);
    assert.doesNotMatch(read('resources/js/components/interview/InterviewFlow.tsx'), /Practice uses the published question catalog/);
});

test('successful dictation ends silently and preserves the transcript', () => {
    const h = harness(); h.render().start(); const mic = h.current();
    mic.onstart(); mic.onresult(result('spoken answer')); h.render().stop(); mic.onend();
    assert.equal(h.render().status, '');
    assert.equal(h.render().state, 'idle');
    assert.equal(h.text(), 'Existing answer spoken answer');
    h.unmount();
});
