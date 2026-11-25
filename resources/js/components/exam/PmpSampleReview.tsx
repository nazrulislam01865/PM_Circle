import { Link } from '@inertiajs/react';
import { ChevronDown, ChevronUp, ClipboardCheck, MessageCircle, RotateCcw, Sparkles } from 'lucide-react';
import { useId, useState } from 'react';
import type { ExamQuestion, ExamResponses } from './ExamShared';
import { PmpExamReviewView } from './PmpExamReviewView';
import { PmpExamResultReport, type DomainScore, type Thresholds } from './PmpExamResultReport';
import type { ReviewFilter } from './pmpReviewContent';

/** The public sample has no authenticated attempt, so this disclosure never mounts the paid tutor. */
function SampleAiRegistrationPrompt({ metadata }: { metadata: string }) {
    const [open, setOpen] = useState(false);
    const panelId = useId();

    return <section className="pm-pmp-review-ai" aria-label="AI tutoring for this question">
        <div className="pm-review-question-footer">
            <button type="button" className="pm-review-outline-button pm-review-ai-toggle"
                onClick={() => setOpen(previous => !previous)} aria-expanded={open} aria-controls={panelId}>
                <MessageCircle size={16} aria-hidden="true"/>
                Ask AI About This Answer
                {open ? <ChevronUp size={15} aria-hidden="true"/> : <ChevronDown size={15} aria-hidden="true"/>}
            </button>
            <span className="pm-review-question-meta">{metadata}</span>
        </div>
        {open && <div id={panelId} className="pm-review-ai-chat">
            <header className="pm-review-ai-chat-header">
                <div><h3><Sparkles size={17} aria-hidden="true"/> PMP Question Tutor</h3>
                    <p>Register to access AI tutoring through an eligible PM Circle membership.</p></div>
            </header>
            <p className="pm-review-ai-notice">AI chat is available with an eligible Plus or Pro membership. Create an account or sign in to continue.</p>
            <div className="pm-pmp-sample-actions">
                <Link href="/register" className="btn small">Register now</Link>
                <Link href="/login" className="pm-review-outline-button">Sign in</Link>
            </div>
        </div>}
    </section>;
}

/** Public results remain local and open the shared result report before detailed review. */
export function PmpSampleReview({ questions, responses, onTryAgain, timedOut, readinessThresholds }: {
    questions: ExamQuestion[]; responses: ExamResponses; onTryAgain: () => void; timedOut: boolean; readinessThresholds: Thresholds;
}) {
    const [view, setView] = useState<'review' | 'result'>('result');
    const [filter, setFilter] = useState<ReviewFilter>('all');
    const correct = questions.filter(q => responses[q.id]?.choice === q.correct).length;
    const answered = questions.filter(q => Boolean(responses[q.id]?.choice)).length;
    const domains = new Map<string, DomainScore>();
    for (const q of questions) {
        const domain = domains.get(q.domain) ?? { domain: q.domain, total: 0, correct: 0 };
        domain.total++;
        if (responses[q.id]?.choice === q.correct) domain.correct++;
        domains.set(q.domain, domain);
    }
    const openReview = (next: ReviewFilter) => { setFilter(next); setView('review'); };
    return <div className={`pm-exam-page pm-pmp-public-sample-review ${view === 'review' ? 'pm-exam-review-page' : 'pm-exam-result-page'}`} aria-label="Sample exam results">
        <p className="pm-pmp-sample-review-status" role="status"><strong>{timedOut ? 'Time is up.' : 'Sample exam complete.'}</strong> {view === 'result' ? 'View your result report, then choose which questions to review.' : 'Review your answers and detailed explanations below.'}</p>
        {view === 'review' ? <PmpExamReviewView questions={questions} responses={responses} total={questions.length} correct={correct} initial={filter}
            actions={<div className="pm-pmp-sample-actions"><button type="button" className="pm-review-outline-button" onClick={() => setView('result')}><ClipboardCheck size={16}/>View Result Report</button>
                <button type="button" className="pm-review-outline-button" onClick={onTryAgain}><RotateCcw size={16}/>Try again</button></div>}
            renderQuestionFooter={(question, metadata) => <SampleAiRegistrationPrompt key={question.id} metadata={metadata}/>}/>
            : <PmpExamResultReport attempt={{ total: questions.length, correct, answered }} domains={[...domains.values()]} readinessThresholds={readinessThresholds} subtitle="PMP® Public Sample · Educational practice only"
                actions={<><button type="button" className="btn small pm-exam-report-action" onClick={() => openReview('missed')}><ClipboardCheck size={16}/>Review Missed Questions</button>
                    <button type="button" className="btn secondary small pm-exam-report-action" onClick={() => openReview('all')}>Review All Questions</button>
                    <button type="button" className="btn secondary small pm-exam-report-action" onClick={onTryAgain}><RotateCcw size={16}/>Try again</button></>}/>}
    </div>;
}
