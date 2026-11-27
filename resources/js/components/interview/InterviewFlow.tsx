import { Link } from '@inertiajs/react';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { InterviewCard, InterviewPage } from './InterviewShared';
import { interviewBase, scoreLabel, type Evaluation, type InterviewHistory, type InterviewQuestion, type InterviewShell } from './types';

export const professionFor = (role: string) => /scrum|agile coach/i.test(role) ? 'Scrum Master' : /business analys/i.test(role) ? 'Business Analysis' : /product (manager|owner|management)/i.test(role) ? 'Product Management' : /project|program|programme/i.test(role) ? 'Project Management' : 'Other';
export const questionTopic = (question: InterviewQuestion) => question.topic || question.text;
export function Difficulty({ question }: { question: InterviewQuestion }) {
    const difficulty = question.difficulty || (question.type === 'Situational' || question.type === 'Technical' ? 'Medium' : 'Easy');
    return <span className={`pm-if-tag is-${difficulty.toLowerCase()}`}>{difficulty}</span>;
}
export function FlowPage({ shell, children, rail, hero = false, heroCopy }: { shell: InterviewShell; children: ReactNode; rail?: ReactNode; hero?: boolean; heroCopy?: { title: string; description: string } }) {
    return <InterviewPage shell={shell} className="pm-interview-flow"><header className="pm-if-heading"><div><h1>Interview Preparation</h1><p>Practice for your next project management interview.</p></div><Link className="pm-button pm-button-outline" href={`${interviewBase}/results`}>Interview results</Link></header>
        <div className={`pm-if-layout ${rail ? '' : 'is-single'}`}><div className="pm-if-stack">{hero && <section className="pm-if-hero"><h2 className="pm-if-hero-title">{heroCopy?.title ?? "Role-focused\nInterview practice"}</h2><p>{heroCopy?.description ?? "Build a question set for your role, practice your answers, and review what to improve."}</p></section>}{children}</div>{rail && <aside className="pm-if-stack">{rail}</aside>}</div></InterviewPage>;
}
export function Wizard({ step, children, left, right }: { step?: number; children: ReactNode; left?: ReactNode; right?: ReactNode }) {
    return <section className="pm-interview-card pm-if-wizard">{step !== undefined && <ol className="pm-if-steps" aria-label="Interview preparation steps">{['Target role', 'Question set', 'Practice', 'Results'].map((label, index) => <li key={label} className={index === step ? 'is-current' : index < step ? 'is-done' : ''} aria-current={index === step ? 'step' : undefined}><span>{index < step ? <Check size={14}/> : index + 1}</span>{label}</li>)}</ol>}<div className="pm-if-pad">{children}</div><div className="pm-if-toolbar"><div>{left}</div><div>{right}</div></div></section>;
}
export function Intro({ title, description }: { title: string; description: string }) { return <div className="pm-if-intro"><h2>{title}</h2><p>{description}</p></div>; }
export function Brief({ rows, previous, coaching, resume }: { rows: [string, ReactNode][]; previous?: InterviewHistory; coaching?: boolean; resume?: ReactNode }) {
    return <><InterviewCard title="Practice brief"><dl className="pm-if-summary">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></InterviewCard><InterviewCard title={coaching ? 'Answer coaching' : 'Previous practice'}>{coaching ? <p className="pm-if-muted">Use a real example. Explain your role, the actions you took, and what changed. For hypothetical questions, explain your first steps and why.</p> : previous ? <div className="pm-if-stack-small"><strong>{previous.role}</strong><p className="pm-if-note">{scoreLabel(previous.overall_score)}/10 · {previous.answered_count === undefined ? `${previous.question_count} questions` : `${previous.answered_count}/${previous.question_count} answered`}</p><Link className="pm-button pm-button-outline pm-if-self" href={`${interviewBase}/results`}>View history</Link></div> : <p className="pm-if-muted">Completed sessions and answer feedback will appear here.</p>}</InterviewCard>{resume}</>;
}
export function Feedback({ evaluation }: { evaluation: Evaluation }) { return <section className="pm-if-box"><div className="pm-if-between"><h3>Answer feedback</h3><strong className="pm-if-score">{evaluation.score}/10</strong></div><p><strong>Strength:</strong> {evaluation.strengths.join(' ')}</p><p><strong>Improvement:</strong> {evaluation.improvements.join(' ')}</p><h3>Suggested answer outline</h3><p>{evaluation.suggested_answer}</p><p className="pm-if-note">Adapt this outline to your own experience.</p></section>; }
