import { Link } from '@inertiajs/react';
import { BookOpen, Brain, ChartNoAxesColumnIncreasing, ChevronRight, ClipboardList, Clock3, Compass, FileText, Medal, Pencil, Play, Settings, ShieldCheck, Sprout, Target, Users, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { LearningPathCardData } from '@/types/learning';
import { learningPathHref } from '@/types/learning';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { LearningShell } from '@/types/learning';

export const levels = ['All levels', 'Student & Beginner', 'Project Coordinator', 'Project Manager', 'Senior Project Manager', 'Project Director'];
export const pathIcon: Record<string, LucideIcon> = {
    'student-beginner': Sprout, 'project-coordinator': Users, 'project-manager': ChartNoAxesColumnIncreasing,
    'senior-project-manager': Settings, 'project-director': Target,
};
export const activityIcon: Record<string, LucideIcon> = {
    lesson: Play, mcq: ClipboardList, short_answer: Pencil, scenario: Brain,
};
export function LearningLayout({ shell, children }: { shell: LearningShell; children: ReactNode }) {
    return <MemberDashboardLayout dashboard={shell} variant="learning"><div className="pm-learn-content">{children}</div><LearningFooter /></MemberDashboardLayout>;
}
export function LearningFooter() {
    return <footer className="pm-learn-footer" aria-label="Footer"><div className="pm-learn-footer-logo"><span className="pm-learn-footer-symbol">◉</span><span><strong>PM Circle</strong><small>by ITQAN</small></span></div>
        <nav aria-label="Footer links"><Link href="/about">About</Link><Link href="/about">Help</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/about">Contact</Link></nav>
        <div className="pm-learn-social" aria-hidden="true"><span>in</span><span>▶</span><span>𝕏</span><span>◎</span></div></footer>;
}
export function LearningPanel({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
    return <section className={`pm-learn-panel ${className}`}>
        {(title || action) && <div className="pm-learn-panel-heading">{title && <h2>{title}</h2>}{action}</div>}{children}</section>;
}
export function LearningProgress({ percent, label }: { percent: number; label?: string }) {
    const width = Math.max(0, Math.min(100, percent));
    return <div className="pm-learn-progress-wrap"><div className="pm-learn-progress" role="progressbar" aria-label={label || 'Progress'} aria-valuenow={width} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${width}%`}} /></div><span>{width}%</span></div>;
}
export function LearningBadge({ children }: { children: ReactNode }) {
    return <span className="pm-learn-badge">{children}</span>;
}
export function PathCard({ item }: { item: LearningPathCardData }) {
    const Icon = pathIcon[item.slug] || BookOpen;
    const started = item.completed > 0;
    return <article className="pm-learn-panel pm-learn-path-card"><div className="pm-learn-path-heading"><div className={`pm-learn-path-icon theme-${item.slug}`}><Icon size={39} strokeWidth={1.7}/></div>
        <div><span className="pm-learn-eyebrow">{item.level}</span><h3>{item.title}</h3><p>{item.summary}</p></div></div>
        <div className="pm-learn-path-meta"><FileText size={17}/>{item.moduleCount} modules · {item.practiceCount} practice activities</div>
        <div className="pm-learn-path-tags"><LearningBadge>MCQ</LearningBadge><LearningBadge>{item.slug === 'project-manager' ? 'Written responses' : 'Short answers'}</LearningBadge><LearningBadge>Scenarios</LearningBadge></div>
        <div className="pm-learn-path-bottom"><span className="pm-learn-status">{started ? <><span className="pm-learn-mini-circle active" />In progress · {item.progress}%</> : <><span className="pm-learn-mini-circle"/>Not started</>}</span>
            <Link className={`pm-dash-btn ${started ? 'pm-dash-btn-primary':'pm-dash-btn-white'}`} href={learningPathHref(item.slug)}>{started ? 'Continue path' : 'Explore path'}</Link></div></article>;
}
export function LearningPracticeIcon({ type, size = 20 }: { type: string; size?: number }) {
    const Icon = activityIcon[type] || Compass;
    return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}
export function LearningAchievement({ condensed = false }: { condensed?: boolean }) {
    return <div className={`pm-learn-achievement ${condensed ? 'condensed':''}`}><span className="pm-learn-medal"><Medal size={36}/></span>
        <div><strong>Project Foundations</strong><p>{condensed ? 'Finish the path and required practice to earn this achievement.' : 'Complete all 6 modules and required practice.'}</p></div></div>;
}
export function InfoStrip({ children }: { children: ReactNode }) {
    return <div className="pm-learn-info-strip"><ShieldCheck size={19}/><span>{children}</span><ChevronRight size={16}/></div>;
}
export const practiceFormats = [
    { type: 'mcq', title: 'Multiple-choice quiz', description: 'Check your understanding.', duration:'5 – 10 min', icon: ClipboardList },
    { type: 'short_answer', title: 'Short-answer practice', description: 'Explain your reasoning.', duration:'10 min', icon: Pencil },
    { type: 'scenario', title: 'Scenario decisions', description: 'Explore trade-offs.', duration:'10 – 15 min', icon: Brain },
    { type: 'lesson', title: 'Case analysis', description: 'Work through a larger challenge.', duration:'20 – 30 min', icon: FileText },
];
