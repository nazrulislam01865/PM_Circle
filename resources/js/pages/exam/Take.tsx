import { Head, router } from '@inertiajs/react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Calculator, Check, ClipboardCheck, ChevronLeft, ChevronRight, Clock3, Flag, Highlighter, Info, Strikethrough, X } from 'lucide-react';
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
    const [calcOpen, setCalcOpen] = useState(false);
    const [savingError, setSavingError] = useState('');
    const [tools, setTools] = useState(() => localTools(attempt.id));
    const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil((Date.parse(attempt.expiresAt) - Date.now()) / 1000)));
    const pending = useRef(new Map<number, Promise<void>>());
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
    const markedCount = questions.filter(q => Boolean(responses[q.id]?.marked)).length;
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
    const goto = (next: number) => {
        if (next < 0 || next >= questions.length || !canVisit(next)) return;
        lastSelection.current = null;
        setIndex(next);
        setNavStart(Math.floor(next / 20) * 20);
    };
    const toggleStrike = (key: string) => setTools(prev => {
        const before = prev.strikes[question.id] ?? [];
        return { ...prev, strikes: { ...prev.strikes, [question.id]: before.includes(key) ? before.filter(v => v !== key) : [...before, key] } };
    });
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
        const result = await Promise.allSettled([...pending.current.values()]);
        if (failedSaveIds.current.size || result.some(p => p.status === 'rejected')) { setSavingError('Some answers were not saved. Please retry before submitting.'); setFinishOpen(false); return; }
        router.post(`${examBase}/attempts/${attempt.id}/submit`);
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
                <span>Question {index + 1} of {questions.length}</span><button type="button" aria-label="Mark current question for review" aria-pressed={selected.marked} onClick={() => updateResponse(question.id, { marked: !selected.marked })}><Flag fill={selected.marked ? 'currentColor' : 'none'}/></button>
                <button className="pm-exam-guide-open" type="button" onClick={() => setGuideOpen(true)}><Info size={18}/> Exam Tools Guide</button>
                <button className="btn secondary pm-exam-action" type="button" onClick={() => setFinishOpen(true)}>Finish Exam</button></>}</div></div>
        <div className="pm-exam-take-body">
        {guideOpen ? <ExamToolGuide/> : <>
            <div className="pm-exam-progress" role="progressbar" aria-label="Exam time elapsed" aria-valuenow={Math.max(0, duration - seconds)} aria-valuemin={0} aria-valuemax={duration}><span style={{width:`${Math.min(100, Math.max(0, (duration - seconds) / duration * 100))}%`}}/></div>
            <div className="pm-exam-take-grid"><section className="pm-exam-panel pm-exam-question-card"><header><span>Question {index + 1} of {questions.length}</span><span className="pm-exam-domain">Domain: {question.domain}</span></header>
                <div className="pm-exam-question-main"><p className="pm-exam-question-prompt" onMouseUp={event => {
                    const selection = window.getSelection();
                    if (!selection || selection.isCollapsed || !event.currentTarget.contains(selection.anchorNode) || !event.currentTarget.contains(selection.focusNode)) return;
                    const text = selection.toString().trim();
                    if (text) recordSelection(text);
                }}><Highlighted content={question.prompt} active={tools.highlights[question.id]?.prompt ?? []} onRemove={unhighlightText}/></p>
                    <ExamOptionList question={question} chosen={selected.choice}
                        onChoose={key => updateResponse(question.id, { choice: key })}
                        onStrike={toggleStrike} strikeMode={strikeMode} struck={tools.strikes[question.id] ?? []}/></div>
                <footer><div className="pm-exam-tools">
                    <button type="button" aria-pressed={selected.marked} onClick={() => updateResponse(question.id, { marked: !selected.marked })}><Flag size={19}/>{selected.marked ? 'Unmark Review' : 'Mark for Review'}</button>
                    <button type="button" aria-pressed={strikeMode} className={strikeMode ? 'is-on' : ''} onClick={() => setStrikeMode(v => !v)}><Strikethrough size={19}/>Strike Through</button>
                    <button type="button" aria-pressed={highlightMode} className={highlightMode ? 'is-on' : ''} onClick={toggleHighlightMode}><Highlighter size={19}/>Highlight</button>
                    <button type="button" onClick={() => setCalcOpen(true)}><Calculator size={19}/>Calculator</button></div>
                    <div className="pm-exam-nextprev"><button className="btn secondary pm-exam-action" disabled={index === 0} onClick={() => goto(index - 1)}><ArrowLeft size={18}/>Previous</button>
                        <button className="btn pm-exam-action" disabled={index === questions.length - 1 || !canVisit(index + 1)} title={!canVisit(index + 1) ? 'Answer this and preceding questions to continue' : undefined} onClick={() => goto(index + 1)}>Next <ArrowRight size={18}/></button></div></footer>
            </section><aside className="pm-exam-panel pm-exam-navigator"><h2>Question Navigator</h2><div className="pm-exam-navigator-grid">
                {navigator.map((q, offset) => { const i = navStart + offset; const marked = responses[q.id]?.marked;
                    return <button type="button" key={q.id} aria-label={`Question ${i + 1}${marked ? ', marked for review' : ''}`} aria-current={i === index ? 'true' : undefined} className={`${i === index ? 'is-current' : ''} ${responses[q.id]?.choice ? 'is-answered' : ''}`}
                        disabled={!canVisit(i)} onClick={() => goto(i)}>{i + 1}{marked && <Flag size={12} fill="currentColor"/>}</button>;
                })}</div>
                {questions.length > 20 && <div className="pm-exam-nav-pages"><button type="button" disabled={navStart === 0} onClick={() => setNavStart(Math.max(0, navStart - 20))}><ChevronLeft/>Prev 20</button>
                    <button type="button" disabled={navStart + 20 >= questions.length} onClick={() => setNavStart(navStart + 20)}>Next 20<ChevronRight/></button></div>}
                <div className="pm-exam-nav-legend"><span><i className="is-answered"/>Answered ({answeredCount})</span><span><i/>Not Answered ({questions.length - answeredCount})</span>
                    <span><i className="is-current"/>Current Question ({index + 1})</span><span><Flag size={18}/>Marked for Review ({markedCount})</span></div>
            </aside></div>
            {savingError && <div className="alert error pm-exam-save-error" role="alert">{savingError} <button type="button" onClick={() => { for (const id of failedSaveIds.current) persist(id, responses[id] ?? initialResponse); }}>Retry unsaved answers</button>
                {savingError.includes('ended') && <a href={examResult(attempt.id)}>View results</a>}</div>}
        </>}</div>
        <Dialog.Root open={finishOpen} onOpenChange={setFinishOpen}><Dialog.Portal><Dialog.Overlay className="pm-exam-modal-overlay"/><Dialog.Content className="pm-exam-modal pm-exam-finish-modal" aria-describedby="pm-exam-finish-description"><Dialog.Close className="pm-exam-modal-close" aria-label="Close"><X/></Dialog.Close>
            <div className="pm-exam-finish-icon"><ClipboardCheck size={78} strokeWidth={1.7}/><span><Check size={26} strokeWidth={2.5}/></span></div><Dialog.Title>Finish and Submit Exam?</Dialog.Title><Dialog.Description id="pm-exam-finish-description">You have answered {answeredCount} of {questions.length} questions.</Dialog.Description>
            <div className="pm-exam-finish-info"><Info size={21}/><ul><li>Once submitted, your attempt will be completed and scored.</li><li>You will not be able to change your answers.</li><li>Your detailed results and performance analysis will be available immediately.</li></ul></div>
            <div className="pm-exam-modal-buttons"><button type="button" className="btn secondary pm-exam-action" onClick={() => setFinishOpen(false)}>Review Answers</button>
                <button type="button" className="btn pm-exam-action" onClick={() => void submit()}>Submit Exam</button></div>
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
