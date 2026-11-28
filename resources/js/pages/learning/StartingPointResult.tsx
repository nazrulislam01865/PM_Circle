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

            <div className="pm-container pm-page pm-starting-point">
                {/* Breadcrumbs */}
                <nav className="pm-crumbs" aria-label="Breadcrumb">
                    <Link href="/learning">Learn &amp; practise</Link> &nbsp;&gt;&nbsp;{' '}
                    <span>Your starting point</span>
                </nav>

                <div
                    className="pm-sp-result-intro"
                >
                    <div>
                        <h1 className="pm-sp-page-title">
                            Here's a good place to begin, {firstName}.
                        </h1>
                        <p className="pm-sp-lead">
                            Based on your experience, learning goal and answers to the practice questions.
                        </p>
                        <span
                            className="pm-sp-completion"
                        >
                            <CheckCircle2 size={15} /> Starting-point check completed · 10 questions
                        </span>
                    </div>

                    <span className="pm-sp-meta">
                        Illustrative recommendation ⓘ
                    </span>
                </div>

                <div className="pm-two-column">
                    {/* Main recommendation column */}
                    <div className="pm-result-main-col">
                        {/* Recommended Path Highlight Card (pm11.png) */}
                        <div
                            className="pm-panel pm-sp-card pm-sp-card-highlight pm-sp-card-spaced"
                        >
                            <div className="pm-sp-eyebrow">
                                RECOMMENDED STARTING PATH
                            </div>

                            <div className="pm-sp-badges">
                                {p.badges.map((b) => (
                                    <span
                                        key={b}
                                        className="pm-sp-badge"
                                    >
                                        {b}
                                    </span>
                                ))}
                            </div>

                            <h2 className="pm-sp-section-title">
                                {p.title}
                            </h2>

                            <p className="pm-sp-description">
                                {p.description}
                            </p>

                            <div className="pm-sp-meta-row pm-sp-result-meta">
                                <span>📖 6 modules</span>
                                <span>📋 18 practice activities</span>
                                <span>⏱ About 3 hours</span>
                            </div>

                            <div className="pm-sp-buttons">
                                <Link
                                    href={`/learning/${recommendedSlug}`}
                                    className="pm-button"
                                >
                                    Start this path
                                </Link>

                                <Link
                                    href={`/learning/${recommendedSlug}`}
                                    className="pm-button pm-button-outline"
                                >
                                    View course outline
                                </Link>
                            </div>
                        </div>

                        {/* Why we recommend this */}
                        <div className="pm-panel pm-sp-card pm-sp-card-spaced">
                            <h2 className="pm-sp-section-title">
                                Why we recommend this
                            </h2>

                            <div className="pm-sp-reason">
                                <div className="pm-sp-icon-disc">
                                    <User size={18} />
                                </div>
                                <div>
                                    <strong className="pm-sp-item-title">
                                        Your experience
                                    </strong>
                                    <p className="pm-sp-body">
                                        You're new to formal project work.
                                    </p>
                                </div>
                            </div>

                            <div className="pm-sp-reason">
                                <div className="pm-sp-icon-disc pm-sp-icon-purple">
                                    <Target size={18} />
                                </div>
                                <div>
                                    <strong className="pm-sp-item-title">
                                        Your goal
                                    </strong>
                                    <p className="pm-sp-body">
                                        You want to build confidence before your first project role.
                                    </p>
                                </div>
                            </div>

                            <div className="pm-sp-reason pm-sp-reason-last">
                                <div className="pm-sp-icon-disc pm-sp-icon-green">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <strong className="pm-sp-item-title">
                                        Your practice answers
                                    </strong>
                                    <p className="pm-sp-body">
                                        Project scope and basic planning would be useful starting topics.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Your first three steps */}
                        <div className="pm-panel pm-sp-card">
                            <h2 className="pm-sp-section-title">
                                Your first three steps
                            </h2>

                            <div className="pm-sp-steps">
                                {p.steps.map((st) => (
                                    <div
                                        key={st.num}
                                        className="pm-sp-step"
                                    >
                                        <div
                                            className="pm-sp-step-number"
                                        >
                                            {st.num}
                                        </div>
                                        <div className="pm-sp-step-copy">
                                            <strong className="pm-sp-item-title">{st.title}</strong>
                                            <span className="pm-sp-body-inline">{st.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Link
                                href={`/learning/${recommendedSlug}`}
                                className="pm-text-link pm-sp-action-link"
                            >
                                View all 6 modules →
                            </Link>
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <aside className="pm-result-sidebar">
                        {/* Topics to focus on */}
                        <div className="pm-panel pm-sp-card pm-sp-card-spaced">
                            <h3 className="pm-sp-card-title">
                                Topics to focus on
                            </h3>

                            <div className="pm-sp-topics">
                                <div className="pm-sp-topic">
                                    <FileText size={20} color="var(--blue)" className="pm-sp-topic-icon" />
                                    <span className="pm-sp-topic-label">Project basics</span>
                                </div>
                                <div className="pm-sp-topic">
                                    <Target size={20} color="var(--pm-guide-purple)" className="pm-sp-topic-icon" />
                                    <span className="pm-sp-topic-label">Scope</span>
                                </div>
                                <div className="pm-sp-topic">
                                    <Layers size={20} color="var(--green)" className="pm-sp-topic-icon" />
                                    <span className="pm-sp-topic-label">Planning</span>
                                </div>
                            </div>

                            <small className="pm-sp-meta">
                                You can revisit other topics as you progress.
                            </small>
                        </div>

                        {/* Prefer another route? */}
                        <div className="pm-panel pm-sp-card pm-sp-card-spaced">
                            <h3 className="pm-sp-card-title">
                                Prefer another route?
                            </h3>

                            <nav className="pm-sp-routes">
                                <Link
                                    href="/learning/project-coordinator"
                                    className="pm-topic-nav-item pm-sp-route"
                                >
                                    <span>Project Coordinator path</span>
                                    <ChevronRight size={16} />
                                </Link>

                                <Link
                                    href="/learning"
                                    className="pm-topic-nav-item pm-sp-route"
                                >
                                    <span>Browse all learning paths</span>
                                    <ChevronRight size={16} />
                                </Link>
                            </nav>

                            <small className="pm-sp-route-note">
                                This recommendation is a starting point. You can choose any suitable path.
                            </small>

                            <Link
                                href="/learning/skills-check"
                                className="pm-text-link pm-sp-action-link"
                            >
                                Retake starting-point check
                            </Link>
                        </div>

                        {/* Your first milestone */}
                        <div className="pm-panel pm-sp-card">
                            <h3 className="pm-sp-card-title">
                                Your first milestone
                            </h3>

                            <div className="pm-sp-milestone">
                                <div className="pm-sp-milestone-icon">
                                    <Award size={24} color="var(--muted)" />
                                </div>
                                <div>
                                    <strong className="pm-sp-item-title">Project Foundations</strong>
                                    <span className="pm-sp-body-inline pm-sp-block">
                                        Complete the path and required practice.
                                    </span>
                                    <span className="pm-sp-meta-strong">
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

