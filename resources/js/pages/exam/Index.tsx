import { Head, Link, router } from '@inertiajs/react';
import { BookOpenCheck, ChartNoAxesColumnIncreasing, ChevronRight, Clock3, FileText, Play, RotateCcw, Target, Trophy } from 'lucide-react';
import { ExamBreadcrumb, ExamPage, examResult } from '@/components/exam/ExamShared';
import type { DashboardShellData } from '@/types/dashboard';

type PreviousAttempt = { id: number; status: string; total_questions: number; correct_count: number | null; started_at: string; finished_at: string | null };
export default function Index({ shell, availableQuestions, fullLength, attempts }: { shell: DashboardShellData; availableQuestions: number; fullLength: boolean; attempts: PreviousAttempt[] }) {
    const duration = fullLength ? 230 : Math.max(10, Math.ceil(availableQuestions * 230 / 180));
    return <ExamPage shell={shell}><Head title="PMP Exam Simulator" />
        <ExamBreadcrumb />
        <section className="pm-exam-intro">
            <div className="pm-exam-intro-main"><h1>PMP® Exam Simulator</h1>
                <p>Practise project management scenarios with timed questions, performance analysis, and detailed explanations.</p>
                <div className="pm-exam-benefits">
                    <div><span><Target/></span><div><strong>Real Exam Experience</strong><small>Practise scenario-based multiple-choice questions under a time limit</small></div></div>
                    <div><span><Clock3/></span><div><strong>{fullLength ? 'Full-Length Practice Test' : 'Sample Practice Test'}</strong><small>{availableQuestions} questions &nbsp; | &nbsp; {duration} minutes{!fullLength ? ' · Sample bank; full 180-question set not yet available' : ' (3 hr 50 min)'}</small></div></div>
                    <div><span><ChartNoAxesColumnIncreasing/></span><div><strong>Performance Analysis</strong><small>Overall score, domain results, and explanations after submission</small></div></div>
                    <div><span><RotateCcw/></span><div><strong>Multiple Attempts</strong><small>Practise again to build your confidence</small></div></div>
                </div>
                <button className="btn pm-exam-start" type="button" disabled={!availableQuestions}
                    onClick={() => router.post('/exams/pmp/start')}><Play size={20}/>Start PMP® Practice Exam <ChevronRight size={21}/></button>
                {!availableQuestions && <p className="helper">The practice question bank is empty. Ask an administrator to run the PMP question seeder.</p>}
            </div>
            <div className="pm-exam-illustration"><img src="/images/exam/pmp-simulator-illustration.webp" alt="PMP practice checklist on a laptop beside a stopwatch" width="607" height="391" loading="eager" decoding="async"/></div>
        </section>
        <div className="pm-exam-home-grid"><section className="pm-exam-panel pm-exam-history"><header><h2>Your Practice Tests</h2><span>{attempts.length} recent attempts</span></header>
            {attempts.length ? <div className="pm-exam-table-wrap"><table><thead><tr><th>Attempt</th><th>Date</th><th>Questions</th><th>Score</th><th>Status</th><th>Action</th></tr></thead><tbody>
                {attempts.map((attempt, i) => <tr key={attempt.id}><td>Practice Exam {attempts.length - i}</td><td>{new Date(attempt.started_at).toLocaleDateString()}</td><td>{attempt.total_questions}</td>
                    <td>{attempt.correct_count !== null ? `${Math.round(attempt.correct_count / attempt.total_questions * 100)}% (${attempt.correct_count}/${attempt.total_questions})` : '—'}</td>
                    <td><span className={`pm-exam-status ${attempt.status === 'completed' ? 'is-complete' : ''}`}>{attempt.status === 'completed' ? 'Completed' : 'In progress'}</span></td>
                    <td><Link href={attempt.status === 'completed' ? examResult(attempt.id) : `/exams/pmp/attempts/${attempt.id}`} className="pm-exam-table-link">{attempt.status === 'completed' ? 'View Result' : 'Continue'}</Link></td></tr>)}
            </tbody></table></div> : <p className="pm-exam-empty">No attempts yet. Start a practice exam to see your progress here.</p>}</section>
            <aside className="pm-exam-panel pm-exam-glance"><h2>ⓘ &nbsp;PMP® Exam at a Glance</h2>
                <div><FileText/><span>Total Questions: <strong>{availableQuestions}{!fullLength && ' (sample)'}</strong></span></div>
                <div><Clock3/><span>Exam Duration: <strong>{duration} minutes</strong></span></div>
                <div><BookOpenCheck/><span>Question Types: <strong>Scenario-based multiple choice</strong></span></div>
                <div><Trophy/><span>Practice Readiness: <strong>Target ≥ 70% (practice only)</strong></span></div>
            </aside></div>
        <p className="pm-exam-educational">PM Circle practice assessments are for learning and do not represent official PMP® certification.</p>
    </ExamPage>;
}
