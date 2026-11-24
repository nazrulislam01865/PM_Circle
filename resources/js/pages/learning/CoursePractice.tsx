import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Clock3, Flag, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

type Question = { id: number; kind: string; section: string; topic: string; prompt: string; options: Record<string, string> };
type Props = { course: { title: string; slug: string }; attempt: { id: number; expiresAt: string; serverNow: string; answers: Record<string, string>; questions: Question[] } };
const timeLabel = (remaining: number) => `${String(Math.floor(remaining / 3600)).padStart(2, '0')}:${String(Math.floor((remaining % 3600) / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

export default function CoursePractice({ course, attempt }: Props) {
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState(attempt.answers);
    const [flagged, setFlagged] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);
    const [savingError, setSavingError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [confirmSubmit, setConfirmSubmit] = useState(false);
    const serverOffset = useMemo(() => Date.parse(attempt.serverNow) - Date.now(), [attempt.serverNow]);
    const remainingNow = () => Math.max(0, Math.ceil((Date.parse(attempt.expiresAt) - Date.now() - serverOffset) / 1000));
    const [seconds, setSeconds] = useState(remainingNow);
    const pending = useRef<Promise<boolean> | null>(null);
    const submitted = useRef(false);
    const base = `/learning/courses/${encodeURIComponent(course.slug)}/practice/${attempt.id}`;
    const question = attempt.questions[index];
    const answered = Object.keys(answers).length;
    const sendSubmit = async () => {
        if (submitted.current) return;
        submitted.current = true;
        setSubmitting(true);
        if (pending.current) await pending.current;
        router.post(`${base}/submit`, {}, { onError: () => { submitted.current = false; setSavingError('Could not submit the practice. Please retry.'); }, onFinish: () => setSubmitting(false) });
    };
    const submitRef = useRef(sendSubmit);
    submitRef.current = sendSubmit;
    useEffect(() => {
        const timer = window.setInterval(() => {
            const left = Math.max(0, Math.ceil((Date.parse(attempt.expiresAt) - Date.now() - serverOffset) / 1000));
            setSeconds(left);
            if (left <= 0) { window.clearInterval(timer); void submitRef.current(); }
        }, 1000);
        return () => window.clearInterval(timer);
    }, [attempt.expiresAt, serverOffset]);
    const choose = async (value: string) => {
        if (saving || submitting || seconds <= 0) return;
        const key = String(question.id);
        const old = answers[key];
        setAnswers(previous => ({ ...previous, [key]: value }));
        setSavingError(''); setSaving(true);
        const promise = (async () => {
            try {
                const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
                const response = await fetch(`${base}/answer`, {
                    method: 'PUT', credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrf },
                    body: JSON.stringify({ question_id: question.id, option: value }),
                });
                if (!response.ok) throw Error('Could not save your answer.');
                return true;
            } catch {
                setAnswers(previous => { const next = { ...previous }; if (old) next[key] = old; else delete next[key]; return next; });
                setSavingError('Answer was not saved. Please try again.');
                return false;
            } finally { setSaving(false); }
        })();
        pending.current = promise;
        await promise;
        if (pending.current === promise) pending.current = null;
    };
    return <PublicLayout siteLayout={false} active="/learning">
        <Head title={`Practice | ${course.title}`}/>
        <div className="pm-container pm-course-quiz">
            <div className="pm-course-quiz-head"><Link href={`/learning/courses/${encodeURIComponent(course.slug)}`}><ArrowLeft size={17}/> Course details</Link><div><h1>{course.title}</h1><p>Curriculum practice exam</p></div><div className="pm-course-quiz-timer" aria-live="off"><Clock3 size={19}/><strong>{timeLabel(seconds)}</strong></div></div>
            <div className="pm-course-quiz-progress" role="progressbar" aria-label="Answered questions" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={attempt.questions.length}><span style={{ width: `${answered / attempt.questions.length * 100}%` }}/></div>
            <div className="pm-course-quiz-layout"><section className="pm-system-card pm-course-quiz-question">
                <div className="pm-course-quiz-question-meta"><strong>Question {index + 1} of {attempt.questions.length}</strong><span>{question.kind === 'scenario' ? 'Scenario-based' : 'Multiple choice'}</span><span>{question.section} · {question.topic}</span></div>
                <h2>{question.prompt}</h2>
                <fieldset disabled={saving || submitting || seconds <= 0}><legend className="pm-course-quiz-sr">Choose one answer</legend><div className="pm-course-quiz-options">{Object.entries(question.options).map(([letter, label]) => <label key={letter} className={`pm-course-quiz-option ${answers[String(question.id)] === letter ? 'is-selected' : ''}`}><input type="radio" name={`practice-question-${question.id}`} checked={answers[String(question.id)] === letter} onChange={() => { void choose(letter); }}/><strong>{letter}.</strong><span>{label}</span></label>)}</div></fieldset>
                {savingError && <p className="pm-course-quiz-error" role="alert">{savingError}</p>}
                <div className="pm-course-quiz-actions"><button type="button" className="pm-course-quiz-quiet" aria-pressed={flagged.includes(question.id)} onClick={() => setFlagged(old => old.includes(question.id) ? old.filter(id => id !== question.id) : [...old, question.id])}><Flag size={17}/>{flagged.includes(question.id) ? 'Unmark' : 'Mark for review'}</button><div><button type="button" className="pm-course-quiz-quiet" disabled={index === 0} onClick={() => setIndex(old => old - 1)}><ArrowLeft size={17}/> Previous</button><button type="button" className="pm-system-button" disabled={index >= attempt.questions.length - 1} onClick={() => setIndex(old => old + 1)}>Next <ArrowRight size={17}/></button></div></div>
            </section><aside className="pm-system-card pm-course-quiz-navigator"><h2>Question navigator</h2><p>{answered} answered · {attempt.questions.length - answered} remaining · {flagged.length} marked</p><div className="pm-course-quiz-numbers">{attempt.questions.map((item, position) => <button key={item.id} type="button" aria-label={`Question ${position + 1}`} aria-current={position === index ? 'step' : undefined} className={`${position === index ? 'is-current ' : ''}${answers[String(item.id)] ? 'is-answered ' : ''}${flagged.includes(item.id) ? 'is-marked' : ''}`} onClick={() => setIndex(position)}>{position + 1}</button>)}</div><button className="pm-system-button pm-course-quiz-finish" type="button" onClick={() => setConfirmSubmit(true)}><Send size={17}/> Finish & review</button></aside></div>
            <Dialog open={confirmSubmit} onOpenChange={open => { if (!open && !submitting) setConfirmSubmit(false); }}><DialogContent className="pm-course-quiz-dialog pm-system-card" showCloseButton={false} onPointerDownOutside={event => event.preventDefault()}><DialogTitle>Finish practice?</DialogTitle><DialogDescription>{answered} of {attempt.questions.length} questions answered. Unanswered questions will count as incorrect. Your answers cannot be changed after submission.</DialogDescription><div><button type="button" className="pm-course-quiz-quiet" onClick={() => setConfirmSubmit(false)}>Continue practice</button><button type="button" className="pm-system-button" disabled={submitting} onClick={() => { void sendSubmit(); }}>{submitting ? 'Submitting…' : 'Submit practice'}</button></div></DialogContent></Dialog>
        </div>
    </PublicLayout>;
}
