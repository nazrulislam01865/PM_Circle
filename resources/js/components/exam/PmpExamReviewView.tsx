import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { ExamOptionList, ExamStatus, type ExamQuestion, type ExamResponses } from './ExamShared';
import { PmpReviewExplanation } from './PmpReviewExplanation';
import { matchesReviewFilter, reviewQuestionMetadata, type ReviewFilter } from './pmpReviewContent';
type Filter = ReviewFilter;
const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All Questions' }, { value: 'missed', label: 'Missed' },
    { value: 'unanswered', label: 'Unanswered' }, { value: 'flagged', label: 'Flagged' },
];

/** Shared question review; only the authenticated caller can supply an AI chat footer. */
export function PmpExamReviewView({ questions, responses, total, correct, initial = 'all', actions, renderQuestionFooter }: {
    questions: ExamQuestion[]; responses: ExamResponses; total: number; correct: number; initial?: Filter;
    actions: ReactNode; renderQuestionFooter?: (question: ExamQuestion, metadata: string) => ReactNode;
}) {
    const [filter, setFilter] = useState<Filter>(initial);
    const [position, setPosition] = useState(0);
    const answered = useMemo(() => questions.filter(q => Boolean(responses[q.id]?.choice)).length, [questions, responses]);
    const filtered = useMemo(() => questions.filter(question =>
        matchesReviewFilter(question, responses[question.id], filter)
    ), [questions, responses, filter]);
    const question = filtered[position] ?? null;
    const metadata = question ? reviewQuestionMetadata(question) : null;

    return <>
        <div className="pm-exam-review-top"><h1>Question Review &amp; Detailed Explanation</h1>
            {actions}
        </div>
        <div className="pm-exam-review-grid"><aside className="pm-exam-review-side">
            <ExamStatus total={total} correct={correct} answered={answered}/>
            <section className="pm-exam-panel pm-exam-review-filter"><h2>Filter Questions</h2>
                <div className="pm-pmp-review-filter-actions" role="group" aria-label="Review question filters">
                    {filters.map(item => <button key={item.value} type="button" className={filter === item.value ? 'is-active' : undefined}
                        aria-pressed={filter === item.value} onClick={() => { setFilter(item.value); setPosition(0); }}>
                        {item.label}
                    </button>)}
                </div>
                <p className="pm-review-filter-count" aria-live="polite">{filtered.length} question{filtered.length === 1 ? '' : 's'} match this filter.</p>
            </section>
        </aside>
        {question ? <section key={question.id} className="pm-exam-panel pm-exam-review-question" aria-label="Question review">
            <header className="pm-review-question-header"><div className="pm-exam-review-prevnext">
                <button type="button" aria-label="Previous filtered question" disabled={position === 0}
                    onClick={() => setPosition(i => i - 1)}><ChevronLeft size={17}/></button>
                <button type="button" aria-label="Next filtered question" disabled={position === filtered.length - 1}
                    onClick={() => setPosition(i => i + 1)}><ChevronRight size={17}/></button>
            </div><strong>Question {position + 1} of {filtered.length}</strong>
                <div className="pm-review-question-badges"><span>{question.domain}</span><span>{question.difficulty}</span>
                    {metadata?.approach && <span>{metadata.approach}</span>}
                    {responses[question.id]?.marked && <span className="pm-review-marked">Flagged</span>}
                </div>
            </header>
            <div className="pm-exam-review-main"><p className="pm-exam-question-prompt">{question.prompt}</p>
                <ExamOptionList question={question} chosen={responses[question.id]?.choice} readonly reveal/>
                {!responses[question.id]?.choice && <p className="pm-exam-review-unanswered">You left this question unanswered.</p>}
                <PmpReviewExplanation key={question.id} question={question}/>
                {renderQuestionFooter?.(question, [question.code, metadata?.industry, 'Single Select'].filter(Boolean).join(' · '))}
            </div>
        </section> : <section className="pm-exam-panel pm-exam-review-question"><p className="pm-pmp-empty">No questions match this filter. Choose another status.</p></section>}
        </div>
    </>;
}
