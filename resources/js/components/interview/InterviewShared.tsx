import { Head, Link } from '@inertiajs/react';
import { ArrowRight, BarChart3, CheckCircle2, Mic2, Sparkles } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { InterviewShell } from './types';

export function InterviewPage({ shell, children, title = 'Interview Preparation', className = '' }: { shell: InterviewShell; children: ReactNode; title?: string; className?: string }) {
    return <MemberDashboardLayout dashboard={shell}><Head title={title}/><div className={`pm-interview ${className}`.trim()}>{children}</div></MemberDashboardLayout>;
}
export function InterviewHeading({ title = 'Interview Preparation', subtitle = 'Practice real interview questions, save your answers, and track your progress.' }: { title?: string; subtitle?: string }) {
    return <header className="pm-interview-heading"><Mic2 aria-hidden="true" size={34}/><div><h1>{title}</h1><p>{subtitle}</p></div></header>;
}
export function InterviewCard({ title, icon, action, children, className = '' }: { title?: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
    return <section className={`pm-interview-card ${className}`}>
        {title && <div className="pm-interview-card-head"><h2>{icon}{title}</h2>{action}</div>}
        <div className="pm-interview-card-body">{children}</div>
    </section>;
}
export function InterviewProgress({ value, max = 10 }: { value: number; max?: number }) {
    return <div className="pm-interview-progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <span style={{ width: `${max ? Math.min(100, Math.max(0, value / max * 100)) : 0}%` }}/></div>;
}
export function InterviewDonut({ score, label = '/ 10' }: { score: number; label?: string }) {
    return <div className="pm-interview-donut" style={{ '--interview-progress': `${Math.min(100, Math.max(0, score * 10))}%` } as CSSProperties} aria-label={`Score ${score.toFixed(1)} out of 10`}>
        <div><strong>{score.toFixed(1)}</strong><small>{label}</small></div>
    </div>;
}
export function InterviewStatus({ score }: { score: number }) {
    const good = score >= 8;
    return <span className={`pm-interview-status ${good ? 'is-good' : score >= 6 ? 'is-medium' : 'is-low'}`}>
        <CheckCircle2 size={16}/>{good ? 'Strong Candidate' : score >= 6 ? 'Good Potential' : 'Keep Practicing'}
    </span>;
}
export function InterviewEmpty({ heading, message, action = true }: { heading: string; message: string; action?: boolean }) {
    return <div className="pm-interview-empty"><Sparkles size={32}/><h3>{heading}</h3><p>{message}</p>{action && <Link className="pm-button" href="/interview-preparation">Start Interview Practice <ArrowRight size={18}/></Link>}</div>;
}
export function InterviewScoreRows({ rows, max = 10, unit = '/ 10' }: { rows: { label: string; score: number }[]; max?: number; unit?: string }) {
    return <div className="pm-interview-score-rows">{rows.map(row => <div className="pm-interview-score-row" key={row.label}><span>{row.label}</span><InterviewProgress value={row.score} max={max}/><strong>{row.score} {unit}</strong></div>)}</div>;
}
export const responseBreakdown = (data: { relevance: number; pm_knowledge: number; clarity: number; communication: number }) => [
    { label: 'Relevance to Question', score: data.relevance },
    { label: 'PM Concepts & Best Practices', score: data.pm_knowledge },
    { label: 'Structure & Clarity', score: data.clarity },
    { label: 'Communication & Depth', score: data.communication },
];
export const categoryBreakdown = (data: { relevance: number; pm_knowledge: number; clarity: number; communication: number; leadership: number; problem_solving: number }) => [
    { label: 'PM Knowledge & Concepts', score: data.pm_knowledge },
    { label: 'Communication & Clarity', score: data.communication },
    { label: 'Leadership & Management', score: data.leadership },
    { label: 'Problem Solving', score: data.problem_solving },
];
export { ArrowRight, BarChart3 };
