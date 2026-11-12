import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Info, RotateCcw } from 'lucide-react';
import { ExamPage, examBase, examReview } from '@/components/exam/ExamShared';
import type { DashboardShellData } from '@/types/dashboard';
import { useExamStart } from '@/components/exam/useExamStart';

type ExamResultAttempt = {
    id: number;
    total: number;
    correct: number;
    answered: number;
    finishedAt: string;
};

type DomainScore = { domain: string; total: number; correct: number };
type ReadinessLevel = 'needs-improvement' | 'below-target' | 'target' | 'above-target';

const readinessBands: { key: ReadinessLevel; label: string }[] = [
    { key: 'needs-improvement', label: 'Needs Improvement' },
    { key: 'below-target', label: 'Below Target' },
    { key: 'target', label: 'Target' },
    { key: 'above-target', label: 'Above Target' },
];

// These are educational practice bands, not official PMP examination ratings.
// The practice readiness target (70%) matches the existing simulator guidance.
function readinessLevel(percent: number): ReadinessLevel {
    if (percent < 25) return 'needs-improvement';
    if (percent < 70) return 'below-target';
    if (percent < 85) return 'target';
    return 'above-target';
}

function scorePercent(correct: number, total: number): number {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
}

function OverallPerformance({ correct, total }: { correct: number; total: number }) {
    const percent = scorePercent(correct, total);
    const level = readinessLevel(percent);
    const status = {
        'needs-improvement': 'Needs Improvement',
        'below-target': 'Below Practice Target',
        target: 'Practice Target Achieved',
        'above-target': 'Above Practice Target',
    }[level];

    return <div className={`pm-exam-report-overall is-${level}`}>
        <div className="pm-exam-report-outcome">
            <span className="pm-exam-report-outcome-icon" aria-hidden="true">
                {level === 'target' || level === 'above-target' ? <CheckCircle2 size={22}/> : <AlertTriangle size={22}/>}
            </span>
            <div><h3>{status}</h3><p>Your practice attempt is complete.</p></div>
        </div>
        <div className="pm-exam-report-scale" aria-label={`Your result: ${percent}% — ${status}`}>
            <div className="pm-exam-report-pointer" style={{ left: `clamp(32px, ${Math.max(0, Math.min(100, percent))}%, calc(100% - 32px))` }} aria-hidden="true">
                <span>Your result</span><i/>
            </div>
            <div className="pm-exam-report-bands">
                {readinessBands.map(band => <span key={band.key} className={`pm-exam-report-band is-${band.key}`}>{band.label}</span>)}
            </div>
        </div>
    </div>;
}

function DomainPerformance({ domains }: { domains: DomainScore[] }) {
    const domainOrder = ['People', 'Process', 'Business Environment'];
    const orderedDomains = [...domains].sort((a, b) => {
        const first = domainOrder.indexOf(a.domain);
        const second = domainOrder.indexOf(b.domain);
        return (first < 0 ? domainOrder.length : first) - (second < 0 ? domainOrder.length : second);
    });
    const lowestDomain = orderedDomains.filter(domain => domain.total > 0)
        .reduce<DomainScore | null>((lowest, domain) => !lowest || scorePercent(domain.correct, domain.total) < scorePercent(lowest.correct, lowest.total) ? domain : lowest, null);

    return <div className="pm-exam-report-domain-section">
        <h2>Performance by Domain</h2>
        {orderedDomains.length ? <div className="pm-exam-report-domains">
            {orderedDomains.map(domain => {
                const level = readinessLevel(scorePercent(domain.correct, domain.total));
                const label = readinessBands.find(band => band.key === level)?.label;
                return <div className="pm-exam-report-domain-row" key={domain.domain}>
                    <strong>{domain.domain}</strong>
                    <span><span className={`pm-exam-report-status is-${level}`}>{label}</span></span>
                </div>;
            })}
        </div> : <p className="pm-exam-report-no-domains">No domain results are available for this attempt.</p>}
        {lowestDomain && <p className="pm-exam-report-tip"><Info size={15} aria-hidden="true"/>
            <span>Start with {lowestDomain.domain}, then review your missed questions.</span>
        </p>}
    </div>;
}

function PracticeSummary({ attempt }: { attempt: ExamResultAttempt }) {
    const incorrect = Math.max(0, attempt.answered - attempt.correct);
    const unanswered = Math.max(0, attempt.total - attempt.answered);
    return <section className="pm-exam-report-summary" aria-label="Practice Summary">
        <h2>Practice Summary</h2>
        <div className="pm-exam-report-summary-stat"><strong>{attempt.total}</strong><span>Questions</span></div>
        <div className="pm-exam-report-summary-stat"><strong>{attempt.correct}</strong><span>Correct</span></div>
        <div className="pm-exam-report-summary-stat"><strong>{incorrect}</strong><span>Incorrect</span></div>
        <div className="pm-exam-report-summary-stat"><strong>{unanswered}</strong><span>Unanswered</span></div>
    </section>;
}

export default function Result({ shell, attempt, domains }: {
    shell: DashboardShellData;
    attempt: ExamResultAttempt;
    domains: DomainScore[];
}) {
    const { startExam, starting, startError } = useExamStart();
    return <ExamPage shell={shell}>
        <Head title="Exam Result Report"/>
        <div className="pm-exam-report">
            <nav className="pm-exam-report-breadcrumb" aria-label="Breadcrumb">
                <Link href="/dashboard/learning">Learn &amp; Practice</Link><span aria-hidden="true">/</span>
                <Link href={examBase}>PMP® Exam Simulator</Link><span aria-hidden="true">/</span>
                <span aria-current="page">Exam Result</span>
            </nav>

            <header className="pm-exam-report-heading">
                <div><h1>Exam Result Report</h1><p>PMP® Practice Exam · Attempt {String(attempt.id).padStart(2, '0')}</p></div>
                <span className="pm-exam-report-label">SIMULATOR REPORT</span>
            </header>

            <section className="pm-exam-panel pm-exam-report-card" aria-labelledby="pm-exam-overall-title">
                <h2 id="pm-exam-overall-title">Overall Performance</h2>
                <OverallPerformance correct={attempt.correct} total={attempt.total}/>
                <DomainPerformance domains={domains}/>
            </section>

            <PracticeSummary attempt={attempt}/>
            <div className="pm-exam-report-actions">
                <Link className="btn small pm-exam-report-action" href={`${examReview(attempt.id)}?filter=incorrect`}>
                    <ClipboardCheck size={16} aria-hidden="true"/>Review Missed Questions
                </Link>
                <button type="button" className="btn secondary small pm-exam-report-action" onClick={() => void startExam()} disabled={starting}>
                    <RotateCcw size={16} aria-hidden="true"/>Take Another Exam
                </button>
                <Link className="pm-exam-report-home" href={examBase}>Simulator Home</Link>
            </div>
            {startError && <p className="helper pm-exam-start-error" role="alert">{startError}</p>}
            <p className="pm-exam-report-footnote">PM Circle practice results are for preparation only.</p>
        </div>
    </ExamPage>;
}
