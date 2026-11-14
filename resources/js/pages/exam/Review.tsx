import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    ExamBreadcrumb, ExamExplanation, ExamOptionList, ExamPage, ExamStatus, ReviewFlag,
    type ExamQuestion, type ExamResponses,
} from '@/components/exam/ExamShared';
import type { DashboardShellData } from '@/types/dashboard';

type Filter = 'all' | 'missed' | 'unanswered' | 'flagged';
const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All Questions' }, { value: 'missed', label: 'Missed' },
    { value: 'unanswered', label: 'Unanswered' }, { value: 'flagged', label: 'Flagged' },
];

export default function Review({ shell, attempt, questions, responses }: {
    shell: DashboardShellData;
    attempt: { id: number; total: number; correct: number };
    questions: ExamQuestion[];
    responses: ExamResponses;
}) {
    const query = new URLSearchParams(usePage().url.split('?')[1] ?? '');
    const requested = query.get('filter');
    const initial: Filter = requested === 'incorrect' || requested === 'missed' ? 'missed'
        : requested === 'unanswered' || requested === 'flagged' ? requested : 'all';
    const [filter, setFilter] = useState<Filter>(initial);
    const [position, setPosition] = useState(0);
    const [aiByQuestion, setAiByQuestion] = useState<Record<number, { explanation: string; nextStep: string }>>({});
    const [aiBusy, setAiBusy] = useState(false);
    const [aiError, setAiError] = useState('');
    const answered = questions.filter(q => Boolean(responses[q.id]?.choice)).length;
    const filtered = useMemo(() => questions.filter(question => {
        const response = responses[question.id];
        if (filter === 'missed') return !response?.choice || response.choice !== question.correct;
        if (filter === 'unanswered') return !response?.choice;
        if (filter === 'flagged') return Boolean(response?.marked);
        return true;
    }), [questions, responses, filter]);
    const question = filtered[position] ?? null;

    const askAi = async () => {
        if (!question || aiBusy) return;
        setAiBusy(true);
        setAiError('');
        try {
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const response = await fetch(`/exams/pmp/attempts/${attempt.id}/questions/${question.id}/ai-help`, {
                method: 'POST', credentials: 'same-origin',
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': token },
            });
            if (!response.ok) {
                const errors: Record<number, string> = {
                    402: 'There are no AI credits available for this account.',
                    409: 'An AI explanation is already being prepared. Try again shortly.',
                    419: 'Session expired. Refresh the page.',
                    429: 'Too many AI requests. Try again later.',
                    503: 'AI question help is not configured or is temporarily unavailable.',
                };
                throw new Error(errors[response.status] ?? 'AI help could not be loaded. Please try again.');
            }
            const result: { explanation?: string; nextStep?: string } = await response.json();
            if (!result.explanation) throw new Error('AI returned an incomplete explanation.');
            setAiByQuestion(old => ({ ...old, [question.id]: { explanation: result.explanation ?? '', nextStep: result.nextStep ?? '' } }));
        } catch (error) {
            setAiError(error instanceof Error ? error.message : 'Unable to load AI help.');
        } finally {
            setAiBusy(false);
        }
    };

    return <ExamPage shell={shell}>
        <Head title="PMP Question Review"/>
        <ExamBreadcrumb parts={[{ label: 'PMP Exam Simulator', href: '/exams/pmp?tab=history' }, 'Question Review']}/>
        <div className="pm-exam-review-top"><h1>Question Review &amp; Detailed Explanation</h1>
            <Link className="btn secondary pm-exam-action" href="/exams/pmp?tab=history"><ArrowLeft size={18}/>Back to Exam History</Link>
        </div>
        <div className="pm-exam-review-grid"><aside className="pm-exam-review-side">
            <ExamStatus total={attempt.total} correct={attempt.correct} answered={answered}/>
            <section className="pm-exam-panel pm-exam-review-filter"><h2>Filter Questions</h2>
                <div className="pm-pmp-review-filter-actions" role="group" aria-label="Review question filters">
                    {filters.map(item => <button key={item.value} type="button" className={filter === item.value ? 'is-active' : undefined}
                        aria-pressed={filter === item.value} onClick={() => { setFilter(item.value); setPosition(0); setAiError(''); }}>
                        {item.label}
                    </button>)}
                </div>
                <p className="helper">{filtered.length} question{filtered.length === 1 ? '' : 's'} match this filter.</p>
                <p className="helper">Missed includes both incorrect and unanswered questions.</p>
            </section>
        </aside>
        {question ? <section className="pm-exam-panel pm-exam-review-question">
            <header><div className="pm-exam-review-prevnext">
                <button type="button" aria-label="Previous filtered question" disabled={position === 0}
                    onClick={() => { setPosition(i => i - 1); setAiError(''); }}><ChevronLeft/></button>
                <button type="button" aria-label="Next filtered question" disabled={position === filtered.length - 1}
                    onClick={() => { setPosition(i => i + 1); setAiError(''); }}><ChevronRight/></button>
            </div><strong>Question {position + 1} of {filtered.length}</strong>
                <span className="pm-exam-domain">Domain: {question.domain}</span>
                <span className="pm-exam-difficulty">Difficulty: {question.difficulty}</span>
                <ReviewFlag marked={responses[question.id]?.marked}/>
            </header>
            <div className="pm-exam-review-main"><p className="pm-exam-question-prompt">{question.prompt}</p>
                <ExamOptionList question={question} chosen={responses[question.id]?.choice} readonly reveal/>
                {!responses[question.id]?.choice && <p className="pm-exam-review-unanswered">You left this question unanswered.</p>}
                <ExamExplanation key={question.id} question={question}/>
                <section className="pm-pmp-review-ai" aria-label="Additional AI question assistance">
                    <button type="button" className="pm-pmp-secondary" disabled={aiBusy} onClick={() => void askAi()}>
                        <Sparkles size={17}/>{aiBusy ? 'Getting AI help...' : 'Ask AI About This Answer'}
                    </button>
                    {aiError && <p role="alert" className="pm-pmp-action-error">{aiError} <Link href="/exams/pmp?tab=ai">View AI Usage</Link></p>}
                    {aiByQuestion[question.id] && <div className="pm-pmp-ai-answer" role="status">
                        <strong>AI study help (educational guidance, not official PMP scoring)</strong>
                        <p>{aiByQuestion[question.id].explanation}</p>
                        {aiByQuestion[question.id].nextStep && <p><strong>Next step:</strong> {aiByQuestion[question.id].nextStep}</p>}
                    </div>}
                </section>
            </div>
        </section> : <section className="pm-exam-panel pm-exam-review-question"><p className="pm-pmp-empty">No questions match this filter. Choose another status.</p></section>}
        </div>
    </ExamPage>;
}
