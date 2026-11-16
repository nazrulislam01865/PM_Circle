import * as Dialog from '@radix-ui/react-dialog';
import { ChevronRight, X } from 'lucide-react';

type Props = {
    total: number;
    answeredCount: number;
    markedIndexes: number[];
    unansweredIndexes: number[];
    canVisit: (index: number) => boolean;
    submitting: boolean;
    onClose: () => void;
    onMarked: (index: number) => void;
    onUnanswered: (index: number) => void;
    onSubmit: () => void;
};

/** Presentation only; the parent retains submission, answer persistence and timer ownership. */
export function PmpSubmitReviewSummary({ total, answeredCount, markedIndexes, unansweredIndexes,
    canVisit, submitting, onClose, onMarked, onUnanswered, onSubmit }: Props) {
    return <div className="pm-exam-submit-review">
        <div className="pm-exam-submit-review-header">
            <Dialog.Title>Review before submitting</Dialog.Title>
            <Dialog.Description id="pm-exam-finish-description">Your timer keeps running while you review.</Dialog.Description>
            <Dialog.Close className="pm-exam-modal-close" disabled={submitting} aria-label="Close review"><X size={23}/></Dialog.Close>
        </div>
        <div className="pm-exam-submit-review-body">
            <div className="pm-exam-submit-review-counts" aria-label="Exam completion summary">
                <div className="is-answered"><strong>{answeredCount}</strong><span>Answered</span></div>
                <div className="is-unanswered"><strong>{total - answeredCount}</strong><span>Unanswered</span></div>
                <div className="is-marked"><strong>{markedIndexes.length}</strong><span>Marked for review</span></div>
            </div>
            <div className="pm-exam-submit-review-section">
                <h3>Unanswered questions</h3>
                <p>Select a question to return to it.</p>
                {unansweredIndexes.length ? <div className="pm-exam-submit-review-rows">
                    {unansweredIndexes.map(index => <button key={index} type="button" disabled={!canVisit(index) || submitting}
                        title={!canVisit(index) ? 'Answer earlier questions to unlock this question' : undefined}
                        onClick={() => onUnanswered(index)}>
                        <span>Question {index + 1}</span><ChevronRight size={19} aria-hidden="true"/>
                    </button>)}
                </div> : <p className="pm-exam-submit-review-none">All questions have been answered.</p>}
            </div>
            {markedIndexes.length > 0 && <div className="pm-exam-submit-review-section pm-exam-submit-review-flags">
                <h3>Marked for review</h3>
                <p>Select a question to return to it.</p>
                <div className="pm-exam-submit-review-rows">
                    {markedIndexes.map(index => <button key={index} type="button" disabled={submitting}
                        onClick={() => onMarked(index)}><span>Question {index + 1}</span><ChevronRight size={19} aria-hidden="true"/></button>)}
                </div>
            </div>}
        </div>
        <div className="pm-exam-submit-review-actions">
            <button type="button" className="btn secondary pm-exam-action" disabled={submitting} onClick={onClose}>Return to Exam</button>
            <button type="button" className="btn pm-exam-action" disabled={submitting} onClick={onSubmit}>Submit Exam</button>
        </div>
    </div>;
}
