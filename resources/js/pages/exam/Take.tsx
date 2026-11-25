import { PmpExamTakingView } from '@/components/exam/PmpExamTakingView';
import { PmpExamCalculator, PmpExamFinishDialog } from '@/components/exam/PmpExamDialogs';
import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { examSecondsUntilExpiry, examServerClockOffset } from '@/components/exam/examCountdownMath';
import { examBase, examResult, type ExamQuestion, type ExamResponses, type ExamResponse } from '@/components/exam/ExamShared';
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
    attempt: { id: number; expiresAt: string; serverNow?: string; total: number; durationSeconds: number };
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
    const serverClockOffset = useMemo(() => examServerClockOffset(attempt.serverNow, Date.now()), [attempt.id, attempt.serverNow]);
    const [seconds, setSeconds] = useState(() => examSecondsUntilExpiry(attempt.expiresAt, Date.now(), serverClockOffset));
    const pending = useRef(new Map<number, Promise<void>>());
    const submittingRef = useRef(false);
    const failedSaveIds = useRef(new Set<number>());
    const timedOut = useRef(false);
    const lastSelection = useRef<string | null>(null);
    const [navStart, setNavStart] = useState(0);

    useEffect(() => {
        const tick = () => setSeconds(examSecondsUntilExpiry(attempt.expiresAt, Date.now(), serverClockOffset));
        tick();
        const t = window.setInterval(tick, 1000);
        return () => window.clearInterval(t);
    }, [attempt.expiresAt, serverClockOffset]);
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
    // Keep the starting duration stable throughout the attempt; a countdown value
    // must never be reused as the denominator as it changes every second.
    const duration = useMemo(() => {
        // The server supplies the full original attempt duration, not time left on reload.
        // Normalize legacy negative Carbon 3 differences without restarting the progress bar.
        if (Number.isFinite(attempt.durationSeconds) && attempt.durationSeconds !== 0) return Math.abs(attempt.durationSeconds);
        const initialRemaining = examSecondsUntilExpiry(attempt.expiresAt, Date.now(), serverClockOffset);
        return Number.isFinite(initialRemaining) && initialRemaining > 0 ? initialRemaining : 1;
    }, [attempt.id, attempt.durationSeconds, attempt.expiresAt, serverClockOffset]);
    return <div className="pm-app pm-exam pm-exam-taking"><Head title="PMP Practice Exam"/><SiteHeader active="/exams/pmp" authenticatedMemberNavigation/>
        <PmpExamTakingView questions={questions} responses={responses} index={index} selected={selected} seconds={seconds} duration={duration}
            guideOpen={guideOpen} strikeMode={strikeMode} highlightMode={highlightMode} reviewingMarked={reviewingMarked}
            markedIndexes={markedIndexes} navStart={navStart} strikes={tools.strikes[question.id] ?? []} highlights={tools.highlights[question.id]?.prompt ?? []}
            canVisit={canVisit} goto={goto} onGuide={setGuideOpen} onToggleMark={() => selected.marked ? removeReviewMark() : updateResponse(question.id, { marked: true })}
            onToggleStrike={() => setStrikeMode(v => !v)} onToggleHighlight={toggleHighlightMode} onCalculator={() => setCalcOpen(true)}
            onSelection={recordSelection} onRemoveHighlight={unhighlightText} onChoose={chooseOption} onStrike={toggleStrike}
            onPageStartChange={setNavStart} onNavigate={(target, marked) => marked ? startMarkedReview(target) : goto(target)} onReviewMarked={() => startMarkedReview()}
            onFinish={() => setFinishOpen(true)} onFinal={() => setFinishOpen(true)} onSummary={() => setFinishOpen(true)}
            saveNotice={savingError && <div className="alert error pm-exam-save-error" role="alert">{savingError} <button type="button" onClick={() => { for (const id of failedSaveIds.current) persist(id, responses[id] ?? initialResponse); }}>Retry unsaved answers</button>
                {savingError.includes('ended') && <a href={examResult(attempt.id)}>View results</a>}</div>}/>
        <PmpExamFinishDialog open={finishOpen} onOpenChange={open => {
            if (!submittingRef.current) { setFinishOpen(open); if (!open) setConfirmSubmit(false); if (open) setSubmitError(''); }
        }} confirming={confirmSubmit} onConfirmStep={() => { setSubmitError(''); setConfirmSubmit(true); }}
            onBack={() => { setSubmitError(''); setConfirmSubmit(false); }} onConfirm={() => void submit()} error={submitError}
            total={questions.length} answeredCount={answeredCount} markedIndexes={markedIndexes}
            unansweredIndexes={questions.flatMap((q, i) => !responses[q.id]?.choice ? [i] : [])} canVisit={canVisit} submitting={submitting}
            onClose={() => { setFinishOpen(false); setReviewingMarked(false); }} onMarked={i => startMarkedReview(i)} onUnanswered={i => { setFinishOpen(false); goto(i); }}/>
        <PmpExamCalculator open={calcOpen} onOpenChange={setCalcOpen}/>
    </div>;
}
