import { QuestionScenario } from '@/components/learning/QuestionScenario';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

type Question = { id: number; kind: string; section: string; topic: string; prompt: string; scenarioText?: string | null; scenarioVideoUrl?: string | null; options: Record<string, string>; correct: string; explanation: string | null };
type Props = { course: { title: string; slug: string }; attempt: { id: number; status: string; score: number; total: number; answers: Record<string, string>; questions: Question[] } };

export default function CoursePracticeResult({ course, attempt }: Props) {
    const expired = attempt.status === 'expired';
    const percentage = attempt.total ? Math.round(attempt.score / attempt.total * 100) : 0;
    return <PublicLayout siteLayout={false} active="/learning">
        <Head title={`Practice result | ${course.title}`}/>
        <div className="pm-container pm-course-quiz pm-course-quiz-results">
            <Link href={`/learning/courses/${encodeURIComponent(course.slug)}`} className="pm-course-quiz-back"><ArrowLeft size={17}/> Back to course</Link>
            <section className="pm-system-card pm-course-quiz-result-hero"><div><span>{expired ? 'Time ended' : 'Practice completed'}</span><h1>{course.title}</h1><p>{attempt.score} of {attempt.total} answers correct{expired ? ' from answers saved before time ended' : ''}</p></div><strong>{percentage}%</strong></section>
            <section className="pm-course-quiz-review"><h2>Question review</h2>{attempt.questions.map((question, index) => {
                const selected = attempt.answers[String(question.id)] ?? null;
                const correct = selected === question.correct;
                return <article key={question.id} className="pm-system-card pm-course-quiz-review-card"><div className="pm-course-quiz-question-meta"><strong>Question {index + 1}</strong><span>{question.section} · {question.topic}</span></div><QuestionScenario key={question.id} text={question.scenarioText} videoUrl={question.scenarioVideoUrl}/><h3>{question.prompt}</h3><p className={`pm-course-quiz-verdict ${correct ? 'is-correct' : ''}`}>{correct ? <CheckCircle2 size={18}/> : <XCircle size={18}/>} {correct ? 'Correct' : selected ? 'Incorrect' : 'Not answered'}</p><div className="pm-course-quiz-review-options">{Object.entries(question.options).map(([key, option]) => <div key={key} className={`${key === question.correct ? 'is-correct' : ''} ${selected === key && !correct ? 'is-wrong' : ''}`}><strong>{key}.</strong> {option}{key === question.correct && <span> Correct answer</span>}{selected === key && key !== question.correct && <span> Your choice</span>}</div>)}</div>{question.explanation && <div className="pm-course-quiz-explanation"><strong>Explanation</strong><p>{question.explanation}</p></div>}</article>;
            })}</section>
        </div>
    </PublicLayout>;
}
