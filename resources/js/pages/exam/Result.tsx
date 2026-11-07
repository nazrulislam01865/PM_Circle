import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, RotateCcw } from 'lucide-react';
import { ExamBreadcrumb, ExamPage, examBase, examReview, ExamStatus } from '@/components/exam/ExamShared';
import type { DashboardShellData } from '@/types/dashboard';

export default function Result({ shell, attempt, domains }: { shell: DashboardShellData; attempt: { id: number; total: number; correct: number; answered: number; finishedAt: string }; domains: { domain: string; total: number; correct: number }[] }) {
    const percent = attempt.total ? Math.round(attempt.correct / attempt.total * 100) : 0;
    return <ExamPage shell={shell}><Head title="PMP Practice Exam Result"/><ExamBreadcrumb parts={['Exam Result']}/>
        <div className="pm-exam-result-heading"><div><h1>Exam Result & Performance Analysis</h1><p>Your practice attempt has been submitted and scored.</p></div>
            <Link href={examBase} className="btn secondary pm-exam-action"><ArrowLeft size={17}/>Simulator home</Link></div>
        <div className="pm-exam-result-grid"><ExamStatus total={attempt.total} correct={attempt.correct} answered={attempt.answered}/>
            <section className="pm-exam-panel pm-exam-result-spotlight"><CheckCircle2 size={37}/><h2>{percent}% Overall Score</h2>
                <p>{attempt.correct} correct answers out of {attempt.total} practice questions.</p>
                <p>{percent >= 70 ? 'You reached the PM Circle practice readiness target.' : 'Review your answers and explanations to improve your understanding.'}</p>
                <div className="pm-exam-result-actions"><Link className="btn pm-exam-action" href={examReview(attempt.id)}><ClipboardCheck size={19}/>Review All Questions <ArrowRight size={17}/></Link>
                    <button type="button" className="btn secondary pm-exam-action" onClick={() => router.post(`${examBase}/start`)}><RotateCcw size={18}/>Take Another Exam</button></div>
            </section></div>
        <section className="pm-exam-panel pm-exam-domain-breakdown"><h2>Domain Performance</h2>
            <div>{domains.map(domain => <div key={domain.domain}><strong>{domain.domain}</strong>
                <div className="pm-exam-domain-progress" role="progressbar" aria-label={`${domain.domain} score`} aria-valuenow={domain.total ? Math.round(domain.correct / domain.total * 100) : 0} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${domain.total ? Math.round(domain.correct / domain.total * 100) : 0}%`}}/></div>
                <span>{domain.correct} / {domain.total} correct</span></div>)}</div>
        </section>
        <p className="pm-exam-educational">This result is educational feedback, not a PMP® certification result or official PMI examination score.</p>
    </ExamPage>;
}
