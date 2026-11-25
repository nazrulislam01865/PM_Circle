import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, Check, FileText } from 'lucide-react';
import { useRef, useState } from 'react';
import { CourseProgress, CourseWorkspace, CourseWorkspacePanel } from '@/components/learning/CourseWorkspace';
import { courseLearningRoot, courseLessonHref, demoCourseHref, type CourseLesson, type CourseLessonProgress, type DemoCourseDetailData, type CourseResourceData } from '@/types/learning';

type Question = { id: number; prompt: string; options: Record<string, string> };
type Feedback = { correct: boolean; correctOption: string; explanation: string | null };
type Props = { course: Omit<DemoCourseDetailData, 'lessons'>; lesson: CourseLesson; progress: CourseLessonProgress; notes: string; question: Question | null; resources: (CourseResourceData & { isPdf: boolean })[]; canRead: boolean };
const sections = [['lesson-reading', 'Lesson'], ['lesson-overview', 'Overview'], ['lesson-notes', 'My notes'], ['lesson-ai', 'AI assistant'], ['lesson-qa', 'Learner Q&A'], ['lesson-pdfs', 'Download lesson PDFs']] as const;

async function lessonRequest<T>(url: string, body: Record<string, unknown>): Promise<T> {
    const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    const response = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf, 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => null);
    if (response.ok && data) return data as T;
    const retry = Number(response.headers.get('Retry-After'));
    if (response.status === 429) throw new Error(`Too many requests. ${retry > 0 ? `Try again in ${retry} seconds.` : 'Please try again shortly.'}`);
    if (response.status === 401 || response.status === 419) throw new Error('Your session expired. Refresh the page and sign in again if needed.');
    if (response.status === 403) throw new Error('Your enrollment or membership does not currently allow this action.');
    if (response.status === 409) throw new Error('This lesson has changed. Reload the page before continuing.');
    if (response.status === 422) throw new Error(data?.errors ? Object.values(data.errors).flat().join(' ') : 'Check your input and try again.');
    throw new Error('The request could not be completed. Please try again.');
}

function LessonContent({ course, lesson, progress, notes, question, resources }: Props) {
    const root = courseLearningRoot(usePage().url);
    const base = `${demoCourseHref(course.slug)}/lessons/${lesson.position}`;
    const detail = `${root}/courses/${encodeURIComponent(course.slug)}`;
    const [active, setActive] = useState<string>('lesson-reading');
    const [choice, setChoice] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [note, setNote] = useState(notes);
    const [savedNote, setSavedNote] = useState(notes);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [errorAction, setErrorAction] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const lock = useRef(false);
    const [videoFailed, setVideoFailed] = useState(false);
    const [status, setStatus] = useState(progress);
    const currentDone = status.lessons.find(item => item.position === lesson.position)?.completed ?? false;
    const jump = (id: string) => { setActive(id); document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'auto' }); };
    const perform = async <T,>(action: string, data: Record<string, unknown>, success: (data: T) => void) => {
        if (lock.current) return;
        lock.current = true; setBusy(action); setError(''); setErrorAction(action); setMessage('');
        try { const result = await lessonRequest<T>(`${base}/${action}`, { lessonKey: lesson.key, ...data }); success(result); }
        catch (e) { setError(e instanceof TypeError ? 'Connection unavailable. Please try again.' : e instanceof Error ? e.message : 'Network error. Please try again.'); }
        finally { lock.current = false; setBusy(null); }
    };
    const check = () => { if (question && choice) void perform<Feedback>('check', { question: question.id, option: choice }, setFeedback); };
    const saveNotes = () => { const submitted = note; void perform<{ message: string }>('notes', { notes: submitted }, () => { setSavedNote(submitted); setMessage('Notes saved.'); }); };
    const continueTo = (next: CourseLessonProgress) => {
        if (next.completed === next.total) router.visit(`${root}/my-learning`);
        else router.visit(courseLessonHref(root, course.slug, next.next));
    };
    const complete = () => {
        if (note !== savedNote) { setError('Save your notes before continuing.'); setErrorAction('notes'); jump('lesson-notes'); return; }
        if (currentDone) {
            if (status.completed === status.total && lesson.position < status.total) router.visit(courseLessonHref(root, course.slug, lesson.position + 1));
            else continueTo(status);
            return;
        }
        void perform<CourseLessonProgress>('complete', {}, next => { setStatus(next); continueTo(next); });
    };
    const pdfs = resources.filter(resource => resource.isPdf);
    const inlineError = (action: string) => error && errorAction === action ? <p className="pm-course-lesson-error" role="alert">{error}</p> : null;
    const refs = resources.filter(resource => resource.kind === 'link' && resource.section === lesson.title);
    const resourceUrl = (id: number) => `${demoCourseHref(course.slug)}/resources/${id}`;
    const safeVideo = lesson.video_url && /^https:\/\//i.test(lesson.video_url) ? lesson.video_url : null;
    return <CourseWorkspace lesson title={course.title} description={`Lesson ${lesson.position} of ${progress.total}`}><Head title={`${lesson.title} | ${course.title}`}/>
        <div className="pm-course-lesson-grid"><div className="pm-course-workspace-panel pm-course-lesson-main">
            <nav className="pm-course-lesson-tabs" aria-label="Lesson sections">{sections.map(([id, label]) => <button type="button" key={id} className={`pm-guide-button is-outline${active === id ? ' is-active' : ''}`} aria-pressed={active === id} onClick={() => jump(id)}>{label}</button>)}</nav>
            <section id="lesson-reading" className="pm-course-lesson-reading"><div className="pm-course-lesson-meta"><span className="pm-learn-v3-pill is-free">Reading</span><span>· Lesson {lesson.position}</span>{currentDone && <span className="pm-learn-v3-pill is-free"><Check size={14}/> Completed</span>}</div><h2>{lesson.title}</h2>
                {safeVideo && !videoFailed && <video className="pm-course-lesson-video" controls preload="metadata" src={safeVideo} onError={() => setVideoFailed(true)} aria-label={`${lesson.title} video`}/>}
                {videoFailed && <p className="pm-course-lesson-notice" role="status">The video could not be loaded. Continue with the lesson reading below.</p>}
                <p className="pm-course-lesson-copy">{lesson.body}</p>
            </section>
            <CourseWorkspacePanel className="pm-course-lesson-section"><h3 id="lesson-check">Knowledge check</h3>{question ? <><fieldset disabled={busy !== null}><legend>{question.prompt}</legend><div className="pm-course-lesson-options">{Object.entries(question.options).map(([key, text]) => <label key={key}><input type="radio" name="knowledge-check" checked={choice === key} onChange={() => { setChoice(key); setFeedback(null); }}/><span>{text}</span></label>)}</div></fieldset><div className="pm-course-workspace-actions"><button type="button" disabled={!choice || busy !== null} className="pm-guide-button is-outline" onClick={check}>{busy === 'check' ? 'Checking…' : 'Check answer'}</button></div>{inlineError('check')}{feedback && <div className={`pm-course-lesson-feedback ${feedback.correct ? 'is-correct' : 'is-incorrect'}`} role="status"><strong>{feedback.correct ? 'Correct answer' : `Correct option: ${feedback.correctOption}`}</strong>{feedback.explanation && <p>{feedback.explanation}</p>}</div>}</> : <p className="pm-learn-v3-meta">No knowledge check is published for this lesson yet. <Link href={detail}>View course practice and resources</Link>.</p>}</CourseWorkspacePanel>
            <CourseWorkspacePanel className="pm-course-lesson-section"><div id="lesson-overview"><h3>Overview</h3><p>{course.overview || course.summary}</p></div>
                {([['Key takeaway', lesson.takeaway], ['When to apply it', lesson.when_to_apply], ['Example scenario', lesson.example], ['Learning references', lesson.references]] as const).map(([title, content]) => content ? <div key={title}><h4>{title}</h4><p className="pm-course-lesson-copy">{content}</p></div> : null)}
                {refs.length > 0 && <div><h4>Learning references</h4><ul>{refs.map(resource => <li key={resource.id}><a href={resourceUrl(resource.id)} target="_blank" rel="noopener noreferrer">{resource.title}</a></li>)}</ul></div>}
            </CourseWorkspacePanel>
            {lesson.application && <section className="pm-course-lesson-notice"><h3>Apply what you learned</h3><p className="pm-course-lesson-copy">{lesson.application}</p></section>}
            <section className="pm-course-lesson-section pm-course-lesson-divided" id="lesson-notes"><h2>My notes</h2><label className="pm-guide-field-label" htmlFor="course-lesson-notes">Your private lesson notes</label><textarea className="pm-guide-control" id="course-lesson-notes" rows={4} maxLength={10000} value={note} onChange={event => setNote(event.target.value)} disabled={busy !== null}/><div className="pm-course-workspace-actions"><button type="button" className="pm-guide-button is-outline" disabled={note === savedNote || busy !== null} onClick={saveNotes}>{busy === 'notes' ? 'Saving…' : 'Save notes'}</button>{note !== savedNote && <span className="pm-learn-v3-meta">Unsaved changes</span>}</div>{inlineError('notes')}{message && <p role="status">{message}</p>}</section>
            <section className="pm-course-lesson-section pm-course-lesson-divided" id="lesson-ai"><h2>AI lesson assistant</h2><p className="pm-learn-v3-meta">AI lesson assistance is not currently available.</p><label className="pm-guide-field-label" htmlFor="lesson-ai-input">Ask about this topic</label><input className="pm-guide-control" id="lesson-ai-input" placeholder="e.g. Can you explain this with an example?" disabled/><div className="pm-course-workspace-actions"><button type="button" className="pm-guide-button" disabled>Ask AI</button></div></section>
            <section className="pm-course-lesson-section pm-course-lesson-divided" id="lesson-qa"><h2>Learner Q&amp;A</h2><p className="pm-learn-v3-meta">Learner discussions are not currently available for this lesson.</p></section>
            <section className="pm-course-lesson-section pm-course-lesson-divided" id="lesson-pdfs"><h2>Download lesson PDFs</h2>{pdfs.length ? <div className="pm-course-lesson-files">{pdfs.map(resource => <a key={resource.id} href={resourceUrl(resource.id)} className="pm-guide-button is-outline"><FileText size={16}/>{resource.title}</a>)}</div> : <p className="pm-learn-v3-meta">No published PDF resources are available for this course.</p>}</section>
            <div className="pm-course-lesson-status" aria-live="polite">{inlineError('complete')}</div>
            <footer className="pm-course-lesson-footer"><Link className="pm-guide-button is-outline" href={detail}>Course details</Link><button type="button" className="pm-guide-button" disabled={busy !== null} onClick={complete}>{busy === 'complete' ? 'Saving progress…' : currentDone ? status.completed === status.total ? lesson.position < status.total ? 'Review next lesson' : 'Back to My Learning' : 'Continue learning' : 'Complete & continue'}<ArrowRight size={16}/></button></footer>
        </div><aside className="pm-course-lesson-sidebar pm-course-workspace-panel" aria-label="Course content"><h2>Course content</h2><CourseProgress {...status}/><ol className="pm-course-lesson-list">{status.lessons.map(item => <li key={item.position}><Link className={`pm-course-lesson-item${item.position === lesson.position ? ' is-active' : ''}`} href={courseLessonHref(root, course.slug, item.position)} aria-current={item.position === lesson.position ? 'step' : undefined}><strong>{item.title}</strong><span>Lesson {item.position} · {item.completed ? 'Completed' : 'Reading & practice'}</span></Link>{item.position === lesson.position && <ul><li><button type="button" onClick={() => jump('lesson-reading')}>Lesson reading</button></li>{question && <li><button type="button" onClick={() => jump('lesson-check')}>Knowledge check</button></li>}<li><button type="button" onClick={() => jump('lesson-qa')}>Learner Q&amp;A</button></li></ul>}</li>)}</ol></aside></div>
    </CourseWorkspace>;
}
function LockedLesson({ course, lesson, progress }: Props) {
    const root = courseLearningRoot(usePage().url);
    const detail = `${root}/courses/${encodeURIComponent(course.slug)}`;
    return <CourseWorkspace lesson title={course.title} description={`Lesson ${lesson.position} of ${progress.total}`}><Head title={`${lesson.title} | ${course.title}`}/><div className="pm-course-lesson-grid"><CourseWorkspacePanel className="pm-course-lesson-main"><div className="pm-course-lesson-tabs" aria-label="Lesson sections"><span className="pm-learn-v3-pill">Lesson outline</span></div><h2>{lesson.title}</h2><p>Enroll with an eligible membership to access this lesson, track progress and use the learning tools.</p><div className="pm-course-workspace-actions"><Link className="pm-guide-button" href={detail}>View course details</Link></div></CourseWorkspacePanel><aside className="pm-course-workspace-panel" aria-label="Course content"><h2>Course content</h2><ol className="pm-course-lesson-list">{progress.lessons.map(item => <li key={item.position}><Link className={`pm-course-lesson-item${item.position === lesson.position ? ' is-active' : ''}`} href={courseLessonHref(root, course.slug, item.position)} aria-current={item.position === lesson.position ? 'step' : undefined}>{item.title}</Link></li>)}</ol></aside></div></CourseWorkspace>;
}
export default function Lesson(props: Props) { return props.canRead ? <LessonContent key={`${props.course.slug}:${props.lesson.key}`} {...props}/> : <LockedLesson {...props}/>; }
