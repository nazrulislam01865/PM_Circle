import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';

export type ExamResultSummary = {
    total: number;
    correct: number;
    answered: number;
};

export type DomainScore = { domain: string; total: number; correct: number };
export type Thresholds = { needs_improvement_below: number; target_below: number; above_target_from: number };
type ReadinessLevel = 'needs-improvement' | 'below-target' | 'target' | 'above-target';

const readinessBands: { key: ReadinessLevel; label: string }[] = [
    { key: 'needs-improvement', label: 'Needs Improvement' },
    { key: 'below-target', label: 'Below Target' },
    { key: 'target', label: 'Target' },
    { key: 'above-target', label: 'Above Target' },
];

// These are educational practice bands, not official PMP examination ratings.
// The practice readiness target (70%) matches the existing simulator guidance.
function readinessLevel(percent: number, thresholds: Thresholds): ReadinessLevel {
    if (percent < thresholds.needs_improvement_below) return 'needs-improvement';
    if (percent < thresholds.target_below) return 'below-target';
    if (percent < thresholds.above_target_from) return 'target';
    return 'above-target';
}

function scorePercent(correct: number, total: number): number {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
}

function OverallPerformance({ correct, total, thresholds }: { correct: number; total: number; thresholds: Thresholds }) {
    const percent = scorePercent(correct, total);
    const level = readinessLevel(percent, thresholds);
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

function DomainPerformance({ domains, thresholds }: { domains: DomainScore[]; thresholds: Thresholds }) {
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
                const level = readinessLevel(scorePercent(domain.correct, domain.total), thresholds);
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

function PracticeSummary({ attempt }: { attempt: ExamResultSummary }) {
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

export function PmpExamResultReport({ attempt, domains, readinessThresholds, subtitle, breadcrumb, actions, notice }: {
    attempt: ExamResultSummary; domains: DomainScore[]; readinessThresholds: Thresholds; subtitle: string;
    breadcrumb?: ReactNode; actions: ReactNode; notice?: ReactNode;
}) {
    return <div className="pm-exam-report">{breadcrumb}
            <header className="pm-exam-report-heading">
                <div><h1>Exam Result Report</h1><p>{subtitle}</p></div>
                <span className="pm-exam-report-label">SIMULATOR REPORT</span>
            </header>

            <section className="pm-exam-panel pm-exam-report-card" aria-labelledby="pm-exam-overall-title">
                <h2 id="pm-exam-overall-title">Overall Performance</h2>
                <OverallPerformance correct={attempt.correct} total={attempt.total} thresholds={readinessThresholds}/>
                <DomainPerformance domains={domains} thresholds={readinessThresholds}/>
            </section>

            <PracticeSummary attempt={attempt}/>
        <div className="pm-exam-report-actions">{actions}</div>{notice}
        <p className="pm-exam-report-footnote">PM Circle practice results are for preparation only.</p>
    </div>;
}
