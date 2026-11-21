import * as Dialog from '@radix-ui/react-dialog';
import { Calculator, ChevronLeft, ChevronRight, Clock3, Flag, Highlighter, Strikethrough, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ExamExplanation, ExamOptionList, ExamStatus, Highlighted, type ExamQuestion } from './ExamShared';
import { ExamTimeProgress } from './ExamTimeProgress';
import { pmpPublicSampleDurationSeconds, pmpPublicSampleQuestion } from './pmpPublicSampleQuestion';

/** Public-only practice, reusing exam question components and never creating a paid exam attempt. */
export function PmpPublicSampleExam({ sampleQuestion = null, sampleQuestions = [], sampleDurationSeconds = pmpPublicSampleDurationSeconds }: {
    sampleQuestion?: ExamQuestion | null; sampleQuestions?: ExamQuestion[]; sampleDurationSeconds?: number;
}) {
    const questions = sampleQuestions.length ? sampleQuestions : sampleQuestion ? [sampleQuestion] : [pmpPublicSampleQuestion];
    const total = questions.length;
    const duration = Math.max(30, Math.min(900, sampleDurationSeconds));
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
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState('');
    const [deadline, setDeadline] = useState(() => Date.now() + duration * 1000);
    const [seconds, setSeconds] = useState(duration);
    const [calcOpen, setCalcOpen] = useState(false);
    const [calculator, setCalculator] = useState({ a: '', b: '', op: '+' });

    useEffect(() => {
        const element = previewRef.current;
        if (!element) return;
        const start = () => { setDeadline(Date.now() + duration * 1000); setStarted(true); };
        if (!('IntersectionObserver' in window)) { start(); return; }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); start(); }
        }, { threshold: 0.15 });
        observer.observe(element);
        return () => observer.disconnect();
    }, [duration]);

    useEffect(() => {
        if (!started || reviewed) return;
        const timer = window.setInterval(() => {
            const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setSeconds(remaining);
            if (remaining === 0) window.clearInterval(timer);
        }, 1000);
        return () => window.clearInterval(timer);
    }, [deadline, reviewed, started]);

    const question = questions[Math.min(currentIndex, total - 1)];
    const choice = answers[question.id] ?? null;
    const marked = marks.includes(question.id);
    const questionStrikes = strikes[question.id] ?? [];
    const questionHighlights = highlights[question.id] ?? [];
    const answered = questions.filter(item => answers[item.id]).length;
    const correct = questions.filter(item => answers[item.id] === item.correct).length;
    const finished = reviewed || seconds === 0;
    const clock = (value: number) => String(value).padStart(2, '0');
    const time = `${clock(Math.floor(seconds / 3600))}:${clock(Math.floor((seconds % 3600) / 60))}:${clock(seconds % 60)}`;

    const goTo = (index: number) => { setCurrentIndex(index); setError(''); };
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
    const captureHighlight = () => {
        if (!highlightMode || finished) return;
        const selection = window.getSelection();
        const text = selection?.toString().trim() ?? '';
        if (text && text.length <= 280 && question.prompt.includes(text) && !questionHighlights.includes(text)) {
            setHighlights(previous => ({ ...previous, [question.id]: [...questionHighlights, text] }));
            selection?.removeAllRanges();
        }
    };
    const finish = () => {
        if (total === 1 && !choice) { setError('Select an answer before checking.'); return; }
        if (total > 1 && answered < total) { setConfirmOpen(true); return; }
        setReviewed(true);
    };
    const tryAgain = () => {
        setCurrentIndex(0); setAnswers({}); setMarks([]); setStrikes({}); setHighlights({});
        setStrikeMode(false); setHighlightMode(false); setReviewed(false); setConfirmOpen(false);
        setError(''); setSeconds(duration); setDeadline(Date.now() + duration * 1000); setStarted(true);
    };

    const a = Number(calculator.a);
    const b = Number(calculator.b);
    const valid = calculator.a.trim() !== '' && calculator.b.trim() !== '' && Number.isFinite(a) && Number.isFinite(b) && !(calculator.op === '/' && b === 0);
    const value = calculator.op === '+' ? a + b : calculator.op === '-' ? a - b : calculator.op === '×' ? a * b : a / b;

    return <div ref={previewRef} className="pm-exam pm-pmp-public-exam-preview">
        <div className="pm-exam-examhead">
            <div className="pm-exam-examhead-title"><strong>PMP® Exam Simulator</strong></div>
            <div className="pm-exam-examhead-right">
                <span><Clock3 size={20} aria-hidden="true"/>Time Remaining: <b className={seconds < 60 ? 'is-urgent' : ''} role="timer" aria-label="Time remaining">{time}</b></span>
                <span>Question {currentIndex + 1} of {total}</span>
                <button type="button" aria-label="Mark current question for review" aria-pressed={marked} disabled={finished} onClick={toggleMark}>
                    <Flag fill={marked ? 'currentColor' : 'none'}/>
                </button>
            </div>
        </div>
        <div className="pm-exam-take-body">
            <ExamTimeProgress secondsRemaining={seconds} durationSeconds={duration} label="Sample exam time remaining"/>
            {finished && <div className="pm-pmp-sample-exam-summary" role="status">
                <p><strong>{seconds === 0 ? 'Time is up.' : 'Sample exam complete.'}</strong> Review your answers and explanations below.</p>
                <ExamStatus total={total} correct={correct} answered={answered}/>
                <button className="btn secondary pm-exam-action" type="button" onClick={tryAgain}>Try again</button>
            </div>}
            <div className="pm-exam-take-grid">
                <section className="pm-exam-panel pm-exam-question-card" aria-label="Public sample exam question">
                    {marked && !finished && <div className="pm-exam-marked-banner"><Flag size={15} fill="currentColor"/><strong>Marked for review</strong><span>· You can return to this question before finishing.</span></div>}
                    <header><span>Question {currentIndex + 1} of {total}</span><span className="pm-exam-domain">Domain: {question.domain}</span></header>
                    <div className="pm-exam-question-main">
                        <p className="pm-exam-question-prompt" onMouseUp={captureHighlight}>
                            <Highlighted content={question.prompt} active={questionHighlights} onRemove={text => setHighlights(previous => ({ ...previous, [question.id]: questionHighlights.filter(item => item !== text) }))}/>
                        </p>
                        <ExamOptionList question={question} chosen={choice} struck={questionStrikes} readonly={finished} reveal={finished}
                            strikeMode={strikeMode} onStrike={toggleStrike} onChoose={key => { setAnswers(previous => ({ ...previous, [question.id]: key })); setError(''); }}/>
                        {error && <p className="pm-pmp-public-choice-error" role="alert">{error}</p>}
                        {finished && <div className="pm-pmp-public-exam-feedback">
                            <strong>{!choice ? 'Unanswered question' : choice === question.correct ? 'Correct answer!' : 'Review your answer.'}</strong>
                            <ExamExplanation key={question.id} question={question}/>
                        </div>}
                    </div>
                    <footer>
                        <div className="pm-exam-tools">
                            <button type="button" disabled={finished} aria-pressed={marked} className={marked ? 'is-review-remove' : ''} onClick={toggleMark}><Flag size={19}/>{marked ? 'Remove Review Mark' : 'Mark for Review'}</button>
                            <button type="button" disabled={finished} aria-pressed={strikeMode} className={strikeMode ? 'is-on' : ''} onClick={() => setStrikeMode(previous => !previous)}><Strikethrough size={19}/>Strike Through</button>
                            <button type="button" disabled={finished} aria-pressed={highlightMode} className={highlightMode ? 'is-on' : ''} onClick={() => setHighlightMode(previous => !previous)}><Highlighter size={19}/>Highlight</button>
                            <button type="button" onClick={() => setCalcOpen(true)}><Calculator size={19}/>Calculator</button>
                        </div>
                        <div className="pm-exam-nextprev">
                            {total > 1 && <button type="button" className="btn secondary pm-exam-action" disabled={currentIndex === 0} onClick={() => goTo(currentIndex - 1)}><ChevronLeft size={17}/>Previous</button>}
                            {total > 1 && currentIndex + 1 < total && <button type="button" className="btn secondary pm-exam-action" onClick={() => goTo(currentIndex + 1)}>Next<ChevronRight size={17}/></button>}
                            {!finished && <button type="button" className="btn pm-exam-action" onClick={finish}>{total === 1 ? 'Check answer' : 'Finish & Review'}</button>}
                        </div>
                    </footer>
                </section>
                <aside className="pm-exam-panel pm-exam-navigator" aria-label="Sample question navigator">
                    <h2>Question Navigator</h2>
                    <div className="pm-exam-navigator-grid">{questions.map((item, index) => <button type="button" key={item.id}
                        aria-current={index === currentIndex ? 'step' : undefined} aria-label={`Question ${index + 1}${answers[item.id] ? ', answered' : ''}`}
                        className={`${index === currentIndex ? 'is-current' : ''}${answers[item.id] ? ' is-answered' : ''}`}
                        onClick={() => goTo(index)}>{index + 1}{marks.includes(item.id) && <Flag size={12} fill="currentColor"/>}</button>)}</div>
                    <div className="pm-exam-nav-legend"><span><i className="is-answered"/>Answered ({answered})</span><span><i/>Not Answered ({total - answered})</span><span><i className="is-current"/>Current Question ({currentIndex + 1})</span><span><Flag size={18}/>Marked for Review ({marks.length})</span></div>
                </aside>
            </div>
        </div>
        <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}><Dialog.Portal>
            <Dialog.Overlay className="pm-exam-modal-overlay"/>
            <Dialog.Content className="pm-exam-modal pm-pmp-public-sample-confirm">
                <Dialog.Title>Finish sample exam?</Dialog.Title>
                <Dialog.Description>You answered {answered} of {total} questions. {total - answered} will remain unanswered. You can review every explanation after finishing.</Dialog.Description>
                <div className="pm-pmp-public-sample-confirm-actions"><button type="button" className="btn secondary" onClick={() => setConfirmOpen(false)}>Continue practice</button>
                    <button type="button" className="btn" onClick={() => { setReviewed(true); setConfirmOpen(false); }}>Finish & Review</button></div>
            </Dialog.Content>
        </Dialog.Portal></Dialog.Root>
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
