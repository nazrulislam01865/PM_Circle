import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, Check, FileText } from 'lucide-react';
import { useRef, useState } from 'react';
import { QuestionScenario } from '@/components/learning/QuestionScenario';
import { CourseProgress, CourseWorkspace, CourseWorkspacePanel } from '@/components/learning/CourseWorkspace';
import { courseLearningRoot, courseLessonHref, demoCourseHref, type CourseLesson, type CourseLessonSummary, type CourseLessonProgress, type DemoCourseDetailData, type CourseResourceData } from '@/types/learning';

type Question = { id: number; prompt: string; options: Record<string, string>; scenarioText?: string | null; scenarioVideoUrl?: string | null };
type Feedback = { correct: boolean; correctOption: string; explanation: string | null };
type Props = { course: Omit<DemoCourseDetailData, 'lessons'>; lesson: CourseLesson; progress: CourseLessonProgress; notes: string; question: Question | null; questions?: Question[]; resources: (CourseResourceData & { isPdf: boolean })[]; canRead: boolean };
const sections = [['lesson-reading', 'Lesson'], ['lesson-overview', 'Overview'], ['lesson-notes', 'My notes'], ['lesson-qa', 'Lesson Q&A'], ['lesson-pdfs', 'Lesson documents']] as const;

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

function CourseContentLessonLink({ item, current, href }: { item: CourseLessonSummary; current: boolean; href: string }) {
    return <Link className={`pm-course-lesson-item${item.completed ? ' is-completed' : ''}${current ? ' is-active' : ''}`} href={href} aria-current={current ? 'step' : undefined}>
        <strong className="pm-course-lesson-item-title">{item.completed && <Check className="pm-course-lesson-completed-icon" aria-hidden="true"/>}<span>{item.title}</span></strong>
        <span>Lesson {item.position} · {item.completed ? 'Completed' : item.hasVideo ? 'Video & reading' : 'Reading'}</span>
    </Link>;
}

function LessonContent({ course, lesson, progress, notes, question: legacyQuestion, questions, resources }: Props) {
    const page = usePage<{ auth?: { user?: { settings?: { playback_speed?: string; show_captions?: boolean } } } }>();
    const root = courseLearningRoot(page.url);
    const videoPreferences = page.props.auth?.user?.settings;
    const base = `${demoCourseHref(course.slug)}/lessons/${lesson.position}`;
    const detail = `${root}/courses/${encodeURIComponent(course.slug)}`;
    const [active, setActive] = useState<string>('lesson-reading');
    const knowledgeChecks = questions ?? (legacyQuestion ? [legacyQuestion] : []);
    const [choices, setChoices] = useState<Record<number,string>>({});
    const [feedback, setFeedback] = useState<Record<number,Feedback>>({});
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
    const check = (question: Question) => { const choice = choices[question.id]; if (choice) void perform<Feedback>(`check`, { question: question.id, option: choice }, next => setFeedback(old => ({...old, [question.id]:next}))); };
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
    const documents = resources.filter(resource => resource.kind === 'file');
    const inlineError = (action: string) => error && errorAction === action ? <p className="pm-course-lesson-error" role="alert">{error}</p> : null;
    const refs = resources.filter(resource => resource.kind === 'link');
    const resourceUrl = (id: number) => `${demoCourseHref(course.slug)}/resources/${id}`;
    const safeVideo = lesson.video_url && /^https:\/\//i.test(lesson.video_url) ? lesson.video_url : null;
    return <CourseWorkspace lesson title={course.title} description={`Lesson ${lesson.position} of ${progress.total}`}><Head title={`${lesson.title} | ${course.title}`}/>
        <div className="pm-course-lesson-grid"><div className="pm-course-workspace-panel pm-course-lesson-main">
            <nav className="pm-course-lesson-tabs" aria-label="Lesson sections">{sections.filter(([id]) => id !== 'lesson-qa' || !!lesson.faq?.length).map(([id, label]) => <button type="button" key={id} className={`pm-guide-button is-outline${active === id ? ' is-active' : ''}`} aria-pressed={active === id} onClick={() => jump(id)}>{label}</button>)}</nav>
            <section id="lesson-reading" className="pm-course-lesson-reading"><div className="pm-course-lesson-meta"><span className="pm-learn-v3-pill is-free">{safeVideo ? 'Video & reading' : 'Reading'}</span><span>· Lesson {lesson.position}</span>{currentDone && <span className="pm-learn-v3-pill is-free"><Check size={14}/> Completed</span>}</div><h2>{lesson.title}</h2>
                {safeVideo && !videoFailed && <video className="pm-course-lesson-video" controls preload="metadata" src={safeVideo} onLoadedMetadata={event => {
                    const video = event.currentTarget;
                    const rate = Number.parseFloat(videoPreferences?.playback_speed ?? '1');
                    if ([1, 1.25, 1.5, 2].includes(rate)) video.playbackRate = rate;
                    for (const track of Array.from(video.textTracks)) {
                        if (track.kind === 'captions' || track.kind === 'subtitles') track.mode = videoPreferences?.show_captions === false ? 'disabled' : 'showing';
                    }
                }} onError={() => setVideoFailed(true)} aria-label={`${lesson.title} video`}/>}
                {videoFailed && <p className="pm-course-lesson-notice" role="status">The video could not be loaded. Continue with the lesson reading below.</p>}
                <p className="pm-course-lesson-copy">{lesson.body}</p>
            </section>
            {knowledgeChecks.length > 0 && <CourseWorkspacePanel className="pm-course-lesson-section"><h2 id="lesson-check">Knowledge check</h2>{knowledgeChecks.map((question, index) => <section key={question.id} className="pm-course-lesson-section">{knowledgeChecks.length > 1 && <h3 className="pm-course-lesson-subheading">Question {index+1} of {knowledgeChecks.length}</h3>}<QuestionScenario key={question.id} text={question.scenarioText} videoUrl={question.scenarioVideoUrl}/><fieldset disabled={busy !== null}><legend>{question.prompt}</legend><div className="pm-course-lesson-options">{Object.entries(question.options).map(([key, text]) => <label key={key}><input type="radio" name={`knowledge-check-${question.id}`} checked={choices[question.id] === key} onChange={() => {setChoices(old => ({...old,[question.id]:key})); setFeedback(old => {const next = {...old}; delete next[question.id]; return next;});}}/><span><strong>{key}.</strong> {text}</span></label>)}</div></fieldset><div className="pm-course-workspace-actions"><button type="button" disabled={!choices[question.id] || busy !== null} className="pm-guide-button is-outline" onClick={() => check(question)}>{busy === 'check' ? 'Checking…' : 'Check answer'}</button></div>{feedback[question.id] && <div className={`pm-course-lesson-feedback ${feedback[question.id].correct ? 'is-correct' : 'is-incorrect'}`} role="status"><strong>{feedback[question.id].correct ? 'Correct answer' : `Correct option: ${feedback[question.id].correctOption}`}</strong>{feedback[question.id].explanation && <p>{feedback[question.id].explanation}</p>}</div>}</section>)}{inlineError('check')}</CourseWorkspacePanel>}
            <CourseWorkspacePanel className="pm-course-lesson-section"><div id="lesson-overview" className="pm-course-lesson-detail-block"><h2>Overview</h2><p>{course.overview || course.summary}</p></div>
                {([['Key takeaway', lesson.takeaway], ['When to apply it', lesson.when_to_apply], ['Example scenario', lesson.example], ['Learning references', lesson.references]] as const).map(([title, content]) => content ? <div key={title} className="pm-course-lesson-detail-block"><h3 className="pm-course-lesson-subheading">{title}</h3><p className="pm-course-lesson-copy">{content}</p></div> : null)}
                {refs.length > 0 && <div className="pm-course-lesson-detail-block"><h3 className="pm-course-lesson-subheading">Learning references</h3><ul>{refs.map(resource => <li key={resource.id}><a href={resourceUrl(resource.id)} target="_blank" rel="noopener noreferrer">{resource.title}</a></li>)}</ul></div>}
            </CourseWorkspacePanel>
            {lesson.application && <section className="pm-course-lesson-notice"><h2>Apply what you learned</h2><p className="pm-course-lesson-copy">{lesson.application}</p></section>}
            <section className="pm-course-lesson-section pm-course-lesson-divided" id="lesson-notes"><h2>My notes</h2><label className="pm-guide-field-label" htmlFor="course-lesson-notes">Your private lesson notes</label><textarea className="pm-guide-control" id="course-lesson-notes" rows={4} maxLength={10000} value={note} onChange={event => setNote(event.target.value)} disabled={busy !== null}/><div className="pm-course-workspace-actions"><button type="button" className="pm-guide-button is-outline" disabled={note === savedNote || busy !== null} onClick={saveNotes}>{busy === 'notes' ? 'Saving…' : 'Save notes'}</button>{note !== savedNote && <span className="pm-learn-v3-meta">Unsaved changes</span>}</div>{inlineError('notes')}{message && <p role="status">{message}</p>}</section>
            {!!lesson.faq?.length && <section className="pm-course-lesson-section pm-course-lesson-divided" id="lesson-qa"><h2>Lesson Q&amp;A</h2>{lesson.faq.map((pair,index) => <CourseWorkspacePanel key={index}><details><summary>{pair.question}</summary><p className="pm-course-lesson-copy">{pair.answer}</p></details></CourseWorkspacePanel>)}</section>}
            <section className="pm-course-lesson-section pm-course-lesson-divided" id="lesson-pdfs"><h2>Lesson documents</h2>{documents.length ? <div className="pm-course-lesson-files">{documents.map(resource => <a key={resource.id} href={resourceUrl(resource.id)} className="pm-guide-button is-outline"><FileText size={16}/>{resource.title}</a>)}</div> : <p className="pm-course-lesson-empty-copy">No documents are published for this lesson.</p>}</section>
            <div className="pm-course-lesson-status" aria-live="polite">{inlineError('complete')}</div>
            <footer className="pm-course-lesson-footer"><Link className="pm-guide-button is-outline" href={detail}>Course details</Link><button type="button" className="pm-guide-button" disabled={busy !== null} onClick={complete}>{busy === 'complete' ? 'Saving progress…' : currentDone ? status.completed === status.total ? lesson.position < status.total ? 'Review next lesson' : 'Back to My Learning' : 'Continue learning' : 'Complete & continue'}<ArrowRight size={16}/></button></footer>
        </div><aside className="pm-course-lesson-sidebar pm-course-workspace-panel" aria-label="Course content">
            <h2>Course content</h2>
            <CourseProgress {...status}/>
            <ol className="pm-course-lesson-list">
                {status.lessons.map(item => <li key={item.position}>
                    <CourseContentLessonLink item={item} current={item.position === lesson.position} href={courseLessonHref(root, course.slug, item.position)}/>
                    {item.position === lesson.position && <ul className="pm-course-lesson-topics">
                        <li><button type="button" onClick={() => jump('lesson-reading')}>Lesson reading</button></li>
                        {knowledgeChecks.length > 0 && <li><button type="button" onClick={() => jump('lesson-check')}>Knowledge check</button></li>}
                        {!!lesson.faq?.length && <li><button type="button" onClick={() => jump('lesson-qa')}>Learner Q&amp;A</button></li>}
                    </ul>}
                </li>)}
            </ol>
        </aside></div>
    </CourseWorkspace>;
}
function LockedLesson({ course, lesson, progress }: Props) {
    const root = courseLearningRoot(usePage().url);
    const detail = `${root}/courses/${encodeURIComponent(course.slug)}`;
    return <CourseWorkspace lesson title={course.title} description={`Lesson ${lesson.position} of ${progress.total}`}><Head title={`${lesson.title} | ${course.title}`}/><div className="pm-course-lesson-grid"><CourseWorkspacePanel className="pm-course-lesson-main"><div className="pm-course-lesson-tabs" aria-label="Lesson sections"><span className="pm-learn-v3-pill">Lesson outline</span></div><h2>{lesson.title}</h2><p>Enroll with an eligible membership to access this lesson, track progress and use the learning tools.</p><div className="pm-course-workspace-actions"><Link className="pm-guide-button" href={detail}>View course details</Link></div></CourseWorkspacePanel><aside className="pm-course-lesson-sidebar pm-course-workspace-panel" aria-label="Course content"><h2>Course content</h2><ol className="pm-course-lesson-list">{progress.lessons.map(item => <li key={item.position}><CourseContentLessonLink item={item} current={item.position === lesson.position} href={courseLessonHref(root, course.slug, item.position)}/></li>)}</ol></aside></div></CourseWorkspace>;
}
export default function Lesson(props: Props) { return props.canRead ? <LessonContent key={`${props.course.slug}:${props.lesson.key}`} {...props}/> : <LockedLesson {...props}/>; }
