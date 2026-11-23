import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Clock3, Flag, Info, X } from 'lucide-react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ExamOptionList, Highlighted, type ExamQuestion, type ExamResponses } from './ExamShared';
import { ExamTimeProgress } from './ExamTimeProgress';
import { ExamToolGuide } from './ExamToolGuide';
import { PmpExamNavigator } from './PmpExamNavigator';
import { PmpExamQuestionHeading, PmpExamQuestionTools } from './PmpExamQuestionChrome';
import { PmpSampleReview } from './PmpSampleReview';
import { PmpSubmitReviewSummary } from './PmpSubmitReviewSummary';
import { pmpPublicSampleDurationSeconds, pmpPublicSampleQuestion } from './pmpPublicSampleQuestion';

/** A local-only sample attempt using the real timed-exam and review presentation components.
 * No attempt is created, and no paid exam endpoint, answers API, or AI credit is called. */
export function PmpPublicSampleExam({ sampleQuestion = null, sampleQuestions = [], sampleDurationSeconds = pmpPublicSampleDurationSeconds }: {
    sampleQuestion?: ExamQuestion | null; sampleQuestions?: ExamQuestion[]; sampleDurationSeconds?: number;
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
    const [navStart, setNavStart] = useState(0);
    const [error, setError] = useState('');
    const [deadline, setDeadline] = useState(() => Date.now() + duration * 1000);
    const [seconds, setSeconds] = useState(duration);
    const [calcOpen, setCalcOpen] = useState(false);
    const [calculator, setCalculator] = useState({ a: '', b: '', op: '+' });

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
            if (remaining === 0) { setFinishOpen(false); setConfirmSubmit(false); }
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
    const clock = (value: number) => String(value).padStart(2, '0');
    const time = `${clock(Math.floor(seconds / 3600))}:${clock(Math.floor((seconds % 3600) / 60))}:${clock(seconds % 60)}`;

    const goTo = (index: number) => { setCurrentIndex(index); setError(''); setGuideOpen(false); };
    const toggleMark = () => {
        if (finished) return;
        setMarks(previous => previous.includes(question.id) ? previous.filter(id => id !== question.id) : [...previous, question.id]);
    };
    const toggleStrike = (key: string) => {
        if (finished) return;
        const willStrike = !questionStrikes.includes(key);
        setStrikes(previous => ({ ...previous, [question.id]: willStrike ? [...questionStrikes, key] : questionStrikes.filter(item => item !== key) }));
        if (willStrike && choice === key) setAnswers(previous => ({ ...previous, [question.id]: null }));
        setError('');
    };
    const captureHighlight = (event: MouseEvent<HTMLParagraphElement>) => {
        if (!highlightMode || finished) return;
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !event.currentTarget.contains(selection.anchorNode) || !event.currentTarget.contains(selection.focusNode)) return;
        const text = selection.toString().trim();
        if (text && text.length <= 280 && question.prompt.includes(text) && !questionHighlights.includes(text)) {
            setHighlights(previous => ({ ...previous, [question.id]: [...questionHighlights, text] }));
            selection.removeAllRanges();
        }
    };
    const complete = () => {
        setReviewed(true); setFinishOpen(false); setConfirmSubmit(false); setGuideOpen(false);
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
        setConfirmSubmit(false); setGuideOpen(false); setNavStart(0); setError('');
        setSeconds(duration); setDeadline(Date.now() + duration * 1000); setStarted(true);
    };

    const a = Number(calculator.a);
    const b = Number(calculator.b);
    const valid = calculator.a.trim() !== '' && calculator.b.trim() !== '' && Number.isFinite(a) && Number.isFinite(b) && !(calculator.op === '/' && b === 0);
    const value = calculator.op === '+' ? a + b : calculator.op === '-' ? a - b : calculator.op === '×' ? a * b : a / b;

    return <div ref={previewRef} className="pm-exam pm-exam-taking pm-pmp-public-exam-preview">
        {finished ? <PmpSampleReview questions={questions} responses={responses} onTryAgain={tryAgain} timedOut={seconds === 0}/> : <>
            <div className="pm-exam-examhead">
                <div className="pm-exam-examhead-title"><strong>PMP® Exam Simulator</strong></div>
                <div className="pm-exam-examhead-right">{guideOpen ? <button className="btn secondary pm-exam-action" type="button" onClick={() => setGuideOpen(false)}><X size={18}/>Close</button> : <>
                    <span><Clock3 size={20} aria-hidden="true"/>Time Remaining: <b className={seconds < 60 ? 'is-urgent' : ''} role="timer" aria-label="Time remaining">{time}</b></span>
                    <span>Question {currentIndex + 1} of {total}</span>
                    <button type="button" aria-label="Mark current question for review" aria-pressed={marked} onClick={toggleMark}><Flag fill={marked ? 'currentColor' : 'none'}/></button>
                    <button type="button" className="pm-exam-guide-open" onClick={() => setGuideOpen(true)}><Info size={18}/>Exam Tools Guide</button>
                    <button type="button" className="btn secondary pm-exam-action" onClick={finish}>Finish Sample</button>
                </>}</div>
            </div>
            <div className="pm-exam-take-body">
                {guideOpen ? <ExamToolGuide/> : <>
                    <ExamTimeProgress secondsRemaining={seconds} durationSeconds={duration} label="Sample exam time remaining"/>
                    <div className="pm-exam-take-grid">
                        <section className="pm-exam-panel pm-exam-question-card" aria-label="Public sample exam question">
                            {marked && <div className="pm-exam-marked-banner"><Flag size={15} fill="currentColor"/><strong>Marked for review</strong><span>· You can review this question before submitting.</span></div>}
                            <PmpExamQuestionHeading index={currentIndex} total={total} domain={question.domain}/>
                            <div className="pm-exam-question-main">
                                <p className="pm-exam-question-prompt" onMouseUp={captureHighlight}>
                                    <Highlighted content={question.prompt} active={questionHighlights}
                                        onRemove={text => setHighlights(previous => ({ ...previous, [question.id]: questionHighlights.filter(item => item !== text) }))}/>
                                </p>
                                <ExamOptionList question={question} chosen={choice} struck={questionStrikes} strikeMode={strikeMode}
                                    onStrike={toggleStrike} onChoose={key => { setAnswers(previous => ({ ...previous, [question.id]: key })); setError(''); }}/>
                                {error && <p className="pm-pmp-public-choice-error" role="alert">{error}</p>}
                            </div>
                            <footer>
                                <PmpExamQuestionTools marked={marked} strikeMode={strikeMode} highlightMode={highlightMode}
                                    onToggleMark={toggleMark} onToggleStrike={() => setStrikeMode(previous => !previous)}
                                    onToggleHighlight={() => setHighlightMode(previous => !previous)} onCalculator={() => setCalcOpen(true)}/>
                                <div className="pm-exam-nextprev">
                                    <button type="button" className="btn secondary pm-exam-action" disabled={currentIndex === 0} onClick={() => goTo(currentIndex - 1)}><ArrowLeft size={17}/>Previous</button>
                                    {currentIndex < total - 1 ? <button type="button" className="btn pm-exam-action" onClick={() => goTo(currentIndex + 1)}>Next<ArrowRight size={17}/></button>
                                        : <button type="button" className="btn pm-exam-action" onClick={finish}>{total === 1 ? 'Check answer' : 'Finish & Review'}<ArrowRight size={17}/></button>}
                                </div>
                            </footer>
                        </section>
                        <PmpExamNavigator questions={questions} responses={responses} currentIndex={currentIndex} pageStart={navStart}
                            onPageStartChange={setNavStart} ariaLabel="Sample question navigator"
                            onNavigate={(target) => goTo(target)}
                            onReviewMarked={marks.length ? () => goTo(markedIndexes[0]) : undefined}
                            onExamSummary={() => setFinishOpen(true)}/>
                    </div>
                </>}
            </div>
        </>}
        <Dialog.Root open={finishOpen && !finished} onOpenChange={open => { setFinishOpen(open); if (!open) setConfirmSubmit(false); }}>
            <Dialog.Portal><Dialog.Overlay className="pm-exam-modal-overlay"/><Dialog.Content className={`pm-exam-modal pm-exam-finish-modal${confirmSubmit ? '' : ' pm-exam-finish-prototype'}`} aria-describedby="pm-exam-finish-description">
                {confirmSubmit ? <>
                    <Dialog.Title>Finish sample exam?</Dialog.Title>
                    <Dialog.Description id="pm-exam-finish-description">You answered {answered} of {total} questions. {total - answered} will remain unanswered. This is a sample only; no paid exam attempt is created.</Dialog.Description>
                    <div className="pm-exam-confirm-actions">
                        <button type="button" className="btn secondary pm-exam-action" onClick={() => setConfirmSubmit(false)}>Back to Summary</button>
                        <button type="button" className="btn pm-exam-action" onClick={complete}>Finish &amp; Review</button>
                    </div>
                </> : <PmpSubmitReviewSummary total={total} answeredCount={answered}
                    markedIndexes={markedIndexes} unansweredIndexes={unansweredIndexes} submitting={false}
                    canVisit={() => true} onClose={() => setFinishOpen(false)}
                    onMarked={index => { setFinishOpen(false); goTo(index); }}
                    onUnanswered={index => { setFinishOpen(false); goTo(index); }}
                    onSubmit={() => setConfirmSubmit(true)}/>}
            </Dialog.Content></Dialog.Portal>
        </Dialog.Root>
        <Dialog.Root open={calcOpen} onOpenChange={setCalcOpen}><Dialog.Portal>
            <Dialog.Overlay className="pm-exam-modal-overlay"/>
            <Dialog.Content className="pm-exam-modal pm-exam-calc" aria-describedby="pm-public-calculator-description">
                <Dialog.Close className="pm-exam-modal-close" aria-label="Close calculator"><X/></Dialog.Close>
                <Dialog.Title>Calculator</Dialog.Title>
                <Dialog.Description id="pm-public-calculator-description">Quick arithmetic during the practice exam.</Dialog.Description>
                <div className="pm-exam-calc-fields">
                    <label>First number<input type="number" value={calculator.a} onChange={event => setCalculator(previous => ({ ...previous, a: event.target.value }))}/></label>
                    <label>Operation<select value={calculator.op} onChange={event => setCalculator(previous => ({ ...previous, op: event.target.value }))}><option value="+">+</option><option value="-">−</option><option value="×">×</option><option value="/">÷</option></select></label>
                    <label>Second number<input type="number" value={calculator.b} onChange={event => setCalculator(previous => ({ ...previous, b: event.target.value }))}/></label>
                </div>
                <output className="pm-exam-calc-output">{valid ? Number(value.toFixed(8)).toLocaleString() : calculator.op === '/' && b === 0 ? 'Cannot divide by zero' : 'Enter two numbers'}</output>
            </Dialog.Content>
        </Dialog.Portal></Dialog.Root>
    </div>;
}
