import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCopy, Lightbulb, RotateCcw, Target, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { InterviewCard, InterviewDonut, InterviewProgress, responseBreakdown } from './InterviewShared';
import type { Evaluation } from './types';

function FeedbackList({ kind, title, items }: { kind: 'strength' | 'improvement' | 'suggestion'; title: string; items: string[] }) {
    const Icon = kind === 'strength' ? ThumbsUp : kind === 'improvement' ? ThumbsDown : Target;
    return <section className={`pm-interview-feedback-list is-${kind}`}><h3><Icon size={21}/>{title}</h3><ul>{items.map((item, index) => <li key={index}><CheckCircle2 size={14}/><span>{item}</span></li>)}</ul></section>;
}

export function InterviewFeedback({ evaluation, onRetry, onBack, onNext, last, busy }: {
    evaluation: Evaluation; onRetry: () => void; onBack: () => void; onNext: () => void; last: boolean; busy: boolean;
}) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try { await navigator.clipboard.writeText(evaluation.suggested_answer); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
        catch { setCopied(false); }
    };
    return <div className="pm-interview-feedback">
        <div className="pm-interview-feedback-grid"><div className="pm-interview-feedback-left">
            <div className="pm-interview-eval-summary"><InterviewDonut score={evaluation.score}/><div><h2>AI Evaluation</h2><span className="pm-interview-status is-good"><CheckCircle2 size={16}/>{evaluation.score >= 8 ? 'Good Answer' : evaluation.score >= 6 ? 'Developing Answer' : 'Needs Improvement'}</span><p>{evaluation.summary}</p></div></div>
            <InterviewCard title="Score Breakdown" icon={<Target size={20}/>}><div className="pm-interview-breakdown">{responseBreakdown(evaluation).map(row => <div key={row.label}><span>{row.label}</span><InterviewProgress value={row.score}/><strong>{row.score.toFixed(1)} / 10</strong></div>)}</div></InterviewCard>
        </div><div className="pm-interview-feedback-right">
            <FeedbackList kind="strength" title="Strengths" items={evaluation.strengths}/>
            <FeedbackList kind="improvement" title="Areas for Improvement" items={evaluation.improvements}/>
            <FeedbackList kind="suggestion" title="Suggestions to Improve" items={evaluation.suggestions}/>
        </div></div>
        <section className="pm-interview-suggestion"><div className="pm-interview-suggestion-head"><h3><Lightbulb size={19}/>AI Suggested Answer</h3><button type="button" onClick={() => void copy()}><ClipboardCopy size={16}/>{copied ? 'Copied' : 'Copy'}</button></div><p>{evaluation.suggested_answer}</p></section>
        <div className="pm-interview-feedback-actions"><button type="button" className="pm-button pm-button-outline" onClick={onRetry} disabled={busy}><RotateCcw size={18}/>Try Again</button>
            <div><button type="button" className="pm-button pm-button-outline" onClick={onBack}><ArrowLeft size={17}/>Back to Question</button><button type="button" className="pm-button" disabled={busy} onClick={onNext}>{last ? 'View My Results' : 'Next Question'}<ArrowRight size={18}/></button></div>
        </div>
        <p className="pm-interview-educational">AI feedback is for interview practice and learning, not an official employment or certification assessment.</p>
    </div>;
}
