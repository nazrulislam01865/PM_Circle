import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ExamBreadcrumb, ExamExplanation, ExamOptionList, ExamPage, ExamStatus, ReviewFlag, examResult, type ExamQuestion, type ExamResponses } from '@/components/exam/ExamShared';
import type { DashboardShellData } from '@/types/dashboard';
import { useExamStart } from '@/components/exam/useExamStart';

type Filter = 'all' | 'correct' | 'incorrect' | 'unanswered' | 'marked';
export default function Review({ shell, attempt, questions, responses }: { shell: DashboardShellData;
    attempt: { id: number; total: number; correct: number }; questions: ExamQuestion[]; responses: ExamResponses }) {
    const { startExam, starting, startError } = useExamStart();
    const showMissed = new URLSearchParams(usePage().url.split('?')[1] ?? '').get('filter') === 'incorrect';
    const [index, setIndex] = useState(() => showMissed ? Math.max(0, questions.findIndex(q => Boolean(responses[q.id]?.choice && responses[q.id]?.choice !== q.correct))) : 0);
    const [filter, setFilter] = useState<Filter>(showMissed ? 'incorrect' : 'all');
    const answered = questions.filter(q => Boolean(responses[q.id]?.choice)).length;
    const filtered = useMemo(() => questions.map((q, i) => ({ q, i })).filter(({ q }) => {
        const response = responses[q.id];
        if (filter === 'correct') return Boolean(response?.choice && response.choice === q.correct);
        if (filter === 'incorrect') return Boolean(response?.choice && response.choice !== q.correct);
        if (filter === 'unanswered') return !response?.choice;
        if (filter === 'marked') return Boolean(response?.marked);
        return true;
    }), [questions, responses, filter]);
    const question = questions[index];
    return <ExamPage shell={shell}><Head title="PMP Question Review"/><ExamBreadcrumb parts={[{ label: 'Exam Result', href: examResult(attempt.id) }, 'Question Review']}/>
        <div className="pm-exam-review-top"><h1>Question Review & Detailed Explanation</h1><div>
            <Link className="btn secondary pm-exam-action" href={examResult(attempt.id)}><ArrowLeft size={18}/>Back to Result</Link>
            <button className="btn pm-exam-action" type="button" onClick={() => void startExam()} disabled={starting}><Play size={18}/>Take Another Exam</button></div></div>
        {startError && <p className="helper pm-exam-start-error" role="alert">{startError}</p>}
        <div className="pm-exam-review-grid"><aside className="pm-exam-review-side"><ExamStatus total={attempt.total} correct={attempt.correct} answered={answered}/>
            <section className="pm-exam-panel pm-exam-review-filter"><h2>Filter Questions</h2><label htmlFor="pm-exam-filter" className="sr-only">Question status</label>
                <select id="pm-exam-filter" value={filter} onChange={event => { const value = event.target.value as Filter; setFilter(value); const first = questions.findIndex(q => value === 'all' || (value === 'correct' && responses[q.id]?.choice === q.correct) || (value === 'incorrect' && Boolean(responses[q.id]?.choice && responses[q.id].choice !== q.correct)) || (value === 'unanswered' && !responses[q.id]?.choice) || (value === 'marked' && responses[q.id]?.marked)); if (first >= 0) setIndex(first); }}>
                    <option value="all">All Questions ({questions.length})</option><option value="correct">Correct ({attempt.correct})</option>
                    <option value="incorrect">Incorrect ({answered - attempt.correct})</option><option value="unanswered">Not Answered ({attempt.total - answered})</option>
                    <option value="marked">Marked for Review</option></select>
                <div className="pm-exam-review-items">{filtered.length ? filtered.map(({ q, i }) => {
                    const response = responses[q.id];
                    const status = !response?.choice ? 'Unanswered' : response.choice === q.correct ? 'Correct' : 'Incorrect';
                    return <button type="button" key={q.id} aria-current={index === i ? 'true' : undefined} onClick={() => setIndex(i)} className={index === i ? 'is-active' : ''}>
                        <strong>Q{i + 1}</strong><span className={`pm-exam-mini-status ${status.toLowerCase()}`}>{status}</span><small>{q.domain}</small><ChevronRight size={17}/></button>;
                }) : <p className="helper">No questions match this filter.</p>}</div></section>
        </aside>
        {question && <section className="pm-exam-panel pm-exam-review-question"><header><div className="pm-exam-review-prevnext"><button aria-label="Previous question" disabled={index === 0} onClick={() => setIndex(i => i - 1)}><ChevronLeft/></button>
            <button aria-label="Next question" disabled={index === questions.length - 1} onClick={() => setIndex(i => i + 1)}><ChevronRight/></button></div>
            <strong>Question {index + 1} of {questions.length}</strong><span className="pm-exam-domain">Domain: {question.domain}</span><span className="pm-exam-difficulty">Difficulty: {question.difficulty}</span>
            <ReviewFlag marked={responses[question.id]?.marked}/></header>
            <div className="pm-exam-review-main"><p className="pm-exam-question-prompt">{question.prompt}</p>
                <ExamOptionList question={question} chosen={responses[question.id]?.choice} readonly reveal/>
                <ExamExplanation key={question.id} question={question}/></div>
        </section>}</div>
    </ExamPage>;
}
