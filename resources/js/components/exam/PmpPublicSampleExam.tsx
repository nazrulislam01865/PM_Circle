import * as Dialog from '@radix-ui/react-dialog';
import { Calculator, Clock3, Flag, Highlighter, Strikethrough, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ExamExplanation, ExamOptionList, Highlighted } from './ExamShared';
import { ExamTimeProgress } from './ExamTimeProgress';
import { pmpPublicSampleDurationSeconds, pmpPublicSampleQuestion as question } from './pmpPublicSampleQuestion';

/** Uses the actual paid simulator's question/option/explanation UI with local-only preview state. */
export function PmpPublicSampleExam() {
    const previewRef = useRef<HTMLDivElement>(null);
    const [started, setStarted] = useState(false);
    const [choice, setChoice] = useState<string | null>(null);
    const [marked, setMarked] = useState(false);
    const [strikes, setStrikes] = useState<string[]>([]);
    const [strikeMode, setStrikeMode] = useState(false);
    const [highlightMode, setHighlightMode] = useState(false);
    const [highlights, setHighlights] = useState<string[]>([]);
    const [reviewed, setReviewed] = useState(false);
    const [error, setError] = useState('');
    const [deadline, setDeadline] = useState(() => Date.now() + pmpPublicSampleDurationSeconds * 1000);
    const [seconds, setSeconds] = useState(pmpPublicSampleDurationSeconds);
    const [calcOpen, setCalcOpen] = useState(false);
    const [calculator, setCalculator] = useState({ a: '', b: '', op: '+' });

    useEffect(() => {
        const element = previewRef.current;
        if (!element) return;
        const start = () => {
            setDeadline(Date.now() + pmpPublicSampleDurationSeconds * 1000);
            setStarted(true);
        };
        if (!('IntersectionObserver' in window)) { start(); return; }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); start(); }
        }, { threshold: 0.15 });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!started || reviewed) return;
        const timer = window.setInterval(() => {
            const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setSeconds(remaining);
            if (remaining === 0) window.clearInterval(timer);
        }, 1000);
        return () => window.clearInterval(timer);
    }, [deadline, reviewed, started]);

    const finished = reviewed || seconds === 0;
    const clock = (value: number) => String(value).padStart(2, '0');
    const time = `${clock(Math.floor(seconds / 3600))}:${clock(Math.floor((seconds % 3600) / 60))}:${clock(seconds % 60)}`;

    function toggleStrike(key: string) {
        if (finished) return;
        const willStrike = !strikes.includes(key);
        setStrikes(previous => willStrike ? [...previous, key] : previous.filter(value => value !== key));
        if (willStrike && choice === key) setChoice(null);
        setError('');
    }

    function captureHighlight() {
        if (!highlightMode || finished) return;
        const selection = window.getSelection();
        const text = selection?.toString().trim() ?? '';
        if (text && text.length <= 280 && question.prompt.includes(text) && !highlights.includes(text)) {
            setHighlights(previous => [...previous, text]);
            selection?.removeAllRanges();
        }
    }

    function checkAnswer() {
        if (!choice) {
            setError('Select an answer before checking.');
            return;
        }
        setError('');
        setReviewed(true);
    }

    function tryAgain() {
        setChoice(null);
        setMarked(false);
        setStrikes([]);
        setStrikeMode(false);
        setHighlightMode(false);
        setHighlights([]);
        setReviewed(false);
        setError('');
        setSeconds(pmpPublicSampleDurationSeconds);
        setDeadline(Date.now() + pmpPublicSampleDurationSeconds * 1000);
    }

    const a = Number(calculator.a);
    const b = Number(calculator.b);
    const valid = calculator.a.trim() !== '' && calculator.b.trim() !== '' && Number.isFinite(a) && Number.isFinite(b) && !(calculator.op === '/' && b === 0);
    const value = calculator.op === '+' ? a + b : calculator.op === '-' ? a - b : calculator.op === '×' ? a * b : a / b;

    return <div ref={previewRef} className="pm-exam pm-pmp-public-exam-preview">
        <div className="pm-exam-examhead">
            <div className="pm-exam-examhead-title"><strong>PMP® Exam Simulator</strong></div>
            <div className="pm-exam-examhead-right">
                <span><Clock3 size={20} aria-hidden="true"/>Time Remaining: <b className={seconds < 60 ? 'is-urgent' : ''} role="timer" aria-label="Time remaining">{time}</b></span>
                <span>Question 1 of 1</span>
                <button type="button" aria-label="Mark current question for review" aria-pressed={marked} disabled={finished} onClick={() => setMarked(value => !value)}>
                    <Flag fill={marked ? 'currentColor' : 'none'}/>
                </button>
            </div>
        </div>
        <div className="pm-exam-take-body">
            <ExamTimeProgress secondsRemaining={seconds} durationSeconds={pmpPublicSampleDurationSeconds} label="Sample exam time remaining"/>
            <div className="pm-exam-take-grid">
                <section className="pm-exam-panel pm-exam-question-card" aria-label="Public sample exam question">
                    {marked && !finished && <div className="pm-exam-marked-banner"><Flag size={15} fill="currentColor"/><strong>Marked for review</strong><span>· You can review this question before checking your answer.</span></div>}
                    <header><span>Question 1 of 1</span><span className="pm-exam-domain">Domain: {question.domain}</span></header>
                    <div className="pm-exam-question-main">
                        <p className="pm-exam-question-prompt" onMouseUp={captureHighlight}>
                            <Highlighted content={question.prompt} active={highlights} onRemove={text => setHighlights(previous => previous.filter(value => value !== text))}/>
                        </p>
                        <ExamOptionList question={question} chosen={choice} struck={strikes} readonly={finished} reveal={finished}
                            strikeMode={strikeMode} onStrike={toggleStrike} onChoose={key => { setChoice(key); setError(''); }}/>
                        {error && <p className="pm-pmp-public-choice-error" role="alert">{error}</p>}
                        {finished && <div className="pm-pmp-public-exam-feedback" role="status">
                            <strong>{seconds === 0 && !reviewed ? 'Time is up.' : choice === question.correct ? 'Correct answer!' : 'Review your answer.'}</strong>
                            <ExamExplanation question={question}/>
                            <button className="btn secondary pm-exam-action" type="button" onClick={tryAgain}>Try again</button>
                        </div>}
                    </div>
                    <footer>
                        <div className="pm-exam-tools">
                            <button type="button" disabled={finished} aria-pressed={marked} className={marked ? 'is-review-remove' : ''} onClick={() => setMarked(value => !value)}><Flag size={19}/>{marked ? 'Remove Review Mark' : 'Mark for Review'}</button>
                            <button type="button" disabled={finished} aria-pressed={strikeMode} className={strikeMode ? 'is-on' : ''} onClick={() => setStrikeMode(value => !value)}><Strikethrough size={19}/>Strike Through</button>
                            <button type="button" disabled={finished} aria-pressed={highlightMode} className={highlightMode ? 'is-on' : ''} onClick={() => setHighlightMode(value => !value)}><Highlighter size={19}/>Highlight</button>
                            <button type="button" onClick={() => setCalcOpen(true)}><Calculator size={19}/>Calculator</button>
                        </div>
                        <div className="pm-exam-nextprev">
                            {!finished && <button type="button" className="btn pm-exam-action" onClick={checkAnswer}>Check answer</button>}
                        </div>
                    </footer>
                </section>
                <aside className="pm-exam-panel pm-exam-navigator" aria-label="Sample question navigator">
                    <h2>Question Navigator</h2>
                    <div className="pm-exam-navigator-grid"><button type="button" aria-current="true" className={`is-current${choice ? ' is-answered' : ''}`} aria-label="Question 1">1{marked && <Flag size={12} fill="currentColor"/>}</button></div>
                    <div className="pm-exam-nav-legend"><span><i className={choice ? 'is-answered' : ''}/>Answered ({choice ? 1 : 0})</span><span><i/>Not Answered ({choice ? 0 : 1})</span><span><i className="is-current"/>Current Question (1)</span><span><Flag size={18}/>Marked for Review ({marked ? 1 : 0})</span></div>
                </aside>
            </div>
        </div>
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
