import { Head, router } from '@inertiajs/react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Calculator, ChevronLeft, ChevronRight, Clock3, Flag, Highlighter, Info, Strikethrough, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ExamToolGuide } from '@/components/exam/ExamToolGuide';
import { ExamOptionList, Highlighted, examBase, examResult, type ExamQuestion, type ExamResponses, type ExamResponse } from '@/components/exam/ExamShared';
import { SiteHeader } from '@/components/pm/SiteHeader';

type Strikes = Record<string, string[]>;
type Highlights = Record<string, Record<string, string[]>>;
const initialResponse: ExamResponse = { choice: null, marked: false };

function localTools(id: number): { strikes: Strikes; highlights: Highlights } {
    try {
        const value = JSON.parse(localStorage.getItem(`pm-exam-tools-${id}`) || '{}');
        return { strikes: value.strikes ?? {}, highlights: value.highlights ?? {} };
    } catch { return { strikes: {}, highlights: {} }; }
}

export default function Take({ attempt, questions, responses: initial }: {
    attempt: { id: number; expiresAt: string; total: number; durationSeconds: number };
    questions: ExamQuestion[]; responses: ExamResponses;
}) {
    const [index, setIndex] = useState(0);
    const [responses, setResponses] = useState<ExamResponses>(initial);
    const [guideOpen, setGuideOpen] = useState(false);
    const [strikeMode, setStrikeMode] = useState(false);
    const [highlightMode, setHighlightMode] = useState(false);
    const [finishOpen, setFinishOpen] = useState(false);
    const [confirmSubmit, setConfirmSubmit] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [reviewingMarked, setReviewingMarked] = useState(false);
    const [calcOpen, setCalcOpen] = useState(false);
    const [savingError, setSavingError] = useState('');
    const [tools, setTools] = useState(() => localTools(attempt.id));
    const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil((Date.parse(attempt.expiresAt) - Date.now()) / 1000)));
    const pending = useRef(new Map<number, Promise<void>>());
    const submittingRef = useRef(false);
    const failedSaveIds = useRef(new Set<number>());
    const timedOut = useRef(false);
    const lastSelection = useRef<string | null>(null);
    const [navStart, setNavStart] = useState(0);
    const [calculator, setCalculator] = useState({ a: '', b: '', op: '+' });

    useEffect(() => {
        const t = window.setInterval(() => setSeconds(Math.max(0, Math.ceil((Date.parse(attempt.expiresAt) - Date.now()) / 1000))), 1000);
        return () => window.clearInterval(t);
    }, [attempt.expiresAt]);
    useEffect(() => { try { localStorage.setItem(`pm-exam-tools-${attempt.id}`, JSON.stringify(tools)); } catch { /* Optional device preference */ } }, [attempt.id, tools]);
    useEffect(() => {
        if (seconds === 0 && !timedOut.current) {
            timedOut.current = true;
            router.visit(examResult(attempt.id)); // The server finalizes expiration and scores the saved answers.
        }
    }, [seconds, attempt.id]);

    const question = questions[index];
    const selected = responses[question.id] ?? initialResponse;
    const answeredCount = questions.filter(q => Boolean(responses[q.id]?.choice)).length;
    const markedIndexes = questions.flatMap((q, i) => responses[q.id]?.marked ? [i] : []);
    const markedCount = markedIndexes.length;
    const markedPosition = markedIndexes.indexOf(index);
    // A learner may review earlier questions, but cannot skip ahead of the first unanswered one.
    const firstUnansweredIndex = questions.findIndex(q => !responses[q.id]?.choice);
    const lastUnlockedIndex = firstUnansweredIndex < 0 ? questions.length - 1 : firstUnansweredIndex;
    const canVisit = (target: number) => target <= index || target <= lastUnlockedIndex;

    const persist = (questionId: number, response: ExamResponse) => {
        const previous = pending.current.get(questionId);
        const next = (previous ?? Promise.resolve()).catch(() => undefined).then(async () => {
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
            const result = await fetch(`${examBase}/attempts/${attempt.id}/answer`, {
                method: 'PUT', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': token ?? '' },
                body: JSON.stringify({ questionId, choice: response.choice, marked: response.marked }),
            });
            if (!result.ok) throw new Error(result.status === 409 ? 'This attempt has ended. Open the results page.' : 'Could not save your answer. Please retry.');
            failedSaveIds.current.delete(questionId);
            if (!failedSaveIds.current.size) setSavingError('');
        }).catch(error => { failedSaveIds.current.add(questionId); setSavingError(error instanceof Error ? error.message : 'Could not save your answer.'); throw error; });
        pending.current.set(questionId, next);
        void next.catch(() => undefined);
    };
    const updateResponse = (id: number, change: Partial<ExamResponse>) => {
        const next = { ...(responses[id] ?? initialResponse), ...change };
        setResponses(prev => ({ ...prev, [id]: next }));
        persist(id, next);
    };
    useEffect(() => {
        // Reconcile selections made before strike-through became an elimination tool.
        for (const q of questions) {
            const choice = initial[q.id]?.choice;
            if (choice && (tools.strikes[q.id] ?? []).includes(choice)) updateResponse(q.id, { choice: null });
        }
        // Only needed when loading an attempt; subsequent strikes clear the choice immediately.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt.id]);
    const goto = (next: number, keepMarkedReview = false) => {
        // Flagged review revisits encountered questions; ordinary forward progress remains gated.
        if (next < 0 || next >= questions.length || (!keepMarkedReview && !canVisit(next))) return;
        lastSelection.current = null;
        if (!keepMarkedReview) setReviewingMarked(false);
        setIndex(next);
        setNavStart(Math.floor(next / 20) * 20);
    };
    const toggleStrike = (key: string) => {
        // An eliminated option stays visible but can never remain a submitted answer.
        if (!(tools.strikes[question.id] ?? []).includes(key) && selected.choice === key) {
            updateResponse(question.id, { choice: null });
        }
        setTools(prev => {
            const before = prev.strikes[question.id] ?? [];
            return { ...prev, strikes: { ...prev.strikes, [question.id]: before.includes(key) ? before.filter(v => v !== key) : [...before, key] } };
        });
    };
    const chooseOption = (key: string) => {
        if (!strikeMode && !(tools.strikes[question.id] ?? []).includes(key)) updateResponse(question.id, { choice: key });
    };
    const startMarkedReview = (target = markedIndexes[0]) => {
        if (target === undefined) return;
        setFinishOpen(false);
        setReviewingMarked(true);
        goto(target, true);
    };
    const removeReviewMark = () => {
        updateResponse(question.id, { marked: false });
        if (reviewingMarked) {
            const next = markedIndexes.find(i => i > index) ?? markedIndexes.find(i => i < index);
            if (next === undefined) setReviewingMarked(false);
            else goto(next, true);
        }
    };
    const highlightText = (selection: string, force = false) => {
        if ((!highlightMode && !force) || !question.prompt.includes(selection) || selection.length > 280) return;
        setTools(prev => {
            const current = prev.highlights[question.id] ?? {};
            const values = current.prompt ?? [];
            return { ...prev, highlights: { ...prev.highlights, [question.id]: { ...current, prompt: values.includes(selection) ? values : [...values, selection] } } };
        });
        window.getSelection()?.removeAllRanges();
    };
    const recordSelection = (text: string) => {
        // Highlighting is deliberately limited to the question/scenario, never the answers.
        if (highlightMode) {
            highlightText(text);
            lastSelection.current = null;
        } else {
            lastSelection.current = text;
        }
    };
    const toggleHighlightMode = () => {
        const selectedText = lastSelection.current;
        if (selectedText) {
            highlightText(selectedText, true);
            lastSelection.current = null;
        } else {
            setHighlightMode(value => !value);
        }
    };
    useEffect(() => {
        const keyboard = (event: KeyboardEvent) => {
            if (guideOpen || finishOpen || calcOpen || event.ctrlKey || event.metaKey || event.altKey) return;
            const element = event.target as HTMLElement;
            if (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return;
            if (event.key.toLowerCase() === 's') { event.preventDefault(); setStrikeMode(v => !v); }
            if (event.key.toLowerCase() === 'h') { event.preventDefault(); toggleHighlightMode(); }
        };
        window.addEventListener('keydown', keyboard);
        return () => window.removeEventListener('keydown', keyboard);
    }, [guideOpen, finishOpen, calcOpen, index, highlightMode]);

    const unhighlightText = (text: string) => setTools(prev => {
        const current = prev.highlights[question.id] ?? {};
        return { ...prev, highlights: { ...prev.highlights, [question.id]: { ...current, prompt: (current.prompt ?? []).filter(value => value !== text) } } };
    });
    const submit = async () => {
        // A double click must never send duplicate submission requests.
        if (submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        setSubmitError('');
        try {
            const eliminatedSelections = questions.filter(q => {
                const choice = responses[q.id]?.choice;
                return choice && (tools.strikes[q.id] ?? []).includes(choice);
            });
            if (eliminatedSelections.length) {
                eliminatedSelections.forEach(q => updateResponse(q.id, { choice: null }));
                setSavingError('Eliminated selections were cleared. Review your answers before submitting.');
                setConfirmSubmit(false);
                setFinishOpen(false);
                return;
            }
            const result = await Promise.allSettled([...pending.current.values()]);
            if (failedSaveIds.current.size || result.some(p => p.status === 'rejected')) {
                setSavingError('Some answers were not saved. Please retry before submitting.');
                setConfirmSubmit(false);
                setFinishOpen(false);
                return;
            }
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
            const response = await fetch(`${examBase}/attempts/${attempt.id}/submit`, {
                method: 'POST', credentials: 'same-origin',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': token ?? '' },
            });
            if (!response.ok) {
                if (response.status === 429) throw new Error('Too many submission attempts. Please try again shortly.');
                if (response.status === 419 || response.status === 401) throw new Error('Your session has expired. Refresh the page and sign in again before submitting.');
                if (response.status === 403) throw new Error('You no longer have permission to submit this exam.');
                throw new Error('Could not submit your exam. Your saved answers are still available. Please retry.');
            }
            const data = await response.json() as { resultUrl?: string };
            if (!data.resultUrl) throw new Error('Could not open the exam result. Please retry.');
            router.visit(data.resultUrl, { replace: true });
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'Could not submit the exam. Please retry.');
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };
    const duration = attempt.durationSeconds || Math.max(1, seconds);
    const navigator = questions.slice(navStart, navStart + 20);
    const mm = (n: number) => String(Math.floor(n)).padStart(2, '0');
    const time = `${mm(seconds / 3600)}:${mm((seconds % 3600) / 60)}:${mm(seconds % 60)}`;
    const a = Number(calculator.a), b = Number(calculator.b);
    const validCalc = calculator.a.trim() !== '' && calculator.b.trim() !== '' && Number.isFinite(a) && Number.isFinite(b) && !(calculator.op === '/' && b === 0);
    const calcResult = calculator.op === '+' ? a + b : calculator.op === '-' ? a - b : calculator.op === '×' ? a * b : a / b;

    return <div className="pm-app pm-exam pm-exam-taking"><Head title="PMP Practice Exam"/><SiteHeader active="/learning"/>
        <div className="pm-exam-examhead"><div className="pm-exam-examhead-title"><strong>PMP® Exam Simulator</strong></div>
            <div className="pm-exam-examhead-right">{guideOpen ? <button className="btn secondary pm-exam-action" type="button" onClick={() => setGuideOpen(false)}><X size={18}/>Close</button> : <>
                <span><Clock3 size={20}/>Time Remaining: <b className={seconds < 60 ? 'is-urgent' : ''}>{time}</b></span>
                <span>Question {index + 1} of {questions.length}</span><button type="button" aria-label="Mark current question for review" aria-pressed={selected.marked} onClick={() => selected.marked ? removeReviewMark() : updateResponse(question.id, { marked: true })}><Flag fill={selected.marked ? 'currentColor' : 'none'}/></button>
                <button className="pm-exam-guide-open" type="button" onClick={() => setGuideOpen(true)}><Info size={18}/> Exam Tools Guide</button>
                <button className="btn secondary pm-exam-action" type="button" onClick={() => setFinishOpen(true)}>Finish Exam</button></>}</div></div>
        <div className="pm-exam-take-body">
        {guideOpen ? <ExamToolGuide/> : <>
            <div className="pm-exam-progress" role="progressbar" aria-label="Exam time elapsed" aria-valuenow={Math.max(0, duration - seconds)} aria-valuemin={0} aria-valuemax={duration}><span style={{width:`${Math.min(100, Math.max(0, (duration - seconds) / duration * 100))}%`}}/></div>
            <div className="pm-exam-take-grid"><section className="pm-exam-panel pm-exam-question-card">
                {(selected.marked || (reviewingMarked && markedPosition >= 0)) && <div className="pm-exam-marked-banner"><Flag size={15} fill="currentColor"/>
                    {reviewingMarked && markedPosition >= 0 ? <><strong>Reviewing marked questions</strong><span>· {markedPosition + 1} of {markedCount} · You can change your answers.</span></>
                        : <><strong>Marked for review</strong><span>· You can review this question before submitting.</span></>}
                </div>}
                <header><span>Question {index + 1} of {questions.length}</span><span className="pm-exam-domain">Domain: {question.domain}</span></header>
                <div className="pm-exam-question-main"><p className="pm-exam-question-prompt" onMouseUp={event => {
                    const selection = window.getSelection();
                    if (!selection || selection.isCollapsed || !event.currentTarget.contains(selection.anchorNode) || !event.currentTarget.contains(selection.focusNode)) return;
                    const text = selection.toString().trim();
                    if (text) recordSelection(text);
                }}><Highlighted content={question.prompt} active={tools.highlights[question.id]?.prompt ?? []} onRemove={unhighlightText}/></p>
                    <ExamOptionList question={question} chosen={selected.choice}
                        onChoose={chooseOption}
                        onStrike={toggleStrike} strikeMode={strikeMode} struck={tools.strikes[question.id] ?? []}/></div>
                <footer><div className="pm-exam-tools">
                    <button type="button" aria-pressed={selected.marked} className={selected.marked ? 'is-review-remove' : ''} onClick={() => selected.marked ? removeReviewMark() : updateResponse(question.id, { marked: true })}><Flag size={19}/>{selected.marked ? 'Remove Review Mark' : 'Mark for Review'}</button>
                    <button type="button" aria-pressed={strikeMode} className={strikeMode ? 'is-on' : ''} onClick={() => setStrikeMode(v => !v)}><Strikethrough size={19}/>Strike Through</button>
                    <button type="button" aria-pressed={highlightMode} className={highlightMode ? 'is-on' : ''} onClick={toggleHighlightMode}><Highlighter size={19}/>Highlight</button>
                    <button type="button" onClick={() => setCalcOpen(true)}><Calculator size={19}/>Calculator</button></div>
                    {reviewingMarked && markedPosition >= 0 ?
                        <div className="pm-exam-nextprev"><button className="btn secondary pm-exam-action" disabled={markedPosition === 0} onClick={() => goto(markedIndexes[markedPosition - 1], true)}><ArrowLeft size={18}/>Previous Marked</button>
                            <button className="btn pm-exam-action" disabled={markedPosition === markedCount - 1} onClick={() => goto(markedIndexes[markedPosition + 1], true)}>Next Marked <ArrowRight size={18}/></button></div>
                        : <div className="pm-exam-nextprev"><button className="btn secondary pm-exam-action" disabled={index === 0} onClick={() => goto(index - 1)}><ArrowLeft size={18}/>Previous</button>
                            {index === questions.length - 1 ? <button className="btn pm-exam-action" onClick={() => setFinishOpen(true)}>Finish &amp; Review <ArrowRight size={18}/></button>
                                : <button className="btn pm-exam-action" disabled={!canVisit(index + 1)} title={!canVisit(index + 1) ? 'Answer this and preceding questions to continue' : undefined} onClick={() => goto(index + 1)}>Next <ArrowRight size={18}/></button>}</div>}</footer>
            </section><aside className="pm-exam-panel pm-exam-navigator"><h2>Question Navigator</h2><div className="pm-exam-navigator-grid">
                {navigator.map((q, offset) => { const i = navStart + offset; const marked = responses[q.id]?.marked;
                    return <button type="button" key={q.id} aria-label={`Question ${i + 1}${marked ? ', marked for review' : ''}`} aria-current={i === index ? 'true' : undefined} className={`${i === index ? 'is-current' : ''} ${responses[q.id]?.choice ? 'is-answered' : ''}`}
                        disabled={!canVisit(i)} onClick={() => marked ? startMarkedReview(i) : goto(i)}>{i + 1}{marked && <Flag size={12} fill="currentColor"/>}</button>;
                })}</div>
                {questions.length > 20 && <div className="pm-exam-nav-pages"><button type="button" disabled={navStart === 0} onClick={() => setNavStart(Math.max(0, navStart - 20))}><ChevronLeft/>Prev 20</button>
                    <button type="button" disabled={navStart + 20 >= questions.length} onClick={() => setNavStart(navStart + 20)}>Next 20<ChevronRight/></button></div>}
                <div className="pm-exam-nav-legend"><span><i className="is-answered"/>Answered ({answeredCount})</span><span><i/>Not Answered ({questions.length - answeredCount})</span>
                    <span><i className="is-current"/>Current Question ({index + 1})</span><span><Flag size={18}/>Marked for Review ({markedCount})</span></div>
                {markedCount > 0 && <div className="pm-exam-navigator-actions"><button type="button" className="btn secondary pm-exam-action" onClick={() => startMarkedReview()}>Review Marked Questions</button>
                    <button type="button" className="btn secondary pm-exam-action" onClick={() => setFinishOpen(true)}>Exam Summary</button></div>}
            </aside></div>
            {savingError && <div className="alert error pm-exam-save-error" role="alert">{savingError} <button type="button" onClick={() => { for (const id of failedSaveIds.current) persist(id, responses[id] ?? initialResponse); }}>Retry unsaved answers</button>
                {savingError.includes('ended') && <a href={examResult(attempt.id)}>View results</a>}</div>}
        </>}</div>
        <Dialog.Root open={finishOpen} onOpenChange={open => {
            if (!submittingRef.current) {
                setFinishOpen(open);
                if (!open) setConfirmSubmit(false);
                if (open) setSubmitError('');
            }
        }}><Dialog.Portal><Dialog.Overlay className="pm-exam-modal-overlay"/><Dialog.Content className="pm-exam-modal pm-exam-finish-modal" aria-describedby="pm-exam-finish-description">
            {confirmSubmit ? <>
                <Dialog.Title>Submit your exam?</Dialog.Title>
                <Dialog.Description id="pm-exam-finish-description">
                    {questions.length > answeredCount ? 'Unanswered questions will be left blank. ' : ''}Once you submit, your answers are final.
                </Dialog.Description>
                {submitError && <div className="alert error" role="alert">{submitError}</div>}
                <div className="pm-exam-confirm-actions">
                    <button type="button" className="btn secondary pm-exam-action" disabled={submitting} onClick={() => { setSubmitError(''); setConfirmSubmit(false); }}>Back to Summary</button>
                    <button type="button" className="btn pm-exam-action" disabled={submitting} onClick={() => void submit()}>{submitting ? 'Submitting…' : 'Confirm Submission'}</button>
                </div>
            </> : <>
                <Dialog.Title>Review before submitting</Dialog.Title>
                <Dialog.Description id="pm-exam-finish-description">You can review your answers or submit the exam now. Your timer keeps running.</Dialog.Description>
                <div className="pm-exam-finish-counts"><span>{answeredCount} answered</span><span>{questions.length - answeredCount} unanswered</span><span>{markedCount} marked</span></div>
                <div className="pm-exam-finish-marked"><strong>Marked questions</strong><div>{markedIndexes.length ? markedIndexes.map(i =>
                    <button type="button" key={questions[i].id} onClick={() => startMarkedReview(i)} aria-label={`Review marked question ${i + 1}`}>{i + 1}</button>) : <span>No questions marked for review.</span>}</div></div>
                {questions.length > answeredCount && <div className="pm-exam-finish-marked pm-exam-finish-unanswered"><strong>Unanswered questions</strong><div>{questions.flatMap((q, i) => !responses[q.id]?.choice ? [i] : []).map(i =>
                    <button type="button" key={questions[i].id} disabled={!canVisit(i)} title={!canVisit(i) ? 'Answer earlier questions to unlock this question' : undefined} onClick={() => { setFinishOpen(false); goto(i); }} aria-label={`Return to unanswered question ${i + 1}`}>{i + 1}</button>)}</div></div>}
                {submitError && <div className="alert error" role="alert">{submitError}</div>}
                <div className="pm-exam-finish-actions"><button type="button" className="btn secondary pm-exam-action" disabled={submitting} onClick={() => { setFinishOpen(false); setReviewingMarked(false); }}>Return to Exam</button>
                    <button type="button" className="btn secondary pm-exam-action pm-exam-review-marked-action" disabled={!markedCount || submitting} onClick={() => startMarkedReview()}>Review Marked Questions</button>
                    <button type="button" className="btn pm-exam-action" disabled={submitting} onClick={() => { setSubmitError(''); setConfirmSubmit(true); }}>Submit Exam</button></div>
            </>}
        </Dialog.Content></Dialog.Portal></Dialog.Root>
        <Dialog.Root open={calcOpen} onOpenChange={setCalcOpen}><Dialog.Portal><Dialog.Overlay className="pm-exam-modal-overlay"/><Dialog.Content className="pm-exam-modal pm-exam-calc"><Dialog.Close className="pm-exam-modal-close" aria-label="Close"><X/></Dialog.Close>
            <Dialog.Title>Calculator</Dialog.Title><Dialog.Description>Quick arithmetic during the practice exam.</Dialog.Description>
            <div className="pm-exam-calc-fields"><label>First number<input type="number" value={calculator.a} onChange={event => setCalculator(v => ({...v,a:event.target.value}))}/></label>
                <label>Operation<select value={calculator.op} onChange={event => setCalculator(v => ({...v,op:event.target.value}))}><option value="+">+</option><option value="-">−</option><option value="×">×</option><option value="/">÷</option></select></label>
                <label>Second number<input type="number" value={calculator.b} onChange={event => setCalculator(v => ({...v,b:event.target.value}))}/></label></div>
            <output className="pm-exam-calc-output">{validCalc ? Number(calcResult.toFixed(8)).toLocaleString() : calculator.op === '/' && b === 0 ? 'Cannot divide by zero' : 'Enter two numbers'}</output>
        </Dialog.Content></Dialog.Portal></Dialog.Root>
    </div>;
}
