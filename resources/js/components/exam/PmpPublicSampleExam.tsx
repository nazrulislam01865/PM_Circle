import { PmpExamTakingView } from './PmpExamTakingView';
import { PmpExamCalculator, PmpExamFinishDialog } from './PmpExamDialogs';
import type { Thresholds } from './PmpExamResultReport';
import { useEffect, useRef, useState } from 'react';
import type { ExamQuestion, ExamResponses } from './ExamShared';
import { PmpSampleReview } from './PmpSampleReview';
import { pmpPublicSampleDurationSeconds, pmpPublicSampleQuestion } from './pmpPublicSampleQuestion';

/** A local-only sample attempt using the real timed-exam and review presentation components.
 * No attempt is created, and no paid exam endpoint, answers API, or AI credit is called. */
export function PmpPublicSampleExam({ sampleQuestion = null, sampleQuestions = [], sampleDurationSeconds = pmpPublicSampleDurationSeconds, readinessThresholds }: {
    sampleQuestion?: ExamQuestion | null; sampleQuestions?: ExamQuestion[]; sampleDurationSeconds?: number; readinessThresholds: Thresholds;
}) {
    const questions = sampleQuestions.length ? sampleQuestions : sampleQuestion ? [sampleQuestion] : [pmpPublicSampleQuestion];
    const total = questions.length;
    const duration = Number.isFinite(sampleDurationSeconds) ? Math.max(30, Math.min(900, sampleDurationSeconds)) : pmpPublicSampleDurationSeconds;
    const previewRef = useRef<HTMLDivElement>(null);
    const [started, setStarted] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string | null>>({});
    const [marks, setMarks] = useState<number[]>([]);
    const [strikes, setStrikes] = useState<Record<number, string[]>>({});
    const [strikeMode, setStrikeMode] = useState(false);
    const [highlightMode, setHighlightMode] = useState(false);
    const [highlights, setHighlights] = useState<Record<number, string[]>>({});
    const [reviewed, setReviewed] = useState(false);
    const [finishOpen, setFinishOpen] = useState(false);
    const [confirmSubmit, setConfirmSubmit] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);
    const [reviewingMarked, setReviewingMarked] = useState(false);
    const lastSelection = useRef<string | null>(null);
    const [navStart, setNavStart] = useState(0);
    const [error, setError] = useState('');
    const [deadline, setDeadline] = useState(() => Date.now() + duration * 1000);
    const [seconds, setSeconds] = useState(duration);
    const [calcOpen, setCalcOpen] = useState(false);

    // As on the previous public sample, time starts when the sample scrolls into view.
    useEffect(() => {
        const element = previewRef.current;
        if (!element) return;
        const start = () => { setDeadline(Date.now() + duration * 1000); setSeconds(duration); setStarted(true); };
        if (!('IntersectionObserver' in window)) { start(); return; }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); start(); }
        }, { threshold: 0.15 });
        observer.observe(element);
        return () => observer.disconnect();
    }, [duration]);

    useEffect(() => {
        if (!started || reviewed) return;
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setSeconds(remaining);
            if (remaining === 0) { setFinishOpen(false); setConfirmSubmit(false); setCalcOpen(false); }
        };
        tick();
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
    }, [deadline, reviewed, started]);

    const question = questions[Math.min(currentIndex, total - 1)];
    const choice = answers[question.id] ?? null;
    const marked = marks.includes(question.id);
    const questionStrikes = strikes[question.id] ?? [];
    const questionHighlights = highlights[question.id] ?? [];
    const responses: ExamResponses = Object.fromEntries(questions.map(item => [String(item.id), {
        choice: answers[item.id] ?? null, marked: marks.includes(item.id),
    }]));
    const answered = questions.filter(item => Boolean(answers[item.id])).length;
    const markedIndexes = questions.flatMap((item, index) => marks.includes(item.id) ? [index] : []);
    const unansweredIndexes = questions.flatMap((item, index) => answers[item.id] ? [] : [index]);
    const finished = reviewed || seconds === 0;

    const goTo = (index: number, keepMarkedReview = false) => {
        if (index < 0 || index >= total) return;
        lastSelection.current = null;
        if (!keepMarkedReview) setReviewingMarked(false);
        setCurrentIndex(index); setNavStart(Math.floor(index / 20) * 20); setError(''); setGuideOpen(false);
    };
    const startMarkedReview = (index = markedIndexes[0]) => {
        if (index === undefined || finished) return;
        setFinishOpen(false); setReviewingMarked(true); goTo(index, true);
    };
    const toggleMark = () => {
        if (finished) return;
        setMarks(previous => previous.includes(question.id) ? previous.filter(id => id !== question.id) : [...previous, question.id]);
        if (marked && reviewingMarked) {
            const next = markedIndexes.find(i => i > currentIndex) ?? markedIndexes.find(i => i < currentIndex);
            if (next === undefined) setReviewingMarked(false);
            else goTo(next, true);
        }
    };
    const toggleStrike = (key: string) => {
        if (finished) return;
        const willStrike = !questionStrikes.includes(key);
        setStrikes(previous => ({ ...previous, [question.id]: willStrike ? [...questionStrikes, key] : questionStrikes.filter(item => item !== key) }));
        if (willStrike && choice === key) setAnswers(previous => ({ ...previous, [question.id]: null }));
        setError('');
    };
    const captureHighlight = (text: string, force = false) => {
        if ((!highlightMode && !force) || finished) return;
        if (text && text.length <= 280 && question.prompt.includes(text) && !questionHighlights.includes(text)) {
            setHighlights(previous => ({ ...previous, [question.id]: [...questionHighlights, text] }));
            window.getSelection()?.removeAllRanges();
        }
    };
    const recordSelection = (text: string) => {
        if (highlightMode) { captureHighlight(text); lastSelection.current = null; }
        else lastSelection.current = text;
    };
    const toggleHighlightMode = () => {
        if (lastSelection.current) { captureHighlight(lastSelection.current, true); lastSelection.current = null; }
        else setHighlightMode(previous => !previous);
    };
    const complete = () => {
        setReviewed(true); setCalcOpen(false); setFinishOpen(false); setConfirmSubmit(false); setGuideOpen(false);
    };
    const finish = () => {
        if (total === 1) {
            if (!choice) { setError('Select an answer before checking.'); return; }
            complete(); // Preserve the sample's one-question Check answer control.
            return;
        }
        setGuideOpen(false);
        setFinishOpen(true); // Multi-question sample follows the real pre-submit review flow.
    };
    const tryAgain = () => {
        setCurrentIndex(0); setAnswers({}); setMarks([]); setStrikes({}); setHighlights({});
        setStrikeMode(false); setHighlightMode(false); setReviewed(false); setFinishOpen(false);
        setConfirmSubmit(false); setGuideOpen(false); setCalcOpen(false); setReviewingMarked(false); lastSelection.current = null; setNavStart(0); setError('');
        setSeconds(duration); setDeadline(Date.now() + duration * 1000); setStarted(true);
    };

    return <div ref={previewRef} className={`pm-exam pm-pmp-public-exam-preview${finished ? '' : ' pm-exam-taking'}`}
        onKeyDown={event => {
            if (finished || guideOpen || finishOpen || calcOpen || event.ctrlKey || event.metaKey || event.altKey) return;
            const target = event.target as HTMLElement;
            if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
            if (event.key.toLowerCase() === 's') { event.preventDefault(); setStrikeMode(previous => !previous); }
            if (event.key.toLowerCase() === 'h') { event.preventDefault(); toggleHighlightMode(); }
        }}>
        {finished ? <PmpSampleReview questions={questions} responses={responses} onTryAgain={tryAgain} timedOut={seconds === 0} readinessThresholds={readinessThresholds}/> :
            <PmpExamTakingView questions={questions} responses={responses} index={currentIndex} selected={{ choice, marked }} seconds={seconds} duration={duration}
                guideOpen={guideOpen} strikeMode={strikeMode} highlightMode={highlightMode} reviewingMarked={reviewingMarked} markedIndexes={markedIndexes} navStart={navStart}
                strikes={questionStrikes} highlights={questionHighlights} canVisit={() => true} goto={goTo} onGuide={setGuideOpen} onToggleMark={toggleMark}
                onToggleStrike={() => setStrikeMode(previous => !previous)} onToggleHighlight={toggleHighlightMode} onCalculator={() => setCalcOpen(true)}
                onSelection={recordSelection} onRemoveHighlight={text => setHighlights(previous => ({ ...previous, [question.id]: questionHighlights.filter(item => item !== text) }))}
                onChoose={key => { if (!finished) { setAnswers(previous => ({ ...previous, [question.id]: key })); setError(''); } }} onStrike={toggleStrike}
                onPageStartChange={setNavStart} onNavigate={(target, flagged) => flagged ? startMarkedReview(target) : goTo(target)} onReviewMarked={marks.length ? () => startMarkedReview() : undefined}
                onFinish={finish} onFinal={finish} onSummary={() => setFinishOpen(true)} finishLabel="Finish Sample" finalLabel={total === 1 ? 'Check answer' : 'Finish & Review'}
                progressLabel="Sample exam time remaining" choiceError={error}/>}
        <PmpExamFinishDialog sample open={finishOpen && !finished} onOpenChange={open => { setFinishOpen(open); if (!open) setConfirmSubmit(false); }}
            confirming={confirmSubmit} onConfirmStep={() => setConfirmSubmit(true)} onBack={() => setConfirmSubmit(false)} onConfirm={complete}
            total={total} answeredCount={answered} markedIndexes={markedIndexes} unansweredIndexes={unansweredIndexes} submitting={false} canVisit={() => true}
            onClose={() => { setFinishOpen(false); setReviewingMarked(false); }} onMarked={startMarkedReview} onUnanswered={index => { setFinishOpen(false); goTo(index); }}/>
        <PmpExamCalculator open={calcOpen && !finished} onOpenChange={setCalcOpen}/>
    </div>;
}
