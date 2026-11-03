import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Award, CheckCircle2, ChevronRight, Compass, FileText, Layers, RefreshCw, Sparkles, Target, User } from 'lucide-react';
import { LearningLayout } from '@/components/learning/LearningShared';
import type { LearningShell } from '@/types/learning';

type Props = {
    shell: LearningShell;
    recommendedSlug?: string;
};

const pathwayDetails: Record<
    string,
    {
        title: string;
        level: string;
        badges: string[];
        description: string;
        modules: string[];
        steps: { num: number; title: string; desc: string }[];
    }
> = {
    'student-beginner': {
        title: 'Start your project management journey',
        level: 'Student & Beginner',
        badges: ['Student', 'Beginner'],
        description:
            'Build a practical foundation in project goals, scope, planning, stakeholders and risk.',
        modules: ['What is a project?', 'Define the goal and scope', 'Build a simple project plan', 'Work with people and stakeholders', 'Spot risks and track progress', 'Close the project and learn'],
        steps: [
            { num: 1, title: 'What is a project?', desc: 'Understand projects and ongoing operations.' },
            { num: 2, title: 'Define the goal and scope', desc: 'Turn an idea into a clear outcome.' },
            { num: 3, title: 'Build a simple project plan', desc: 'Break work into manageable tasks.' },
        ],
    },
    'project-coordinator': {
        title: 'Coordinate work with confidence',
        level: 'Project Coordinator',
        badges: ['Coordinator', 'Intermediate'],
        description:
            'Track tasks, report progress clearly and communicate effectively with cross-functional stakeholders.',
        modules: ['Organise project tasks', 'Track team progress', 'Communicate status', 'Manage dependencies', 'Wrap up delivery'],
        steps: [
            { num: 1, title: 'Organise project tasks', desc: 'Structure backlogs and assign owners.' },
            { num: 2, title: 'Track team progress', desc: 'Identify blockers early in standups.' },
            { num: 3, title: 'Communicate status', desc: 'Deliver actionable, transparent updates.' },
        ],
    },
    'project-manager': {
        title: 'Lead delivery and make trade-offs',
        level: 'Project Manager',
        badges: ['Project Manager', 'Leadership'],
        description:
            'Master triple constraint trade-offs across scope, budget, risk, and delivery timelines.',
        modules: ['Establish project objectives', 'Manage scope', 'Plan the schedule', 'Budget and resources', 'Assess risks', 'Lead the team', 'Control change', 'Close the project'],
        steps: [
            { num: 1, title: 'Establish project objectives', desc: 'Align deliverables to commercial goals.' },
            { num: 2, title: 'Manage scope', desc: 'Prevent creep with formal change control.' },
            { num: 3, title: 'Plan the schedule', desc: 'Build realistic critical path models.' },
        ],
    },
};

export default function StartingPointResult({ shell, recommendedSlug = 'student-beginner' }: Props) {
    const p = pathwayDetails[recommendedSlug] || pathwayDetails['student-beginner'];
    const firstName = shell.member?.name?.split(' ')[0] || 'Member';

    return (
        <LearningLayout shell={shell}>
            <Head title="Your starting point · PM Circle" />

            <div className="pm-container pm-page">
                {/* Breadcrumbs */}
                <nav className="pm-crumbs" aria-label="Breadcrumb">
                    <Link href="/learning">Learn &amp; practise</Link> &nbsp;&gt;&nbsp;{' '}
                    <span>Your starting point</span>
                </nav>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '24px',
                    }}
                >
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: 850, margin: '0 0 8px' }}>
                            Here's a good place to begin, {firstName}.
                        </h1>
                        <p style={{ fontSize: '16px', color: 'var(--muted)', margin: '0 0 12px' }}>
                            Based on your experience, learning goal and answers to the practice questions.
                        </p>
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#EDF8F1',
                                color: '#146C43',
                                borderRadius: '16px',
                                padding: '4px 12px',
                                fontSize: '13px',
                                fontWeight: 700,
                            }}
                        >
                            <CheckCircle2 size={15} /> Starting-point check completed · 10 questions
                        </span>
                    </div>

                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        Illustrative recommendation ⓘ
                    </span>
                </div>

                <div className="pm-two-column">
                    {/* Main recommendation column */}
                    <div className="pm-result-main-col">
                        {/* Recommended Path Highlight Card (pm11.png) */}
                        <div
                            className="pm-panel"
                            style={{
                                padding: '32px',
                                borderRadius: '12px',
                                borderTop: '4px solid var(--primary)',
                                marginBottom: '24px',
                            }}
                        >
                            <div style={{ fontSize: '11px', letterSpacing: '1px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '10px' }}>
                                RECOMMENDED STARTING PATH
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                {p.badges.map((b) => (
                                    <span
                                        key={b}
                                        style={{
                                            background: 'var(--primary-soft)',
                                            color: 'var(--primary)',
                                            borderRadius: '14px',
                                            padding: '3px 10px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {b}
                                    </span>
                                ))}
                            </div>

                            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 10px' }}>
                                {p.title}
                            </h2>

                            <p style={{ fontSize: '15px', color: 'var(--text)', lineHeight: 1.5, margin: '0 0 18px' }}>
                                {p.description}
                            </p>

                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>
                                <span>📖 6 modules</span>
                                <span>📋 18 practice activities</span>
                                <span>⏱ About 3 hours</span>
                            </div>

                            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                <Link
                                    href={`/learning/${recommendedSlug}`}
                                    className="pm-button"
                                    style={{ padding: '12px 24px' }}
                                >
                                    Start this path
                                </Link>

                                <Link
                                    href={`/learning/${recommendedSlug}`}
                                    className="pm-button pm-button-outline"
                                    style={{ padding: '12px 24px' }}
                                >
                                    View course outline
                                </Link>
                            </div>
                        </div>

                        {/* Why we recommend this */}
                        <div className="pm-panel" style={{ padding: '28px', borderRadius: '12px', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px' }}>
                                Why we recommend this
                            </h3>

                            <div style={{ display: 'flex', gap: '16px', marginBottom: '18px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                    <User size={18} />
                                </div>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>
                                        Your experience
                                    </strong>
                                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
                                        You're new to formal project work.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px', marginBottom: '18px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F5F3FF', color: '#7C3AED', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                    <Target size={18} />
                                </div>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>
                                        Your goal
                                    </strong>
                                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
                                        You want to build confidence before your first project role.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ECFDF5', color: '#059669', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>
                                        Your practice answers
                                    </strong>
                                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
                                        Project scope and basic planning would be useful starting topics.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Your first three steps */}
                        <div className="pm-panel" style={{ padding: '28px', borderRadius: '12px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 18px' }}>
                                Your first three steps
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                                {p.steps.map((st) => (
                                    <div
                                        key={st.num}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            padding: '14px 18px',
                                            background: '#F8FAFC',
                                            borderRadius: '8px',
                                            border: '1px solid var(--divider)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                background: 'var(--primary-soft)',
                                                color: 'var(--primary)',
                                                fontWeight: 800,
                                                fontSize: '13px',
                                                display: 'grid',
                                                placeItems: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {st.num}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <strong style={{ display: 'block', fontSize: '14px' }}>{st.title}</strong>
                                            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{st.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Link
                                href={`/learning/${recommendedSlug}`}
                                className="pm-text-link"
                                style={{ fontWeight: 700, fontSize: '14px' }}
                            >
                                View all 6 modules →
                            </Link>
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <aside className="pm-result-sidebar">
                        {/* Topics to focus on */}
                        <div className="pm-panel" style={{ padding: '24px', borderRadius: '12px', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 14px' }}>
                                Topics to focus on
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                                <div style={{ background: '#F8FAFC', border: '1px solid var(--divider)', borderRadius: '8px', padding: '12px 8px', textAlign: 'center' }}>
                                    <FileText size={20} color="var(--primary)" style={{ margin: '0 auto 6px' }} />
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Project basics</span>
                                </div>
                                <div style={{ background: '#F8FAFC', border: '1px solid var(--divider)', borderRadius: '8px', padding: '12px 8px', textAlign: 'center' }}>
                                    <Target size={20} color="#7C3AED" style={{ margin: '0 auto 6px' }} />
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Scope</span>
                                </div>
                                <div style={{ background: '#F8FAFC', border: '1px solid var(--divider)', borderRadius: '8px', padding: '12px 8px', textAlign: 'center' }}>
                                    <Layers size={20} color="#0D9488" style={{ margin: '0 auto 6px' }} />
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Planning</span>
                                </div>
                            </div>

                            <small style={{ color: 'var(--muted)', fontSize: '12px' }}>
                                You can revisit other topics as you progress.
                            </small>
                        </div>

                        {/* Prefer another route? */}
                        <div className="pm-panel" style={{ padding: '24px', borderRadius: '12px', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 14px' }}>
                                Prefer another route?
                            </h3>

                            <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                                <Link
                                    href="/learning/project-coordinator"
                                    className="pm-topic-nav-item"
                                    style={{ padding: '8px 0' }}
                                >
                                    <span>Project Coordinator path</span>
                                    <ChevronRight size={16} />
                                </Link>

                                <Link
                                    href="/learning"
                                    className="pm-topic-nav-item"
                                    style={{ padding: '8px 0' }}
                                >
                                    <span>Browse all learning paths</span>
                                    <ChevronRight size={16} />
                                </Link>
                            </nav>

                            <small style={{ display: 'block', color: 'var(--muted)', fontSize: '12px', lineHeight: 1.4, marginBottom: '12px' }}>
                                This recommendation is a starting point. You can choose any suitable path.
                            </small>

                            <Link
                                href="/learning/skills-check"
                                className="pm-text-link"
                                style={{ fontSize: '13px', fontWeight: 700 }}
                            >
                                Retake starting-point check
                            </Link>
                        </div>

                        {/* Your first milestone */}
                        <div className="pm-panel" style={{ padding: '24px', borderRadius: '12px' }}>
                            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 14px' }}>
                                Your first milestone
                            </h3>

                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #E2E8F0', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                    <Award size={24} color="#94A3B8" />
                                </div>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '14px' }}>Project Foundations</strong>
                                    <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>
                                        Complete the path and required practice.
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                                        No award yet
                                    </span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </LearningLayout>
    );
}

