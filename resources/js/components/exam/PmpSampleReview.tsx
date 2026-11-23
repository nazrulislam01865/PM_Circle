import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { ExamOptionList, ExamStatus, type ExamQuestion, type ExamResponse } from './ExamShared';
import { PmpReviewExplanation } from './PmpReviewExplanation';
import { matchesReviewFilter, reviewQuestionMetadata, type ReviewFilter } from './pmpReviewContent';

const filters: { value: ReviewFilter; label: string }[] = [
    { value: 'all', label: 'All Questions' }, { value: 'missed', label: 'Missed' },
    { value: 'unanswered', label: 'Unanswered' }, { value: 'flagged', label: 'Flagged' },
];

/** Identical review panels and explanation tabs to the real exam; local answers, no attempt or AI access. */
export function PmpSampleReview({ questions, responses, onTryAgain, timedOut }: {
    questions: ExamQuestion[]; responses: Record<string, ExamResponse>;
    onTryAgain: () => void; timedOut: boolean;
}) {
    const [filter, setFilter] = useState<ReviewFilter>('all');
    const [position, setPosition] = useState(0);
    const correct = questions.filter(q => responses[q.id]?.choice === q.correct).length;
    const answered = questions.filter(q => Boolean(responses[q.id]?.choice)).length;
    const filtered = questions.filter(q => matchesReviewFilter(q, responses[q.id], filter));
    const question = filtered[position] ?? null;
    const metadata = question ? reviewQuestionMetadata(question) : null;

    return <div className="pm-exam-page pm-exam-review-page pm-pmp-public-sample-review" aria-label="Sample exam results">
        <p className="pm-pmp-sample-review-status" role="status">
            <strong>{timedOut ? 'Time is up.' : 'Sample exam complete.'}</strong> Review your answers and detailed explanations below.
        </p>
        <div className="pm-exam-review-top">
            <h2>Question Review &amp; Detailed Explanation</h2>
            <button type="button" className="pm-review-outline-button" onClick={onTryAgain}><RotateCcw size={16} aria-hidden="true"/>Try again</button>
        </div>
        <div className="pm-exam-review-grid">
            <aside className="pm-exam-review-side">
                <ExamStatus total={questions.length} correct={correct} answered={answered}/>
                <section className="pm-exam-panel pm-exam-review-filter" aria-label="Filter reviewed questions">
                    <h2>Filter Questions</h2>
                    <div className="pm-pmp-review-filter-actions" role="group" aria-label="Review question filters">
                        {filters.map(item => <button type="button" key={item.value}
                            className={filter === item.value ? 'is-active' : undefined}
                            aria-pressed={filter === item.value}
                            onClick={() => { setFilter(item.value); setPosition(0); }}>{item.label}</button>)}
                    </div>
                    <p className="pm-review-filter-count">{filtered.length} {filtered.length === 1 ? 'question matches' : 'questions match'} this filter.</p>
                </section>
            </aside>
            {question ? <section key={question.id} className="pm-exam-panel pm-exam-review-question" aria-label={`Review question ${position + 1}`}>
                <header className="pm-review-question-header">
                    <div className="pm-exam-review-prevnext">
                        <button type="button" aria-label="Previous filtered question" disabled={position === 0}
                            onClick={() => setPosition(i => i - 1)}><ChevronLeft size={17}/></button>
                        <button type="button" aria-label="Next filtered question" disabled={position === filtered.length - 1}
                            onClick={() => setPosition(i => i + 1)}><ChevronRight size={17}/></button>
                    </div>
                    <strong>Question {position + 1} of {filtered.length}</strong>
                    <div className="pm-review-question-badges">
                        <span>{question.domain}</span><span>{question.difficulty}</span>
                        {metadata?.approach && <span>{metadata.approach}</span>}
                        {responses[question.id]?.marked && <span className="pm-review-marked">Flagged</span>}
                    </div>
                </header>
                <div className="pm-exam-review-main">
                    <p className="pm-exam-question-prompt">{question.prompt}</p>
                    <ExamOptionList question={question} chosen={responses[question.id]?.choice} readonly reveal/>
                    {!responses[question.id]?.choice && <p className="pm-exam-review-unanswered">You left this question unanswered.</p>}
                    <PmpReviewExplanation key={question.id} question={question}/>
                </div>
            </section> : <section className="pm-exam-panel pm-exam-review-question">
                <p className="pm-pmp-empty">No questions match this filter. Choose another status.</p>
            </section>}
        </div>
    </div>;
}
