import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import type { ExamQuestion, ExamResponse } from './ExamShared';

type Props = {
    questions: Pick<ExamQuestion, 'id'>[];
    responses: Record<string, ExamResponse>;
    currentIndex: number;
    onNavigate: (index: number, marked: boolean) => void;
    canVisit?: (index: number) => boolean;
    pageStart?: number;
    onPageStartChange?: (index: number) => void;
    onReviewMarked?: () => void;
    onExamSummary?: () => void;
    ariaLabel?: string;
};

/** Identical question navigator for the server-backed exam and the local-only public sample. */
export function PmpExamNavigator({ questions, responses, currentIndex, onNavigate, canVisit = () => true,
    pageStart = 0, onPageStartChange, onReviewMarked, onExamSummary, ariaLabel = 'Question Navigator' }: Props) {
    const total = questions.length;
    const answeredCount = questions.filter(item => Boolean(responses[item.id]?.choice)).length;
    const markedCount = questions.filter(item => Boolean(responses[item.id]?.marked)).length;
    const navigator = questions.slice(pageStart, pageStart + 20);

    return <aside className="pm-exam-panel pm-exam-navigator" aria-label={ariaLabel}>
        <h2>Question Navigator</h2>
        <div className="pm-exam-navigator-grid">
            {navigator.map((q, offset) => {
                const i = pageStart + offset;
                const response = responses[q.id];
                const marked = Boolean(response?.marked);
                return <button type="button" key={q.id}
                    aria-label={`Question ${i + 1}${response?.choice ? ', answered' : ', not answered'}${marked ? ', marked for review' : ''}`}
                    aria-current={i === currentIndex ? 'true' : undefined}
                    className={`${i === currentIndex ? 'is-current' : ''} ${response?.choice ? 'is-answered' : ''}`}
                    disabled={!canVisit(i)} onClick={() => onNavigate(i, marked)}>
                    {i + 1}{marked && <Flag size={12} fill="currentColor" aria-hidden="true"/>}
                </button>;
            })}
        </div>
        {total > 20 && <div className="pm-exam-nav-pages">
            <button type="button" disabled={pageStart === 0} onClick={() => onPageStartChange?.(Math.max(0, pageStart - 20))}>
                <ChevronLeft aria-hidden="true"/>Prev 20
            </button>
            <button type="button" disabled={pageStart + 20 >= total} onClick={() => onPageStartChange?.(pageStart + 20)}>
                Next 20<ChevronRight aria-hidden="true"/>
            </button>
        </div>}
        <div className="pm-exam-nav-summary" aria-label="Exam progress">
            <div><strong>{answeredCount}</strong><span>Answered</span></div>
            <div><strong>{total - answeredCount}</strong><span>Remaining</span></div>
            <div><strong>{markedCount}</strong><span>Marked</span></div>
        </div>
        <p className="pm-exam-nav-key">
            <span><i className="is-answered"/>Answered</span>
            <span><i className="is-current"/>Current</span>
            <span><Flag size={14} aria-hidden="true"/>Marked</span>
        </p>
        {markedCount > 0 && (onReviewMarked || onExamSummary) && <div className="pm-exam-navigator-actions">
            {onReviewMarked && <button type="button" className="btn secondary pm-exam-action" onClick={onReviewMarked}>Review Marked Questions</button>}
            {onExamSummary && <button type="button" className="btn secondary pm-exam-action" onClick={onExamSummary}>Exam Summary</button>}
        </div>}
    </aside>;
}
