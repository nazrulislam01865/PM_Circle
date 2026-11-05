import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, ChevronRight, Compass, HelpCircle, Layers, Settings, Target, User } from 'lucide-react';
import { useState } from 'react';
import { LearningLayout } from '@/components/learning/LearningShared';
import type { LearningShell } from '@/types/learning';

const questions = [
    {
        id: 1,
        category: 'About you',
        question: 'Which best describes your project experience?',
        help: 'Choose the closest match. Your job title doesn’t need to match exactly.',
        options: [
            "I'm a student or new to project work.",
            'I support tasks, reporting or project coordination.',
            'I manage projects and take responsibility for delivery.',
            'I lead complex projects or coach other project managers.',
            'I oversee multiple projects, governance or strategic outcomes.',
        ],
        recommendedSlug: ['student-beginner', 'project-coordinator', 'project-manager', 'senior-project-manager', 'project-director'],
    },
    {
        id: 2,
        category: 'Your learning goals',
        question: 'What is your primary goal right now?',
        help: 'Select what would make the biggest difference in your career today.',
        options: [
            'Build foundational confidence before my first formal project role.',
            'Improve day-to-day task tracking and stakeholder communication.',
            'Strengthen my scope, budget, and change control decision-making.',
            'Lead multi-team programmes and navigate executive escalations.',
            'Align project investments with organizational strategy.',
        ],
    },
    {
        id: 3,
        category: 'Your approach to situations',
        question: 'A sponsor requests a major feature change two weeks before release. What is your first instinct?',
        help: 'Choose how you would approach this unexpected constraint.',
        options: [
            'Ask my mentor or lead what procedure to follow.',
            'Check task dependencies and document the request in the change log.',
            'Assess impact on scope, schedule, and cost, then present options to the sponsor.',
            'Convene key department heads to evaluate commercial risks and trade-offs.',
            'Review portfolio governance and re-evaluate strategic benefits.',
        ],
    },
    {
        id: 4,
        category: 'Tools and methods',
        question: 'How comfortable are you with project methodologies (Agile, Waterfall, Hybrid)?',
        help: 'Be honest—there are no wrong answers.',
        options: [
            'I have heard of them, but haven’t used them on real projects.',
            'I know basic terms like sprints, backlogs, and status reports.',
            'I run sprint rituals or build Gantt schedules regularly.',
            'I tailor methodology frameworks according to organizational risk profile.',
            'I design PMO governance standards across the business.',
        ],
    },
    {
        id: 5,
        category: 'Stakeholder communication',
        question: 'When a project milestone is running late, how do you communicate it?',
        help: 'Focus on your typical communication habit.',
        options: [
            'Inform my manager immediately and ask how to proceed.',
            'Update the progress tracker and flag the delay in weekly notes.',
            'Identify root cause, prepare recovery options, and meet the sponsor.',
            'Facilitate cross-functional alignment and manage sponsor expectations.',
            'Communicate executive impact to the steering committee with strategic risk mitigations.',
        ],
    },
    {
        id: 6,
        category: 'Risk management',
        question: 'How do you handle unforeseen technical or team risks?',
        help: 'Select the practice that mirrors your current workflow.',
        options: [
            'Hope for the best or wait until an issue arises.',
            'Maintain a simple risk log and remind owners of deadlines.',
            'Actively calculate probability, impact, and pre-plan contingency responses.',
            'Conduct regular risk reviews across workstreams and coach junior leads.',
            'Manage enterprise risk exposure and audit compliance.',
        ],
    },
    {
        id: 7,
        category: 'Estimation and planning',
        question: 'How do you estimate how long tasks will take?',
        help: 'Select the description closest to your current experience.',
        options: [
            'I rely on estimates given by others without challenging them.',
            'I collect estimates from team members and compile them into a list.',
            'I use historical velocity, planning poker, or 3-point estimating.',
            'I calibrate buffer management, critical path analysis, and dependencies.',
            'I evaluate resource portfolio capacity and capital allocation models.',
        ],
    },
    {
        id: 8,
        category: 'Team collaboration',
        question: 'How do you foster alignment across diverse teams?',
        help: 'Think about how you keep everyone focused on shared outcomes.',
        options: [
            'I listen carefully and carry out my assigned responsibilities.',
            'I keep meeting minutes and send follow-ups to keep action items on track.',
            'I set clear acceptance criteria, eliminate blockers, and mediate conflict.',
            'I coach team leads in communication styles and organizational dynamics.',
            'I align executive sponsors and departmental directors on shared OKRs.',
        ],
    },
    {
        id: 9,
        category: 'Project completion',
        question: 'What happens at the end of a project in your world?',
        help: 'Reflect on project closure activities.',
        options: [
            'We finish the tasks and move on to the next assignment.',
            'We complete a checklist and archive project files.',
            'We conduct retrospectives, hand over deliverables, and document lessons.',
            'We evaluate commercial contract closure and team performance reviews.',
            'We measure long-term business value realization and ROI.',
        ],
    },
    {
        id: 10,
        category: 'Your learning preference',
        question: 'What format helps you learn practical skills best?',
        help: 'We tailor practice challenges based on your preferences.',
        options: [
            'Bite-sized lessons, quizzes, and straightforward examples.',
            'Coordinating real-world scenarios and guided checklists.',
            'Tough dilemma scenarios with AI feedback on my decision reasoning.',
            'Complex case analyses involving trade-offs and escalations.',
            'Strategic portfolio simulations and executive presentations.',
        ],
    },
];

export default function SkillsCheck({ shell }: { shell: LearningShell }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

    const q = questions[currentStep];
    const isAnswered = selectedAnswers[currentStep] !== undefined;
    const progressPercent = Math.round(((currentStep + 1) / questions.length) * 100);

    const handleSelect = (optionIndex: number) => {
        setSelectedAnswers((prev) => ({ ...prev, [currentStep]: optionIndex }));
    };

    const handleNext = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep((prev) => prev + 1);
        } else {
            // Completed 10 questions -> navigate to Starting Point Result
            const firstAnswer = selectedAnswers[0] ?? 0;
            const targetSlug =
                questions[0].recommendedSlug?.[firstAnswer] || 'student-beginner';
            router.get('/learning/starting-point-result', {
                recommended: targetSlug,
            });
        }
    };

    return (
        <LearningLayout shell={shell}>
            <Head title="Find my starting point · PM Circle" />

            <div className="pm-container pm-page">
                {/* Breadcrumbs */}
                <nav className="pm-crumbs" aria-label="Breadcrumb">
                    <Link href="/learning">Learn &amp; practise</Link> &nbsp;&gt;&nbsp;{' '}
                    <span>Find my starting point</span>
                </nav>

                <div style={{ marginBottom: '18px' }}>
                    <Link href="/learning" className="pm-back" style={{ fontWeight: 600 }}>
                        ← Back to learning paths
                    </Link>
                </div>

                <div className="pm-skills-check-intro" style={{ marginBottom: '28px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px' }}>
                        Let's find a good place to start.
                    </h1>
                    <p style={{ fontSize: '16px', color: 'var(--muted)', margin: '0 0 12px' }}>
                        Tell us a little about your experience, then try a few project situations.
                    </p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--muted)' }}>
                        <span>📋 10 questions</span>
                        <span>⏱ About 5 minutes</span>
                        <span>ⓘ You can change your path later.</span>
                    </div>
                </div>

                <div className="pm-two-column">
                    {/* Main questionnaire card */}
                    <div className="pm-skills-check-main">
                        <div className="pm-panel" style={{ padding: '28px', borderRadius: '12px' }}>
                            {/* Question meta & progress */}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '10px',
                                }}
                            >
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                                    Question {currentStep + 1} of 10 &nbsp;·&nbsp; {q.category}
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>
                                    {progressPercent}%
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div
                                style={{
                                    height: '6px',
                                    background: '#E2E8F0',
                                    borderRadius: '3px',
                                    marginBottom: '28px',
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        width: `${progressPercent}%`,
                                        height: '100%',
                                        background: 'var(--primary)',
                                        transition: 'width 0.25s ease',
                                    }}
                                />
                            </div>

                            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px' }}>
                                {q.question}
                            </h2>
                            <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 24px' }}>
                                {q.help}
                            </p>

                            {/* Option list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                                {q.options.map((opt, idx) => {
                                    const isChosen = selectedAnswers[currentStep] === idx;
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSelect(idx)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '14px',
                                                padding: '16px 20px',
                                                border: `1px solid ${isChosen ? 'var(--primary)' : 'var(--divider)'}`,
                                                borderRadius: '8px',
                                                background: isChosen ? 'var(--primary-soft)' : '#FFFFFF',
                                                color: 'var(--text)',
                                                fontSize: '15px',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    border: `2px solid ${isChosen ? 'var(--primary)' : 'var(--border)'}`,
                                                    display: 'grid',
                                                    placeItems: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {isChosen && (
                                                    <div
                                                        style={{
                                                            width: '10px',
                                                            height: '10px',
                                                            borderRadius: '50%',
                                                            background: 'var(--primary)',
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <span>{opt}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Bottom action row */}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderTop: '1px solid var(--divider)',
                                    paddingTop: '20px',
                                }}
                            >
                                <Link
                                    href="/learning"
                                    style={{
                                        color: 'var(--primary)',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                    }}
                                >
                                    Save &amp; exit
                                </Link>

                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={!isAnswered}
                                    className="pm-button pm-button-sm"
                                    style={{ minWidth: '110px' }}
                                >
                                    {currentStep === questions.length - 1 ? 'View result →' : 'Next'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right explanation sidebar */}
                    <aside className="pm-skills-check-sidebar">
                        <section className="pm-panel" style={{ padding: '24px', borderRadius: '12px', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px' }}>
                                How we recommend a path
                            </h3>

                            <div style={{ display: 'flex', gap: '14px', marginBottom: '18px' }}>
                                <User size={22} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <strong style={{ display: 'block', fontSize: '14px', marginBottom: '3px' }}>
                                        Your experience
                                    </strong>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.4 }}>
                                        We look at your background and level of project experience.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '14px', marginBottom: '18px' }}>
                                <Target size={22} color="#7C3AED" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <strong style={{ display: 'block', fontSize: '14px', marginBottom: '3px' }}>
                                        Your learning goals
                                    </strong>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.4 }}>
                                        We consider what you want to achieve and the skills you want to build.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '14px', marginBottom: '18px' }}>
                                <Compass size={22} color="#0D9488" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <strong style={{ display: 'block', fontSize: '14px', marginBottom: '3px' }}>
                                        How you approach project situations
                                    </strong>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.4 }}>
                                        You'll try a few realistic project scenarios to show how you think and make decisions.
                                    </p>
                                </div>
                            </div>

                            <small
                                style={{
                                    display: 'block',
                                    borderTop: '1px solid var(--divider)',
                                    paddingTop: '12px',
                                    fontSize: '12px',
                                    color: 'var(--muted)',
                                    lineHeight: 1.4,
                                }}
                            >
                                ⓘ Your answers guide a starting recommendation—not a professional rating.
                            </small>
                        </section>

                        <section className="pm-panel" style={{ padding: '24px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                                <Settings size={20} color="var(--primary)" />
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>You stay in control</h3>
                            </div>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                                Review the recommendation, choose another path or retake the check anytime.
                            </p>
                        </section>
                    </aside>
                </div>
            </div>
        </LearningLayout>
    );
}

