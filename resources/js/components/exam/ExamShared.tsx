import { Link } from '@inertiajs/react';
import { Check, ChevronRight, CircleHelp, Flag, Layers, Lightbulb, X } from 'lucide-react';
import { useState, type ReactNode, type CSSProperties } from 'react';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardShellData } from '@/types/dashboard';

export type ExamQuestion = {
    id: number; domain: string; difficulty: string; prompt: string;
    options: Record<string, string>;
    correct?: string; explanation?: string; otherOptions?: string | null;
    takeaway?: string | null; concepts?: string | null; references?: string | null;
};
export type ExamResponse = { choice: string | null; marked: boolean };
export type ExamResponses = Record<string, ExamResponse>;
export type ExamAttempt = { id: number; total: number; expiresAt?: string; correct?: number; finishedAt?: string };

export const examBase = '/exams/pmp';
export const examResult = (id: number) => `${examBase}/attempts/${id}/result`;
export const examReview = (id: number) => `${examBase}/attempts/${id}/review`;

export function ExamPage({ shell, children }: { shell: DashboardShellData; children: ReactNode }) {
    return <MemberDashboardLayout dashboard={shell}><div className="pm-exam pm-exam-page">{children}</div></MemberDashboardLayout>;
}

type ExamBreadcrumbPart = string | { label: string; href?: string };
export function ExamBreadcrumb({ parts = [] }: { parts?: ExamBreadcrumbPart[] }) {
    const trail = [
        { label: 'Home', href: '/' },
        { label: 'Learn & Practice', href: '/learning' },
        { label: 'PMP® Exam Simulator', href: parts.length ? examBase : null },
        ...parts.map(part => typeof part === 'string' ? { label: part, href: null } : { label: part.label, href: part.href ?? null }),
    ];
    return <nav className="pm-course-detail-breadcrumb pm-exam-breadcrumb" aria-label="Breadcrumb">
        {trail.map((item, index) => <span key={`${item.label}-${index}`} className="pm-exam-crumb">
            {index > 0 && <ChevronRight aria-hidden="true" size={15}/>}
            {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current={index === trail.length - 1 ? 'page' : undefined}>{item.label}</span>}
        </span>)}
    </nav>;
}

export function ExamStatus({ total, correct, answered }: { total: number; correct: number; answered: number }) {
    const wrong = answered - correct;
    const missed = total - answered;
    const percentage = total ? Math.round(correct / total * 100) : 0;
    return <section className="pm-exam-panel pm-exam-summary" aria-label="Review summary">
        <h2>Review Summary</h2>
        <div className="pm-exam-summary-content">
            <div className="pm-exam-donut" style={{ '--exam-score': `${percentage}%`, '--exam-answered': `${total ? answered / total * 100 : 0}%` } as CSSProperties}>
                <span><strong>{total}</strong>Questions</span>
            </div>
            <div className="pm-exam-summary-items"><span><i className="good"/>Correct ({correct})<strong>{percentage}%</strong></span>
                <span><i className="bad"/>Incorrect ({wrong})<strong>{total ? Math.round(wrong / total * 100) : 0}%</strong></span>
                <span><i className="empty"/>Not Answered ({missed})<strong>{total ? Math.round(missed / total * 100) : 0}%</strong></span></div>
        </div>
    </section>;
}

export function ExamExplanation({ question }: { question: ExamQuestion }) {
    const tabs = ['Explanation', 'Key Takeaway', 'Related Concepts', 'References'] as const;
    const icons = [<Check key="a" size={19}/>, <Lightbulb key="b" size={19}/>, <Layers key="c" size={19}/>, <CircleHelp key="d" size={19}/>];
    const [tab, setTab] = useState<(typeof tabs)[number]>('Explanation');
    return <section className="pm-exam-explanation">
        <div className="pm-exam-explanation-tabs" role="tablist" aria-label="Question explanation">
            {tabs.map((label, index) => <button role="tab" type="button" key={label} aria-selected={tab === label} onClick={() => setTab(label)}>{icons[index]}{label}</button>)}
        </div>
        <div className="pm-exam-explanation-body" role="tabpanel">
            {tab === 'Explanation' && <><div className="pm-exam-correct-note"><Check size={20}/><div><strong>Correct Answer: {question.correct}</strong><p>{question.explanation}</p></div></div>
                {question.otherOptions && <div className="pm-exam-info-note"><CircleHelp size={20}/><div><strong>Why the Other Options Are Not Correct</strong><p>{question.otherOptions}</p></div></div>}</>}
            {tab === 'Key Takeaway' && <p>{question.takeaway ?? 'Review the rationale for the correct option.'}</p>}
            {tab === 'Related Concepts' && <p>{question.concepts ?? 'Project management knowledge areas'}</p>}
            {tab === 'References' && <p>{question.references ?? 'PM Circle study resources'}</p>}
        </div>
    </section>;
}

export function ExamOptionList({ question, chosen, struck = [], onChoose, onStrike, readonly = false, reveal = false, strikeMode = false }: {
    question: ExamQuestion; chosen?: string | null; struck?: string[];
    onChoose?: (key: string) => void; onStrike?: (key: string) => void;
    readonly?: boolean; reveal?: boolean; strikeMode?: boolean;
}) {
    return <div className="pm-exam-options" role="group" aria-label="Answer choices">
        {Object.entries(question.options).map(([key, content]) => {
            const isCorrect = reveal && key === question.correct;
            const isWrong = reveal && key === chosen && !isCorrect;
            const eliminated = struck.includes(key);
            return <div key={key} className={`pm-exam-choice ${key === chosen ? 'is-selected' : ''} ${struck.includes(key) ? 'is-struck' : ''} ${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-incorrect' : ''}`}>
                <label className="pm-exam-choice-label" title={eliminated ? 'Enable Strike Through and click again to restore this option' : undefined}
                    onClick={event => { if (strikeMode && onStrike) { event.preventDefault(); onStrike(key); } }}><input type="radio" name={`exam-${question.id}`} value={key}
                    checked={chosen === key} disabled={readonly || (eliminated && !strikeMode)} onChange={() => { if (!strikeMode && !eliminated) onChoose?.(key); }}/>
                    <strong>{key}.</strong><span className="pm-exam-choice-text">{content}</span></label>
                {eliminated && !readonly && onStrike && <button type="button" className="pm-exam-choice-strike" aria-label={`Cancel strike-through for option ${key}`} onClick={() => onStrike(key)}>Undo</button>}
                {isCorrect && <span className="pm-exam-choice-result">Correct Answer <Check size={14}/></span>}
                {isWrong && <span className="pm-exam-choice-result">Your Answer <X size={14}/></span>}
            </div>;
        })}
    </div>;
}

export function Highlighted({ content, active, onRemove }: { content: string; active: string[]; onRemove?: (term: string) => void }) {
    // Use React text nodes, never inject selected HTML into the question.
    const matches = active.filter(term => term.length > 0 && content.includes(term)).sort((a, b) => b.length - a.length);
    if (!matches.length) return <>{content}</>;
    const parts: ReactNode[] = [];
    let pos = 0;
    while (pos < content.length) {
        const candidate = matches.find(term => content.startsWith(term, pos));
        if (candidate) {
            const value = candidate;
            parts.push(<mark key={pos} className="pm-exam-highlight" title="Click to remove highlight" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onRemove?.(value); }}>{value}</mark>);
            pos += value.length;
        } else {
            const start = pos;
            while (pos < content.length && !matches.some(term => content.startsWith(term, pos))) pos++;
            parts.push(content.slice(start, pos));
        }
    }
    return <>{parts}</>;
}

export function ReviewFlag({ marked }: { marked?: boolean }) { return marked && <span className="pm-exam-review-flag"><Flag size={18}/>Marked for Review</span>; }
