import { Link } from '@inertiajs/react';
import { BarChart3, CalendarDays, CheckCircle2, ChevronRight, Clock3, FileText, List, MonitorPlay, TrendingUp, Trophy } from 'lucide-react';
import { useState } from 'react';
import { InterviewCategoryScores, InterviewPerformanceTrend, validScore } from '@/components/interview/InterviewResultVisuals';
import { InterviewCard, InterviewEmpty, InterviewHeading, InterviewPage, InterviewStatus } from '@/components/interview/InterviewShared';
import { dateLabel, interviewBase, resultsUrl, type InterviewAnswer, type InterviewHistory, type InterviewQuestion, type InterviewShell } from '@/components/interview/types';

type Props = { shell: InterviewShell; history: InterviewHistory[]; selected: InterviewHistory | null; answers: InterviewAnswer[]; questions: InterviewQuestion[] };
type Tab = 'results' | 'questions' | 'trend';
const minutes = (entry: InterviewHistory) => {
    if (!entry.created_at || !entry.completed_at) return null;
    const duration = new Date(entry.completed_at).getTime() - new Date(entry.created_at).getTime();
    return Number.isFinite(duration) && duration >= 0 ? Math.max(1, Math.round(duration / 60000)) : null;
};

export default function Results({ shell, history, selected, answers, questions }: Props) {
    const [tab, setTab] = useState<Tab>('results');
    const [allSessions, setAllSessions] = useState(false);
    const byPosition = new Map(answers.map(answer => [answer.position, answer]));
    const score = selected ? validScore(selected.overall_score) : null;
    const tabs = [
        { key: 'results' as const, label: 'My Results', icon: BarChart3 },
        { key: 'questions' as const, label: 'Question History', icon: Clock3 },
        { key: 'trend' as const, label: 'Performance Trend', icon: TrendingUp },
    ];

    return <InterviewPage shell={shell} title="Interview Results" className="pm-interview-results-page">
        <InterviewHeading title="AI Interview Preparation" subtitle="Practice real interview questions, review your answers, and track your improvement over time."/>
        <section className="pm-interview-card pm-interview-results-top">
            <nav className="pm-interview-results-tabs" aria-label="Interview sections">
                <Link href={interviewBase}><MonitorPlay size={20}/>Practice Interview</Link>
                {tabs.map(item => { const Icon = item.icon; return <button type="button" key={item.key} className={tab === item.key ? 'is-active' : ''} onClick={() => setTab(item.key)} aria-current={tab === item.key ? 'page' : undefined}><Icon size={20}/>{item.label}</button>; })}
            </nav>
            {selected ? <>
                <div className="pm-interview-results-summary">
                    <div className="pm-interview-trophy" aria-hidden="true"><Trophy size={70} strokeWidth={1.7}/></div>
                    <div className="pm-interview-results-ident">
                        <h2>Interview Practice Result</h2>
                        <p>{selected.role} – Full Mock Interview</p>
                        <span className="pm-interview-status is-good"><CheckCircle2 size={16}/>Completed</span>
                    </div>
                    <div className="pm-interview-results-overall">
                        <span>Overall Score</span>
                        <div><strong>{score === null ? '—' : score.toFixed(1)}</strong><small> / 10</small></div>
                    </div>
                    <div className="pm-interview-results-level"><BarChart3 size={28}/><div><strong>Performance Level</strong>{score === null ? <span className="pm-interview-status is-neutral">Not scored</span> : <InterviewStatus score={score}/>}</div></div>
                </div>
                <div className="pm-interview-result-metadata">
                    <div><FileText size={24}/><span><small>Total Questions</small><strong>{selected.question_count}</strong></span></div>
                    <div><CheckCircle2 size={24}/><span><small>Answered</small><strong>{byPosition.size}</strong></span></div>
                    <div><Clock3 size={24}/><span><small>Total Time</small><strong>{minutes(selected) !== null ? `${minutes(selected)} min` : '—'}</strong></span></div>
                    <div><CalendarDays size={24}/><span><small>Date</small><strong>{dateLabel(selected.completed_at)}</strong></span></div>
                </div>
            </> : <InterviewEmpty heading="No interview results yet" message="Complete an interview to review your saved answers and practice history."/>}
        </section>
        {selected && <>
            {tab === 'results' && <InterviewCard title="Score by Category" icon={<BarChart3 size={22}/>} className="pm-interview-results-category"><InterviewCategoryScores answers={answers}/></InterviewCard>}
            {tab === 'results' && <div className="pm-interview-results-two">
                <InterviewCard title="Question-wise Result" icon={<List size={24}/>} className="pm-interview-question-results" action={<button type="button" className="pm-interview-text-action" onClick={() => setTab('questions')}>View All</button>}>
                    <div className="pm-interview-table-scroll"><table className="pm-interview-table"><thead><tr><th>#</th><th>Question (Short)</th><th>Your Score</th></tr></thead><tbody>
                        {questions.slice(0, 5).map((question, index) => { const item = byPosition.get(index); const itemScore = validScore(item?.score ?? null); return <tr key={`${question.id}-${index}`}><td>{index + 1}</td><td title={question.text}>{question.text}</td><td><span className={`pm-interview-score-pill ${itemScore === null ? 'is-unscored' : itemScore < 8 ? 'is-medium' : ''}`}>{itemScore !== null ? `${itemScore.toFixed(1)} / 10` : item ? 'Not scored' : 'Unanswered'}</span></td></tr>; })}
                    </tbody></table></div>
                </InterviewCard>
                <InterviewCard title="My Performance Trend" icon={<TrendingUp size={24}/>} className="pm-interview-trend-card"><InterviewPerformanceTrend history={history}/></InterviewCard>
            </div>}
            {tab === 'questions' && <InterviewCard title="Question History" icon={<List size={23}/>} action={<button type="button" className="pm-interview-text-action" onClick={() => setTab('results')}>Back to Results</button>}>
                <div className="pm-interview-question-history">{questions.map((question, index) => { const item = byPosition.get(index); return <article key={`${question.id}-${index}`}><div><strong>{index + 1}. {question.text}</strong><span className={`pm-interview-score-pill ${validScore(item?.score ?? null) === null ? 'is-unscored' : ''}`}>{validScore(item?.score ?? null) !== null ? `${validScore(item?.score ?? null)!.toFixed(1)} / 10` : item ? 'Answered' : 'Unanswered'}</span></div><p><b>Your answer:</b> {item?.answer ?? 'No answer recorded'}</p></article>; })}</div>
            </InterviewCard>}
            {tab === 'trend' && <InterviewCard title="My Performance Trend" icon={<TrendingUp size={24}/>}><InterviewPerformanceTrend history={history}/></InterviewCard>}
            <InterviewCard title="My Practice History" icon={<Clock3 size={24}/>} className="pm-interview-history-card" action={history.length > 3 ? <button type="button" className="pm-interview-text-action" onClick={() => setAllSessions(value => !value)}>{allSessions ? 'Show Less' : 'View All'}</button> : undefined}>
                <div className="pm-interview-table-scroll"><table className="pm-interview-table pm-interview-history-table"><thead><tr><th>Date</th><th>Interview / Role</th><th>Questions</th><th>Score</th><th><span className="sr-only">View</span></th></tr></thead><tbody>
                    {history.slice(0, allSessions ? undefined : 3).map(row => { const historyScore = validScore(row.overall_score); return <tr key={row.id}><td>{dateLabel(row.completed_at)}</td><td>{row.role} – Full Mock</td><td>{row.question_count}</td><td><span className={`pm-interview-score-pill ${historyScore === null ? 'is-unscored' : historyScore < 8 ? 'is-medium' : ''}`}>{historyScore === null ? 'Not scored' : `${historyScore.toFixed(1)} / 10`}</span></td><td><Link href={resultsUrl(row.id)} aria-label={`View results for ${dateLabel(row.completed_at)}`}><ChevronRight size={18}/></Link></td></tr>; })}
                </tbody></table></div>
            </InterviewCard>
        </>}
    </InterviewPage>;
}
