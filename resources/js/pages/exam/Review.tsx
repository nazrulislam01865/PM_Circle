import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ExamPage, type ExamQuestion, type ExamResponses } from '@/components/exam/ExamShared';
import { PmpExamReviewView } from '@/components/exam/PmpExamReviewView';
import { PmpQuestionAiChat } from '@/components/exam/PmpQuestionAiChat';
import type { ReviewFilter } from '@/components/exam/pmpReviewContent';
import type { DashboardShellData } from '@/types/dashboard';
export default function Review({ shell, attempt, questions, responses }: {
    shell: DashboardShellData;
    attempt: { id: number; total: number; correct: number };
    questions: ExamQuestion[];
    responses: ExamResponses;
}) {
    const query = new URLSearchParams(usePage().url.split('?')[1] ?? '');
    const requested = query.get('filter');
    const initial: ReviewFilter = requested === 'incorrect' || requested === 'missed' ? 'missed'
        : requested === 'unanswered' || requested === 'flagged' ? requested : 'all';
    return <ExamPage shell={shell} className="pm-exam-review-page">
        <Head title="Question Review & Detailed Explanation | PM Circle"/>
        <nav className="pm-review-breadcrumb" aria-label="Breadcrumb">
            <Link href="/dashboard/learning">Learn &amp; Practice</Link><span aria-hidden="true">›</span>
            <Link href="/exams/pmp?tab=history">PMP® Exam Simulator</Link><span aria-hidden="true">›</span>
            <span aria-current="page">Question Review</span>
        </nav>
        <PmpExamReviewView questions={questions} responses={responses} total={attempt.total} correct={attempt.correct} initial={initial}
            actions={<Link className="pm-review-outline-button" href="/exams/pmp?tab=history"><ArrowLeft aria-hidden="true" size={15}/>Back to Exam History</Link>}
            renderQuestionFooter={(question, metadata) => <PmpQuestionAiChat key={question.id} attemptId={attempt.id} questionId={question.id} questionMeta={metadata}/>}/>
    </ExamPage>;
}
