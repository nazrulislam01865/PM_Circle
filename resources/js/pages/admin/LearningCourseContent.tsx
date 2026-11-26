import { LinkedPagination } from '@/components/pm/Pagination';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, BookOpen, CheckCircle2, Download, FileText, Plus, Save, Search, UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { AdminChoice } from '@/components/admin/AdminChoice';

type Section = { title: string; topics: string[] };
type Course = { id: number; slug: string; title: string; outline: Section[]; lessons: {uid?: string; title: string; section_title?: string; topic_title?: string}[]; practiceEnabled: boolean; practiceQuestionCount: number; practiceDurationMinutes: number };
type Question = { id: number; lesson_uid: string | null; scenario_text: string | null; scenario_video_url: string | null; code: string; section_title: string; topic_title: string; kind: 'question' | 'scenario'; difficulty: 'Easy' | 'Moderate' | 'Hard'; prompt: string; options: Record<'A' | 'B' | 'C' | 'D', string>; correct_option: 'A' | 'B' | 'C' | 'D'; explanation: string | null; is_published: boolean };
type Resource = { id: number; title: string; section_title: string; lesson_uid: string | null; description: string | null; kind: 'file' | 'link'; url: string | null; original_name: string | null; is_published: boolean };
type Page<T> = { data: T[]; links: { url: string | null; label: string; active: boolean }[]; total: number; from: number | null; to: number | null };
type DropdownOption = { value: string; label: string };
type Dropdowns = Record<string, DropdownOption[]>;
type Props = { initialTab?: 'questions' | 'resources'; initialLesson?: string | null; dropdowns: Dropdowns; course: Course; questions: Page<Question>; resources: Page<Resource>; stats: { total: number; published: number }; filters: { search: string; section: string; type: string } };
type QuestionInput = Omit<Question, 'id' | 'correct_option'> & { correct_option: Question['correct_option'] | '' };
const initialQuestion = (course: Course): QuestionInput => ({
    code: '', lesson_uid: null, scenario_text: '', scenario_video_url: '', section_title: course.outline[0]?.title ?? '', topic_title: course.outline[0]?.topics[0] ?? '',
    kind: 'scenario', difficulty: 'Moderate', prompt: '', options: { A: '', B: '', C: '', D: '' },
    correct_option: '', explanation: '', is_published: false,
});
const letters = ['A', 'B', 'C', 'D'] as const;
function questionDefaults(course: Course, dropdowns: Dropdowns): QuestionInput {
    const preferred = (group: string, value: string) => {
        const options = dropdowns[group] ?? [];
        return options.some(option => option.value === value) ? value : (options[0]?.value ?? '');
    };
    return {
        ...initialQuestion(course),
        kind: preferred('course_question_kind', 'scenario') as QuestionInput['kind'],
        difficulty: preferred('course_question_difficulty', 'Moderate') as QuestionInput['difficulty'],
    };
} 

export default function LearningCourseContent({ course, questions, resources, stats, filters, dropdowns, initialTab = 'questions', initialLesson }: Props) {
    const [tab, setTab] = useState<'questions' | 'resources'>(initialTab);
    const selectedLesson = course.lessons.find(lesson => lesson.uid && lesson.uid === initialLesson);
    const scopedQuestionDefaults = (): QuestionInput => ({ ...questionDefaults(course, dropdowns), ...(selectedLesson?.section_title && selectedLesson.topic_title ? { lesson_uid: selectedLesson.uid ?? null, section_title: selectedLesson.section_title, topic_title: selectedLesson.topic_title } : {}) });
    const [resourceFormOpen, setResourceFormOpen] = useState(initialTab === 'resources' && !!selectedLesson);
    useEffect(() => { if (resourceFormOpen) document.getElementById('course-resource-editor')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [resourceFormOpen]);
    const [search, setSearch] = useState(filters.search);
    const [filterSection, setFilterSection] = useState(filters.section);
    const [filterType, setFilterType] = useState(filters.type);
    const [practice, setPractice] = useState({ practice_enabled: course.practiceEnabled, practice_question_count: course.practiceQuestionCount, practice_duration_minutes: course.practiceDurationMinutes });
    const [savingSettings, setSavingSettings] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [questionFormOpen, setQuestionFormOpen] = useState(initialTab === 'questions' && !!selectedLesson);
    const [questionInput, setQuestionInput] = useState<QuestionInput>(scopedQuestionDefaults);
    const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});
    const [questionBusy, setQuestionBusy] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [publishAll, setPublishAll] = useState(false);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const resourceFileRef = useRef<HTMLInputElement>(null);
    const [resourceInput, setResourceInput] = useState({ title: '', section_title: selectedLesson?.section_title || course.outline[0]?.title || '', lesson_uid: selectedLesson?.uid ?? '', description: '', kind: (dropdowns.course_resource_kind?.[0]?.value ?? '') as 'file' | 'link', url: '', is_published: false });
    const [resourceFile, setResourceFile] = useState<File | null>(null);
    const [editingResourceId, setEditingResourceId] = useState<number | null>(null);
    const [resourceErrors, setResourceErrors] = useState<Record<string, string>>({});
    const [resourceBusy, setResourceBusy] = useState(false);
    const [resourceProgress, setResourceProgress] = useState<number | null>(null);
    const [switching, setSwitching] = useState<number | null>(null);
    const { flash, errors: pageErrors } = usePage<{ flash?: { status?: string }; errors?: Record<string,string> }>().props;
    const base = `/admin/learning/courses/${course.id}`;
    useEffect(() => setPractice({ practice_enabled: course.practiceEnabled, practice_question_count: course.practiceQuestionCount, practice_duration_minutes: course.practiceDurationMinutes }), [course.practiceEnabled, course.practiceQuestionCount, course.practiceDurationMinutes]);
    const choices = (group: string, selected?: string): DropdownOption[] => {
        const options = dropdowns[group] ?? [];
        return selected && !options.some(option => option.value === selected)
            ? [...options, { value: selected, label: `${selected} (inactive)` }]
            : options;
    };
    const sections = course.outline.map(section => ({ value: section.title, label: section.title }));
    const topics = course.outline.find(section => section.title === questionInput.section_title)?.topics ?? [];
    const fieldError = (key: string) => questionErrors[key] && <small className="pm-admin-error" role="alert">{questionErrors[key]}</small>;
    const resetQuestion = () => { setEditingId(null); setQuestionInput(scopedQuestionDefaults()); setQuestionErrors({}); setQuestionFormOpen(false); };
    const editQuestion = (question: Question) => { setEditingId(question.id); setQuestionInput({ code: question.code, lesson_uid: question.lesson_uid, scenario_text: question.scenario_text ?? '', scenario_video_url: question.scenario_video_url ?? '', section_title: question.section_title, topic_title: question.topic_title, kind: question.kind, difficulty: question.difficulty, prompt: question.prompt, options: question.options, correct_option: question.correct_option, explanation: question.explanation ?? '', is_published: question.is_published }); setQuestionFormOpen(true); setQuestionErrors({}); document.getElementById('course-question-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); if (questionBusy) return; setQuestionBusy(true); setQuestionErrors({});
        const callbacks = { preserveScroll: true, onError: (errors: Record<string, string>) => setQuestionErrors(errors), onSuccess: () => resetQuestion(), onFinish: () => setQuestionBusy(false) };
        if (editingId) router.put(`${base}/questions/${editingId}`, { ...questionInput }, callbacks);
        else router.post(`${base}/questions`, { ...questionInput }, callbacks);
    };
    const submitImport = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); if (!importFile || importing) return;
        setImporting(true); setProgress(0);
        router.post(`${base}/questions/import`, { file: importFile, publish_all: publishAll, lesson_uid: initialLesson || null }, {
            forceFormData: true, preserveScroll: true,
            onProgress: next => setProgress(next?.percentage ?? 0),
            onSuccess: () => { setImportFile(null); setProgress(null); if (inputRef.current) inputRef.current.value = ''; },
            onFinish: () => setImporting(false),
        });
    };
    const updateQuestionStatus = (question: Question) => {
        setSwitching(question.id); router.patch(`${base}/questions/${question.id}/status`, {}, { preserveScroll: true, onFinish: () => setSwitching(null) });
    };
    const updateResourceStatus = (resource: Resource) => {
        setSwitching(resource.id); router.patch(`${base}/resources/${resource.id}/status`, {}, { preserveScroll: true, onFinish: () => setSwitching(null) });
    };
    const savePractice = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSavingSettings(true); router.put(`${base}/practice-settings`, { ...practice }, { preserveScroll: true, onFinish: () => setSavingSettings(false) }); };
    const editResource = (resource: Resource) => {
        setEditingResourceId(resource.id);
        setResourceFormOpen(true);
        setResourceInput({ title: resource.title, section_title: resource.section_title, lesson_uid: resource.lesson_uid ?? '', description: resource.description ?? '', kind: resource.kind, url: resource.url ?? '', is_published: resource.is_published });
        setResourceFile(null); if (resourceFileRef.current) resourceFileRef.current.value = ''; setResourceErrors({});
        document.getElementById('course-resource-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const cancelResource = () => { setResourceFormOpen(false); setEditingResourceId(null); setResourceFile(null); if (resourceFileRef.current) resourceFileRef.current.value = ''; setResourceErrors({}); setResourceInput({ title: '', section_title: selectedLesson?.section_title || course.outline[0]?.title || '', lesson_uid: selectedLesson?.uid ?? '', description: '', kind: (dropdowns.course_resource_kind?.[0]?.value ?? '') as 'file' | 'link', url: '', is_published: false }); };
    const saveResource = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); if (resourceBusy) return; setResourceBusy(true); setResourceErrors({}); setResourceProgress(null);
        router.post(editingResourceId ? `${base}/resources/${editingResourceId}` : `${base}/resources`, {
            ...resourceInput, file: resourceInput.kind === 'file' ? resourceFile : undefined,
            ...(editingResourceId ? { _method: 'PUT' } : {}),
        }, {
            forceFormData: true, preserveScroll: true,
            onError: errors => setResourceErrors(errors),
            onProgress: next => setResourceProgress(next?.percentage ?? null),
            onSuccess: () => cancelResource(),
            onFinish: () => { setResourceBusy(false); setResourceProgress(null); },
        });
    };
    const applyFilters = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); router.get(`${base}/content`, { search, section: filterSection, type: filterType, ...(initialLesson ? {lesson: initialLesson} : {}) }, { preserveState: true }); };

    return <AdminLayout active="/admin/learning/courses" title="Course content" subtitle={course.title}>
        <Head title={`Course content | ${course.title}`} />
        <div className="pm-course-admin-heading pm-course-content-top">
            <Link href="/admin/learning/courses" className="pm-admin-button"><ArrowLeft size={16}/> Course library</Link>
            <Link href={`${base}/edit`} className="pm-admin-button">Edit course & lessons</Link><Link href={`${base}/reviews`} className="pm-admin-button">Moderate reviews</Link>
            <Link href={`/learning/courses/${encodeURIComponent(course.slug)}`} className="pm-admin-button">View course</Link>
        </div>
        {flash?.status && <p role="status" className="pm-admin-notice pm-admin-notice-success"><CheckCircle2 size={17}/>{flash.status}</p>}
        <div className="pm-course-content-tabs" role="tablist" aria-label="Course content management">
            <button type="button" role="tab" aria-selected={tab === 'questions'} className={tab === 'questions' ? 'is-active' : ''} onClick={() => { if (initialLesson) router.get(`${base}/content`, {tab:'questions', lesson:initialLesson}, {preserveState:false}); else setTab('questions'); }}>Questions & practice</button>
            <button type="button" role="tab" aria-selected={tab === 'resources'} className={tab === 'resources' ? 'is-active' : ''} onClick={() => { if (initialLesson) router.get(`${base}/content`, {tab:'resources', lesson:initialLesson}, {preserveState:false}); else setTab('resources'); }}>Resources ({resources.total})</button>
        </div>
        {tab === 'questions' ? <div className="pm-course-content-stack">
            {!selectedLesson && <section className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-heading"><div><h2>Practice exam settings</h2><p>Applies to new attempts; existing attempts keep their original questions and timer.</p></div><span className="pm-course-admin-status is-published">{stats.published} published / {stats.total} questions</span></div>
                <form onSubmit={savePractice} className="pm-course-content-settings">
                    <div className="pm-course-content-settings-fields">
                        <label className="pm-admin-field"><span>Questions per attempt</span><input type="number" min={1} max={100} required value={practice.practice_question_count} onChange={e => setPractice(old => ({ ...old, practice_question_count: Number(e.target.value) }))}/></label>
                        <label className="pm-admin-field"><span>Duration (minutes)</span><input type="number" min={1} max={240} required value={practice.practice_duration_minutes} onChange={e => setPractice(old => ({ ...old, practice_duration_minutes: Number(e.target.value) }))}/></label>
                    </div>
                    <div className="pm-course-content-actions">
                        <label className="pm-course-admin-publish"><input type="checkbox" checked={practice.practice_enabled} onChange={e => setPractice(old => ({ ...old, practice_enabled: e.target.checked }))}/><span><strong>Enable course practice</strong><small>Published questions only</small></span></label>
                        <button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={savingSettings}><Save size={16}/>{savingSettings ? 'Saving…' : 'Save settings'}</button>
                    </div>
                </form>
            </section>}
            <section className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-heading"><div><h2>Import questions</h2><p>{selectedLesson ? `All imported questions will be assigned to ${selectedLesson.title}. Section and topic may be blank or match this lesson.` : 'Choose a lesson below to import lesson-specific questions, or import shared course practice questions.'}</p></div><div className="pm-course-admin-row-actions"><a href="/admin/learning/courses/questions/template" className="pm-admin-button"><Download size={16}/> Excel template</a><a href="/admin/learning/courses/questions/lesson-template" className="pm-admin-button"><Download size={16}/> Scenario CSV template</a></div></div>
                <AdminChoice id="question-filter-lesson" label="Question assignment / import target" value={initialLesson || 'all'} options={[{value:'all',label:'All course questions / shared topic import'}, ...course.lessons.filter(lesson => lesson.uid && lesson.section_title && lesson.topic_title).map(lesson => ({value:lesson.uid!,label:lesson.title}))]} onChange={value => router.get(`${base}/content`, {tab:'questions', ...(value === 'all' ? {} : {lesson:value})}, {preserveState:false})}/>
                <form className="pm-course-content-import" onSubmit={submitImport}>
                    <div className="pm-admin-field"><span>Excel or CSV file</span><label className="pm-admin-file-picker"><UploadCloud size={17}/><span>{importFile ? importFile.name : 'Choose question file'}</span><input ref={inputRef} type="file" accept=".xlsx,.csv" aria-label="Choose question file" onChange={e => setImportFile(e.target.files?.[0] ?? null)}/></label></div>
                    <div className="pm-course-content-actions">
                        <label className="pm-course-admin-publish"><input type="checkbox" checked={publishAll} onChange={e => setPublishAll(e.target.checked)}/><span><strong>Publish imported questions immediately</strong></span></label>
                        <button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={!importFile || importing}><UploadCloud size={16}/>{importing ? 'Importing…' : 'Import questions'}</button>
                    </div>
                </form>
                {(pageErrors?.file || pageErrors?.lesson_uid) && <p className="pm-admin-error" role="alert">{pageErrors.file || pageErrors.lesson_uid}</p>}
                {importing && <div className="pm-course-content-upload" aria-live="polite"><div className="pm-course-content-track" role="progressbar" aria-valuenow={progress ?? 0} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress ?? 0}%` }}/></div><small>{progress === 100 ? 'Upload complete · Validating and saving…' : `Uploading ${progress ?? 0}%`}</small></div>}
            </section>
            <section className="pm-admin-panel pm-course-admin-section" id="course-question-editor">
                <div className="pm-course-admin-heading"><div><h2>{selectedLesson ? `Knowledge checks · ${selectedLesson.title}` : 'Question bank'}</h2><p>Standard and scenario questions are graded from an administrator-set answer key.</p></div><button type="button" className="pm-admin-button pm-admin-button-primary" onClick={() => { if (questionFormOpen && editingId === null) resetQuestion(); else { setEditingId(null); setQuestionInput(scopedQuestionDefaults()); setQuestionErrors({}); setQuestionFormOpen(true); } }}><Plus size={16}/>{questionFormOpen && !editingId ? 'Close form' : 'Add question'}</button></div>
                {questionFormOpen && <form className="pm-course-content-question-form" onSubmit={submitQuestion} noValidate>
                    <div className="pm-course-content-form-grid">
                        <label className="pm-admin-field"><span>Question ID</span><input required maxLength={70} value={questionInput.code} onChange={e => setQuestionInput(old => ({ ...old, code: e.target.value }))}/>{fieldError('code')}</label>
                        <AdminChoice id="question-kind" label="Question type" required value={questionInput.kind} options={choices('course_question_kind', questionInput.kind)} onChange={next => setQuestionInput(old => ({ ...old, kind: next as QuestionInput['kind'] }))} error={questionErrors.kind}/>
                        <AdminChoice id="question-lesson" label="Lesson assignment" value={questionInput.lesson_uid || 'shared'} options={[{value:'shared',label:'Shared curriculum topic'}, ...course.lessons.filter(lesson => lesson.uid && lesson.section_title && lesson.topic_title).map(lesson => ({value:lesson.uid!,label:lesson.title}))]} onChange={next => { const target = course.lessons.find(item => item.uid === next); setQuestionInput(old => ({...old, lesson_uid:target?.uid ?? null, ...(target ? {section_title:target.section_title!, topic_title:target.topic_title!} : {})})); }} error={questionErrors.lesson_uid}/>
                        <AdminChoice id="question-section" disabled={!!questionInput.lesson_uid} label="Curriculum section" required placeholder="Choose section" value={questionInput.section_title} options={sections} onChange={next => { const section = course.outline.find(item => item.title === next); setQuestionInput(old => ({ ...old, section_title: next, topic_title: section?.topics[0] ?? '' })); }} error={questionErrors.section_title}/>
                        <AdminChoice id="question-topic" disabled={!!questionInput.lesson_uid} label="Curriculum topic" required placeholder="Choose topic" value={questionInput.topic_title} options={topics.map(topic => ({ value: topic, label: topic }))} onChange={next => setQuestionInput(old => ({ ...old, topic_title: next }))} error={questionErrors.topic_title}/>
                        <AdminChoice id="question-difficulty" label="Difficulty" required value={questionInput.difficulty} options={choices('course_question_difficulty', questionInput.difficulty)} onChange={next => setQuestionInput(old => ({ ...old, difficulty: next as QuestionInput['difficulty'] }))} error={questionErrors.difficulty}/>
                        <label className="pm-admin-field pm-course-admin-wide"><span>Scenario text (optional)</span><textarea rows={4} maxLength={10000} value={questionInput.scenario_text ?? ''} onChange={e => setQuestionInput(old => ({...old, scenario_text:e.target.value}))}/>{fieldError('scenario_text')}</label>
                        <label className="pm-admin-field pm-course-admin-wide"><span>Scenario video (optional direct HTTPS video URL)</span><input type="url" maxLength={2000} value={questionInput.scenario_video_url ?? ''} onChange={e => setQuestionInput(old => ({...old, scenario_video_url:e.target.value}))}/>{fieldError('scenario_video_url')}</label>
                        <label className="pm-admin-field pm-course-admin-wide"><span>Question text</span><textarea required rows={4} value={questionInput.prompt} onChange={e => setQuestionInput(old => ({ ...old, prompt: e.target.value }))}/>{fieldError('prompt')}</label>
                        {letters.map(letter => <label key={letter} className="pm-admin-field"><span>Option {letter}</span><input required value={questionInput.options[letter]} onChange={e => setQuestionInput(old => ({ ...old, options: { ...old.options, [letter]: e.target.value } }))}/>{fieldError(`options.${letter}`)}</label>)}
                        <AdminChoice id="question-correct-answer" label="Correct answer" required placeholder="Choose the correct option" error={questionErrors.correct_option} value={questionInput.correct_option} options={letters.map(letter => ({ value: letter, label: `Option ${letter}` }))} onChange={next => setQuestionInput(old => ({ ...old, correct_option: next as QuestionInput['correct_option'] }))}/>
                        <label className="pm-admin-field pm-course-admin-wide"><span>Answer explanation</span><textarea rows={3} value={questionInput.explanation ?? ''} onChange={e => setQuestionInput(old => ({ ...old, explanation: e.target.value }))}/></label>
                    </div>
                    <div className="pm-course-content-form-actions"><label className="pm-course-admin-publish"><input type="checkbox" checked={questionInput.is_published} onChange={e => setQuestionInput(old => ({ ...old, is_published: e.target.checked }))}/><span><strong>Publish question</strong></span></label><button type="button" className="pm-admin-button" onClick={resetQuestion}>Cancel</button><button type="submit" disabled={questionBusy} className="pm-admin-button pm-admin-button-primary"><Save size={16}/>{questionBusy ? 'Saving…' : editingId ? 'Update question' : 'Save question'}</button></div>
                    {Object.keys(questionErrors).length > 0 && <p role="alert" className="pm-admin-notice pm-admin-notice-error">Please correct the highlighted question fields.</p>}
                </form>}
                <form className="pm-course-content-filters" onSubmit={applyFilters} role="search">
                    <label className="pm-admin-field"><span>Search</span><input type="search" placeholder="Question ID or text" value={search} onChange={e => setSearch(e.target.value)}/></label>
                    <AdminChoice id="question-filter-section" label="Section" value={filterSection || '__all__'} options={[{ value: '__all__', label: 'All sections' }, ...sections]} onChange={next => setFilterSection(next === '__all__' ? '' : next)}/>
                    <AdminChoice id="question-filter-kind" label="Type" value={filterType} options={[{ value: 'all', label: 'All types' }, ...choices('course_question_kind', filterType === 'all' ? undefined : filterType)]} onChange={setFilterType}/>
                    <button type="submit" className="pm-admin-button"><Search size={16}/> Filter</button>
                </form>
                <div className="pm-course-admin-table-scroll"><table className="pm-course-admin-table"><thead><tr><th>Question</th><th>Curriculum</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                    {questions.data.map(question => <tr key={question.id}><td><strong>{question.code}</strong><small className="pm-course-content-question-preview">{question.prompt}</small></td><td>{question.section_title}<small>{question.topic_title}</small><small>{question.lesson_uid ? course.lessons.find(lesson => lesson.uid === question.lesson_uid)?.title ?? 'Unlinked lesson' : 'Shared topic'}</small></td><td>{(dropdowns.course_question_kind ?? []).find(item => item.value === question.kind)?.label ?? question.kind}<small>{(dropdowns.course_question_difficulty ?? []).find(item => item.value === question.difficulty)?.label ?? question.difficulty}</small></td><td><span className={`pm-course-admin-status ${question.is_published ? 'is-published' : ''}`}>{question.is_published ? 'Published' : 'Draft'}</span></td><td><div className="pm-course-admin-row-actions"><button className="pm-admin-button" type="button" onClick={() => editQuestion(question)}>Edit</button><button type="button" className="pm-course-admin-toggle" disabled={switching !== null} onClick={() => updateQuestionStatus(question)}>{switching === question.id ? 'Updating…' : question.is_published ? 'Unpublish' : 'Publish'}</button></div></td></tr>)}
                </tbody></table>{questions.data.length === 0 && <p className="pm-course-admin-empty"><BookOpen size={18}/> No questions yet.</p>}</div>
                <div className="pm-course-admin-pagination"><span>{questions.total === 0 ? 'No questions' : `${questions.from}–${questions.to} of ${questions.total}`}</span><LinkedPagination links={questions.links} label="Question pages"/></div>
            </section>
        </div> : <div className="pm-course-content-stack pm-course-resources-layout">
            {resourceFormOpen && <section className="pm-admin-panel pm-course-admin-section pm-course-resource-editor-panel" id="course-resource-editor"><div className="pm-course-admin-heading"><div><h2>{editingResourceId ? 'Edit resource' : 'Add course resource'}</h2><p>Attach documents or links to a specific lecture, or share them across a curriculum section.</p></div></div>
                <form className="pm-course-content-resource-form" onSubmit={saveResource} noValidate>
                    {Object.keys(resourceErrors).length > 0 && <p className="pm-course-admin-wide pm-admin-notice pm-admin-notice-error" role="alert">{Object.values(resourceErrors).join(" ")}</p>}
                    <label className="pm-admin-field"><span>Resource title</span><input required maxLength={200} value={resourceInput.title} onChange={e => setResourceInput(old => ({ ...old, title: e.target.value }))}/>{resourceErrors.title && <small className="pm-admin-error">{resourceErrors.title}</small>}</label>
                    <AdminChoice id="resource-section" label="Curriculum section" required value={resourceInput.section_title} options={sections} onChange={next => setResourceInput(old => ({ ...old, section_title: next, lesson_uid: '' }))} error={resourceErrors.section_title}/>
                    <AdminChoice id="resource-lesson" label="Lesson / lecture" clearable placeholder="Entire section (shared resource)" value={resourceInput.lesson_uid} options={course.lessons.filter(lesson => lesson.uid && (!lesson.section_title || lesson.section_title === resourceInput.section_title)).map(lesson => ({value: lesson.uid!, label: lesson.title}))} onChange={next => setResourceInput(old => ({...old, lesson_uid: next}))} error={resourceErrors.lesson_uid}/>
                    <AdminChoice id="resource-kind" label="Resource type" required value={resourceInput.kind} options={choices('course_resource_kind', resourceInput.kind)} onChange={next => { setResourceFile(null); setResourceInput(old => ({ ...old, kind: next as 'file' | 'link' })); }} error={resourceErrors.kind}/>
                    {resourceInput.kind === 'file' ? <div className="pm-admin-field"><span>Document (PDF, Office · up to 10 MB)</span><label className="pm-admin-file-picker"><FileText size={17}/><span>{resourceFile ? resourceFile.name : editingResourceId ? 'Choose replacement document' : 'Choose document'}</span><input ref={resourceFileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" aria-label="Choose resource document" onChange={e => setResourceFile(e.target.files?.[0] ?? null)}/></label>{resourceErrors.file && <small className="pm-admin-error">{resourceErrors.file}</small>}</div> : <label className="pm-admin-field"><span>Resource URL</span><input type="url" placeholder="https://" value={resourceInput.url} onChange={e => setResourceInput(old => ({ ...old, url: e.target.value }))}/>{resourceErrors.url && <small className="pm-admin-error">{resourceErrors.url}</small>}</label>}
                    <label className="pm-admin-field pm-course-admin-wide"><span>Description (optional)</span><textarea rows={2} maxLength={2000} value={resourceInput.description} onChange={e => setResourceInput(old => ({ ...old, description: e.target.value }))}/>{resourceErrors.description && <small className="pm-admin-error">{resourceErrors.description}</small>}</label>
                    {resourceProgress !== null && <p className="pm-course-admin-wide" role="status">Uploading… {resourceProgress}%</p>}
                    <div className="pm-course-content-form-actions pm-course-admin-wide"><label className="pm-course-admin-publish"><input type="checkbox" checked={resourceInput.is_published} onChange={e => setResourceInput(old => ({ ...old, is_published: e.target.checked }))}/><span><strong>Publish resource</strong></span></label><button className="pm-admin-button pm-admin-button-primary" disabled={resourceBusy || (resourceInput.kind === 'file' && !resourceFile && editingResourceId === null)}><Plus size={16}/>{resourceBusy ? 'Saving…' : editingResourceId ? 'Save resource' : 'Add resource'}</button>{editingResourceId && <button type="button" className="pm-admin-button" onClick={cancelResource}>Cancel edit</button>}</div>
                </form>
            </section>}
            <section className="pm-admin-panel pm-course-admin-section pm-course-resource-list-panel"><div className="pm-course-admin-heading"><div><h2>{selectedLesson ? `Documents for ${selectedLesson.title}` : 'Course resources'}</h2><p>{resources.total} resources</p>{selectedLesson && <Link className="pm-admin-button" href={`${base}/content?tab=resources`}>All course resources</Link>}</div><button type="button" className="pm-admin-button pm-admin-button-primary" onClick={() => { if (resourceFormOpen) cancelResource(); else setResourceFormOpen(true); }}><Plus size={16}/>{resourceFormOpen ? 'Close form' : 'Add resource'}</button></div>
                <AdminChoice id="resource-filter-lesson" label="Filter resources by lesson" value={initialLesson || 'all'} options={[{value:'all',label:'All course resources'}, ...course.lessons.filter(lesson => lesson.uid).map(lesson => ({value:lesson.uid!,label:lesson.title}))]} onChange={value => router.get(`${base}/content`, {tab:'resources', ...(value === 'all' ? {} : {lesson:value})}, {preserveState:false})}/>
                <div className="pm-course-admin-table-scroll"><table className="pm-course-admin-table"><thead><tr><th>Resource</th><th>Section / lesson</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>{resources.data.map(resource => <tr key={resource.id}><td><strong>{resource.title}</strong><small>{resource.description || resource.original_name || resource.url}</small></td><td>{resource.section_title}<small>{resource.lesson_uid ? course.lessons.find(lesson => lesson.uid === resource.lesson_uid)?.title ?? 'Unlinked lesson' : 'Shared section resource'}</small></td><td>{(dropdowns.course_resource_kind ?? []).find(item => item.value === resource.kind)?.label ?? resource.kind}</td><td><span className={`pm-course-admin-status ${resource.is_published ? 'is-published' : ''}`}>{resource.is_published ? 'Published' : 'Draft'}</span></td><td><div className="pm-course-admin-row-actions"><button type="button" className="pm-admin-button" onClick={() => editResource(resource)}>Edit</button><button type="button" className="pm-course-admin-toggle" disabled={switching !== null} onClick={() => updateResourceStatus(resource)}>{switching === resource.id ? 'Updating…' : resource.is_published ? 'Unpublish' : 'Publish'}</button></div></td></tr>)}</tbody></table>{resources.total === 0 && <p className="pm-course-admin-empty"><FileText size={18}/> No resources yet. Select Add resource to upload a document or add a link.</p>}</div>
                <div className="pm-course-admin-pagination"><span>{resources.total === 0 ? 'No resources' : `${resources.from}–${resources.to} of ${resources.total}`}</span><LinkedPagination links={resources.links} label="Resource pages" preserveState/></div>
            </section>
        </div>}
    </AdminLayout>;
}
