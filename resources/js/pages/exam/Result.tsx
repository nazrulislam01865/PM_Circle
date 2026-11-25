import { Head, Link } from '@inertiajs/react';
import { ClipboardCheck, RotateCcw } from 'lucide-react';
import { ExamPage, examBase, examReview } from '@/components/exam/ExamShared';
import { PmpExamResultReport, type ExamResultSummary, type DomainScore, type Thresholds } from '@/components/exam/PmpExamResultReport';
import type { DashboardShellData } from '@/types/dashboard';
import { useExamStart } from '@/components/exam/useExamStart';

export default function Result({ shell, attempt, domains, readinessThresholds }: {
    shell: DashboardShellData;
    attempt: ExamResultSummary & { id: number; finishedAt: string };
    domains: DomainScore[];
    readinessThresholds: Thresholds;
}) {
    const { startExam, starting, startError } = useExamStart();
    return <ExamPage shell={shell} className="pm-exam-result-page">
        <Head title="Exam Result Report"/>
        <PmpExamResultReport attempt={attempt} domains={domains} readinessThresholds={readinessThresholds} subtitle={`PMP® Practice Exam · Attempt ${String(attempt.id).padStart(2, '0')}`}
            breadcrumb={<nav className="pm-exam-report-breadcrumb" aria-label="Breadcrumb">
                <Link href="/dashboard/learning">Learn &amp; Practice</Link><span aria-hidden="true">/</span>
                <Link href={examBase}>PMP® Exam Simulator</Link><span aria-hidden="true">/</span>
                <span aria-current="page">Exam Result</span>
            </nav>}
            actions={<>                <Link className="btn small pm-exam-report-action" href={`${examReview(attempt.id)}?filter=missed`}>
                    <ClipboardCheck size={16} aria-hidden="true"/>Review Missed Questions
                </Link>
                <button type="button" className="btn secondary small pm-exam-report-action" onClick={() => void startExam()} disabled={starting}>
                    <RotateCcw size={16} aria-hidden="true"/>Take Another Exam
                </button>
                <Link className="pm-exam-report-home" href={examBase}>Simulator Home</Link>
</>}
            notice={startError && <p className="helper pm-exam-start-error" role="alert">{startError}</p>}/>
    </ExamPage>;
}
