import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ImagePlus, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { AdminChoice } from '@/components/admin/AdminChoice';

type Section = { title: string; topics: string[] };
type Lesson = { title: string; body: string };
type ExistingCourse = {
    id: number; title: string; summary: string; overview: string; category: string;
    level: string; minutes: number;
    thumbnail: number; coverUrl?: string | null; accessTier: 'free' | 'paid';
    objectives: string[]; outline: Section[]; lessons: Lesson[]; isPublished: boolean;
};
type CourseInput = {
    title: string; summary: string; overview: string; category: string;
    level: ExistingCourse['level']; minutes: number;
    access_tier: ExistingCourse['accessTier']; is_published: boolean;
    objectives: string[]; outline: Section[]; lessons: Lesson[];
};
const defaults: CourseInput = {
    title: '', summary: '', overview: '', category: '', level: '', minutes: 120,
    access_tier: '' as ExistingCourse['accessTier'], is_published: false,
    objectives: [''], outline: [{ title: '', topics: [''] }], lessons: [{ title: '', body: '' }],
};
type DropdownOption = { value: string; label: string };
type Dropdowns = Record<string, DropdownOption[]>;

export default function LearningCourseEditor({ course, dropdowns }: { course: ExistingCourse | null; dropdowns: Dropdowns }) {
    const [value, setValue] = useState<CourseInput>(() => course ? {
        title: course.title, summary: course.summary, overview: course.overview,
        category: course.category, level: course.level, minutes: course.minutes,
        access_tier: course.accessTier, is_published: course.isPublished,
        objectives: course.objectives?.length ? course.objectives : [''],
        outline: course.outline?.length ? course.outline : [{ title: '', topics: [''] }],
        lessons: course.lessons?.length ? course.lessons : [{ title: '', body: '' }],
    } : {
        ...defaults,
        category: dropdowns.course_category?.[0]?.value ?? '',
        level: dropdowns.course_level?.[0]?.value ?? '',
        access_tier: (dropdowns.course_access?.[0]?.value ?? '') as ExistingCourse['accessTier'],
    });
    const [cover, setCover] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    useEffect(() => {
        if (!cover) { setCoverPreview(null); return; }
        const url = URL.createObjectURL(cover);
        setCoverPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [cover]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const isEditing = !!course;
    const update = <K extends keyof CourseInput>(key: K, fieldValue: CourseInput[K]) => setValue(old => ({ ...old, [key]: fieldValue }));
    const setObjective = (index: number, text: string) => update('objectives', value.objectives.map((item, i) => i === index ? text : item));
    const setSection = (index: number, patch: Partial<Section>) => update('outline', value.outline.map((item, i) => i === index ? { ...item, ...patch } : item));
    const setLesson = (index: number, patch: Partial<Lesson>) => update('lessons', value.lessons.map((item, i) => i === index ? { ...item, ...patch } : item));
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); if (busy) return;
        setBusy(true); setErrors({});
        const url = isEditing ? `/admin/learning/courses/${course.id}` : '/admin/learning/courses';
        // Multipart POST with method spoofing ensures PHP reads the cover upload on edit.
        router.post(url, { ...value, cover_image: cover || undefined, ...(isEditing ? { _method: 'PUT' } : {}) }, {
            forceFormData: true,
            onError: next => { setErrors(next); document.getElementById('course-editor-errors')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
            onFinish: () => setBusy(false),
        });
    };
    const fieldError = (key: string) => errors[key] ? <small className="pm-admin-error" role="alert">{errors[key]}</small> : null;

    return <AdminLayout active="/admin/learning/courses" title={isEditing ? 'Edit course' : 'Add course'} subtitle="Manage the course details, curriculum, and access.">
        <Head title={`${isEditing ? 'Edit' : 'Add'} Course | PM Circle Admin`}/>
        <div className="pm-course-admin-heading pm-course-admin-editor-head">
            <Link href="/admin/learning/courses" className="pm-admin-button"><ArrowLeft size={17}/> Back to courses</Link>
            {course && <Link href={`/admin/learning/courses/${course.id}/content`} className="pm-admin-button pm-admin-button-primary">Manage questions & resources</Link>}
        </div>
        <form className="pm-course-admin-editor" onSubmit={save} noValidate>
            <div id="course-editor-errors" aria-live="polite">{Object.keys(errors).length > 0 && <p className="pm-admin-notice pm-admin-notice-error">Please correct the highlighted course fields before saving.</p>}</div>
            <section className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-section-heading"><h2>Course information</h2><p>Shown in the library card and course header.</p></div>
                <div className="pm-course-admin-fields">
                    <label className="pm-admin-field pm-course-admin-wide"><span>Course title</span><input required maxLength={180} value={value.title} onChange={e => update('title', e.target.value)}/>{fieldError('title')}</label>
                    <label className="pm-admin-field pm-course-admin-wide"><span>Short description</span><textarea required rows={2} maxLength={1000} value={value.summary} onChange={e => update('summary', e.target.value)}/>{fieldError('summary')}</label>
                    <AdminChoice id="course-category" label="Category" required value={value.category} options={dropdowns.course_category ?? []} onChange={next => update('category', next)} error={errors.category}/>
                    <AdminChoice id="course-level" label="Level" required value={value.level} options={dropdowns.course_level ?? []} onChange={next => update('level', next)} error={errors.level}/>
                    <label className="pm-admin-field"><span>Estimated study time (minutes)</span><input type="number" required min={1} max={100000} value={value.minutes} onChange={e => update('minutes', Number(e.target.value))}/>{fieldError('minutes')}</label>
                    <AdminChoice id="course-access" label="Membership access" required value={value.access_tier} options={dropdowns.course_access ?? []} onChange={next => update('access_tier', next as CourseInput['access_tier'])} error={errors.access_tier}/>
                    <div className="pm-course-cover-control pm-course-admin-wide">
                        <div className="pm-course-admin-cover-preview"><img src={coverPreview || course?.coverUrl || `/images/learning/course-${course?.thumbnail ?? 1}.webp`} alt="Course cover preview"/></div>
                        <div className="pm-course-cover-actions"><strong>Course cover image</strong><label className="pm-admin-button pm-admin-button-quiet"><ImagePlus size={17}/>{cover ? 'Choose another image' : course?.coverUrl ? 'Replace image' : 'Upload custom cover'}<input type="file" accept="image/jpeg,image/png,image/webp" className="pm-course-cover-input" onChange={e => setCover(e.target.files?.[0] ?? null)}/></label>{cover && <><small>{cover.name}</small><button type="button" className="pm-admin-button" onClick={() => setCover(null)}>Cancel selection</button></>}<small>JPG, PNG or WebP · up to 3 MB</small>{fieldError('cover_image')}</div>
                    </div>
                    <label className="pm-admin-field pm-course-admin-wide"><span>Full overview</span><textarea required rows={5} maxLength={10000} value={value.overview} onChange={e => update('overview', e.target.value)}/>{fieldError('overview')}</label>
                </div>
            </section>
            <section className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-section-heading"><h2>Learning objectives</h2><p>What learners will be able to do after the course.</p></div>
                <div className="pm-course-admin-repeater">{value.objectives.map((objective, index) => <div className="pm-course-admin-repeat-line" key={index}>
                    <label className="pm-admin-field"><span>Objective {index + 1}</span><input required maxLength={300} value={objective} onChange={e => setObjective(index, e.target.value)}/>{fieldError(`objectives.${index}`)}</label>
                    <button type="button" title="Remove objective" aria-label={`Remove objective ${index + 1}`} className="pm-course-admin-remove" disabled={value.objectives.length === 1} onClick={() => update('objectives', value.objectives.filter((_, i) => i !== index))}><Trash2 size={17}/></button>
                </div>)}</div>
                {fieldError('objectives')}
                <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={value.objectives.length >= 30} onClick={() => update('objectives', [...value.objectives, ''])}><Plus size={16}/> Add objective</button>
            </section>
            <section className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-section-heading"><h2>Course curriculum</h2><p>Public section headings and topics displayed in the course outline.</p></div>
                <div className="pm-course-admin-repeater">{value.outline.map((section, index) => <div className="pm-course-admin-repeat-card" key={index}>
                    <div className="pm-course-admin-repeat-card-head"><strong>Section {index + 1}</strong><button type="button" className="pm-course-admin-remove" disabled={value.outline.length === 1} onClick={() => update('outline', value.outline.filter((_, i) => i !== index))}><Trash2 size={16}/> Remove section</button></div>
                    <label className="pm-admin-field"><span>Section title</span><input required maxLength={200} value={section.title} onChange={e => setSection(index, { title: e.target.value })}/>{fieldError(`outline.${index}.title`)}</label>
                    {section.topics.map((topic, topicIndex) => <div className="pm-course-admin-repeat-line" key={topicIndex}>
                        <label className="pm-admin-field"><span>Topic {topicIndex + 1}</span><input required maxLength={200} value={topic} onChange={e => setSection(index, { topics: section.topics.map((t, i) => i === topicIndex ? e.target.value : t) })}/>{fieldError(`outline.${index}.topics.${topicIndex}`)}</label>
                        <button type="button" className="pm-course-admin-remove" aria-label={`Remove topic ${topicIndex + 1}`} disabled={section.topics.length === 1} onClick={() => setSection(index, { topics: section.topics.filter((_, i) => i !== topicIndex) })}><Trash2 size={16}/></button>
                    </div>)}
                    <button type="button" className="pm-admin-button" disabled={section.topics.length >= 40} onClick={() => setSection(index, { topics: [...section.topics, ''] })}><Plus size={16}/> Add topic</button>
                </div>)}</div>
                {fieldError('outline')}
                <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={value.outline.length >= 40} onClick={() => update('outline', [...value.outline, { title: '', topics: [''] }])}><Plus size={16}/> Add section</button>
            </section>
            <section className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-section-heading"><h2>Study notes</h2><p>Lesson bodies are shown only after eligible member enrollment.</p></div>
                <div className="pm-course-admin-repeater">{value.lessons.map((lesson, index) => <div className="pm-course-admin-repeat-card" key={index}>
                    <div className="pm-course-admin-repeat-card-head"><strong>Study note {index + 1}</strong><button type="button" className="pm-course-admin-remove" disabled={value.lessons.length === 1} onClick={() => update('lessons', value.lessons.filter((_, i) => i !== index))}><Trash2 size={16}/> Remove note</button></div>
                    <label className="pm-admin-field"><span>Lesson title</span><input required maxLength={200} value={lesson.title} onChange={e => setLesson(index, { title: e.target.value })}/>{fieldError(`lessons.${index}.title`)}</label>
                    <label className="pm-admin-field"><span>Study material</span><textarea required rows={5} maxLength={20000} value={lesson.body} onChange={e => setLesson(index, { body: e.target.value })}/>{fieldError(`lessons.${index}.body`)}</label>
                </div>)}</div>
                {fieldError('lessons')}
                <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={value.lessons.length >= 100} onClick={() => update('lessons', [...value.lessons, { title: '', body: '' }])}><Plus size={16}/> Add study note</button>
            </section>
            <section className="pm-admin-panel pm-course-admin-savebar">
                <label className="pm-course-admin-publish"><input type="checkbox" checked={value.is_published} onChange={e => update('is_published', e.target.checked)}/><span><strong>Publish this course</strong><small>Allow members to discover and enroll in this course.</small></span></label>
                <div className="pm-course-admin-footer-actions"><Link className="pm-admin-button" href="/admin/learning/courses">Cancel</Link><button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={busy}><Save size={17}/>{busy ? 'Saving…' : isEditing ? 'Save changes' : 'Create course'}</button></div>
            </section>
        </form>
    </AdminLayout>;
}
