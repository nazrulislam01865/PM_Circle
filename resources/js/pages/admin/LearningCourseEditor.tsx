import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ImagePlus, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { AdminChoice } from '@/components/admin/AdminChoice';

type Section = { title: string; topics: string[] };
type Lesson = { uid?: string; section_title?: string; topic_title?: string; title: string; body: string; video_url?: string; takeaway?: string; when_to_apply?: string; example?: string; application?: string; references?: string; faq?: QAPair[] };
type QAPair = { question: string; answer: string };
type Presentation = { type: string; tags: string[]; provider_name: string; provider_description: string; faq: QAPair[]; practice_examples: QAPair[] };
const defaultPresentation: Presentation = { type: 'Professional development', tags: [], provider_name: 'PM Circle by ITQAN', provider_description: 'Project management learning and exam preparation resources.', faq: [], practice_examples: [] };
type ExistingCourse = {
    id: number; title: string; summary: string; overview: string; category: string;
    level: string; minutes: number;
    thumbnail: number; coverUrl?: string | null; accessTier: 'free' | 'paid' | 'pro';
    objectives: string[]; outline: Section[]; lessons: Lesson[]; isPublished: boolean; certificateEnabled: boolean; presentation: Presentation; sortOrder: number;
};
type CourseInput = {
    title: string; summary: string; overview: string; category: string;
    level: ExistingCourse['level']; minutes: number;
    access_tier: ExistingCourse['accessTier']; is_published: boolean; certificate_enabled: boolean;
    objectives: string[]; outline: Section[]; lessons: Lesson[]; presentation: Presentation; sort_order: number;
};
const defaults: CourseInput = {
    title: '', summary: '', overview: '', category: '', level: '', minutes: 120,
    access_tier: '' as ExistingCourse['accessTier'], is_published: false, certificate_enabled: false, presentation: defaultPresentation, sort_order: 999,
    objectives: [''], outline: [{ title: '', topics: [''] }], lessons: [{ title: '', body: '' }],
};
type DropdownOption = { value: string; label: string };
type Dropdowns = Record<string, DropdownOption[]>;

export default function LearningCourseEditor({ course, dropdowns }: { course: ExistingCourse | null; dropdowns: Dropdowns }) {
    const [value, setValue] = useState<CourseInput>(() => course ? {
        title: course.title, summary: course.summary, overview: course.overview,
        category: course.category, level: course.level, minutes: course.minutes,
        access_tier: course.accessTier, is_published: course.isPublished, certificate_enabled: course.certificateEnabled, presentation: course.presentation ?? defaultPresentation, sort_order: course.sortOrder ?? 999,
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
    const setPresentation = <K extends keyof Presentation>(key: K, next: Presentation[K]) => setValue(old => ({ ...old, presentation: { ...old.presentation, [key]: next } }));
    const setObjective = (index: number, text: string) => update('objectives', value.objectives.map((item, i) => i === index ? text : item));
    const setSection = (index: number, patch: Partial<Section>) => setValue(old => {
        const original = old.outline[index];
        return { ...old, outline: old.outline.map((item, i) => i === index ? { ...item, ...patch } : item), lessons: old.lessons.map(lesson => lesson.section_title === original.title && original.title ? { ...lesson, section_title: patch.title ?? original.title, topic_title: patch.topics && !patch.topics.includes(lesson.topic_title ?? '') ? '' : lesson.topic_title } : lesson) };
    });
    const setLesson = (index: number, patch: Partial<Lesson>) => update('lessons', value.lessons.map((item, i) => i === index ? { ...item, ...patch } : item));
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); if (busy) return;
        setBusy(true); setErrors({});
        const url = isEditing ? `/admin/learning/courses/${course.id}` : '/admin/learning/courses';
        // Multipart POST with method spoofing ensures PHP reads the cover upload on edit.
        router.post(url, { course_payload: JSON.stringify({ ...value, presentation: { ...value.presentation, tags: value.presentation.tags.map(tag => tag.trim()).filter(Boolean) } }), cover_image: cover || undefined, ...(isEditing ? { _method: 'PUT' } : {}) }, {
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
            {course && <><Link href={`/admin/learning/courses/${course.id}/content`} className="pm-admin-button pm-admin-button-primary">Questions & resources</Link><Link href={`/admin/learning/courses/${course.id}/reviews`} className="pm-admin-button">Moderate reviews</Link></>}
        </div>
        <form className="pm-course-admin-editor" onSubmit={save} noValidate>
            <nav className="pm-admin-panel pm-course-editor-nav" aria-label="Course editing sections">{[['course-info','Course information'], ['course-objectives','Learning objectives'], ['course-outline','Curriculum'], ['course-lessons','Lessons & lectures'], ['course-provider','Provider'], ['course-faq','Q&A'], ['course-practice_examples','Practice examples'], ['course-publication','Publication']].map(([id,label]) => <a key={id} className="pm-admin-button" href={`#${id}`}>{label}</a>)}</nav>
            <div id="course-editor-errors" aria-live="polite">{Object.keys(errors).length > 0 && <div role="alert" className="pm-admin-notice pm-admin-notice-error"><div><strong>Please correct these fields before saving.</strong><ul>{Object.entries(errors).map(([key, message]) => <li key={key}>{message}</li>)}</ul></div></div>}</div>
            <section id="course-info" className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-section-heading"><h2>Course information</h2><p>Shown in the library card and course header.</p></div>
                <div className="pm-course-admin-fields">
                    <label className="pm-admin-field pm-course-admin-wide"><span>Course title</span><input required maxLength={180} value={value.title} onChange={e => update('title', e.target.value)}/>{fieldError('title')}</label>
                    <label className="pm-admin-field pm-course-admin-wide"><span>Short description</span><textarea required rows={2} maxLength={1000} value={value.summary} onChange={e => update('summary', e.target.value)}/>{fieldError('summary')}</label>
                    <AdminChoice id="course-category" label="Category" required value={value.category} options={dropdowns.course_category ?? []} onChange={next => update('category', next)} error={errors.category}/>
                    <AdminChoice id="course-type" label="Course type" required value={value.presentation.type} options={['Professional development', 'Certification preparation'].map(value => ({value, label: value}))} onChange={next => setPresentation('type', next)} error={errors['presentation.type']}/>
                    <AdminChoice id="course-level" label="Level" required value={value.level} options={dropdowns.course_level ?? []} onChange={next => update('level', next)} error={errors.level}/>
                    <label className="pm-admin-field"><span>Estimated study time (minutes)</span><input type="number" required min={1} max={100000} value={value.minutes} onChange={e => update('minutes', Number(e.target.value))}/>{fieldError('minutes')}</label>
                    <AdminChoice id="course-access" label="Membership access" required value={value.access_tier} options={dropdowns.course_access ?? []} onChange={next => update('access_tier', next as CourseInput['access_tier'])} error={errors.access_tier}/>
                    <label className="pm-admin-field"><span>Catalog order (lower appears first)</span><input type="number" min={0} max={100000} value={value.sort_order} onChange={e => update('sort_order', Number(e.target.value))}/>{fieldError('sort_order')}</label>
                    <div className="pm-course-admin-wide"><label className="pm-course-admin-publish"><input type="checkbox" checked={value.certificate_enabled} onChange={e => update('certificate_enabled', e.target.checked)}/><span><strong>Provide certificate after course completion</strong><small>Automatically issue one certificate when a member completes every lesson. Turning this off does not revoke certificates already earned.</small></span></label>{fieldError('certificate_enabled')}</div>
                    <div className="pm-course-cover-control pm-course-admin-wide">
                        <div className="pm-course-admin-cover-preview"><img src={coverPreview || course?.coverUrl || `/images/learning/course-${course?.thumbnail ?? 1}.webp`} alt="Course cover preview"/></div>
                        <div className="pm-course-cover-actions"><strong>Course cover image</strong><label className="pm-admin-button pm-admin-button-quiet"><ImagePlus size={17}/>{cover ? 'Choose another image' : course?.coverUrl ? 'Replace image' : 'Upload custom cover'}<input type="file" accept="image/jpeg,image/png,image/webp" className="pm-course-cover-input" onChange={e => setCover(e.target.files?.[0] ?? null)}/></label>{cover && <><small>{cover.name}</small><button type="button" className="pm-admin-button" onClick={() => setCover(null)}>Cancel selection</button></>}<small>JPG, PNG or WebP · up to 3 MB</small>{fieldError('cover_image')}</div>
                    </div>
                    <label className="pm-admin-field pm-course-admin-wide"><span>Additional topic tags (one per line, optional)</span><textarea rows={3} value={value.presentation.tags.join('\n')} onChange={e => setPresentation('tags', e.target.value.split('\n'))}/>{fieldError('presentation.tags')}{value.presentation.tags.map((_, i) => fieldError(`presentation.tags.${i}`))}</label>
                    <label className="pm-admin-field pm-course-admin-wide"><span>Full overview</span><textarea required rows={5} maxLength={10000} value={value.overview} onChange={e => update('overview', e.target.value)}/>{fieldError('overview')}</label>
                </div>
            </section>
            <section id="course-objectives" className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-section-heading"><h2>Learning objectives</h2><p>What learners will be able to do after the course.</p></div>
                <div className="pm-course-admin-repeater">{value.objectives.map((objective, index) => <div className="pm-course-admin-repeat-line" key={index}>
                    <label className="pm-admin-field"><span>Objective {index + 1}</span><input required maxLength={300} value={objective} onChange={e => setObjective(index, e.target.value)}/>{fieldError(`objectives.${index}`)}</label>
                    <button type="button" title="Remove objective" aria-label={`Remove objective ${index + 1}`} className="pm-course-admin-remove" disabled={value.objectives.length === 1} onClick={() => update('objectives', value.objectives.filter((_, i) => i !== index))}><Trash2 size={17}/></button>
                </div>)}</div>
                {fieldError('objectives')}
                <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={value.objectives.length >= 30} onClick={() => update('objectives', [...value.objectives, ''])}><Plus size={16}/> Add objective</button>
            </section>
            <section id="course-outline" className="pm-admin-panel pm-course-admin-section">
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
            <section id="course-lessons" className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-section-heading"><h2>Lessons & lectures</h2><p>Connect each lesson to its curriculum topic. Save the course before attaching questions or documents to new lessons.</p></div>
                <div className="pm-course-admin-repeater">{value.lessons.map((lesson, index) => <div className="pm-course-admin-repeat-card" key={index}>
                    <div className="pm-course-admin-repeat-card-head"><strong>Lesson {index + 1}</strong><div className="pm-course-admin-row-actions"><button type="button" className="pm-admin-button" disabled={index===0} onClick={() => { const lessons = [...value.lessons]; [lessons[index-1], lessons[index]] = [lessons[index], lessons[index-1]]; update('lessons', lessons); }}>Move up</button><button type="button" className="pm-admin-button" disabled={index===value.lessons.length-1} onClick={() => { const lessons = [...value.lessons]; [lessons[index+1], lessons[index]] = [lessons[index], lessons[index+1]]; update('lessons', lessons); }}>Move down</button><button type="button" className="pm-course-admin-remove" disabled={value.lessons.length === 1} onClick={() => update('lessons', value.lessons.filter((_, i) => i !== index))}><Trash2 size={16}/> Remove lesson</button></div></div>
                    <label className="pm-admin-field"><span>Lesson title</span><input required maxLength={200} value={lesson.title} onChange={e => setLesson(index, { title: e.target.value })}/>{fieldError(`lessons.${index}.title`)}</label>
                    <div className="pm-course-admin-fields">
                        <AdminChoice id={`lesson-section-${index}`} label="Curriculum section" clearable value={lesson.section_title ?? ''} options={value.outline.filter(item => item.title.trim()).map(item => ({value: item.title, label: item.title}))} onChange={next => setLesson(index, {section_title: next, topic_title: ''})} error={errors[`lessons.${index}.section_title`]}/>
                        <AdminChoice id={`lesson-topic-${index}`} label="Curriculum topic" value={lesson.topic_title ?? ''} disabled={!lesson.section_title} options={[...new Set(value.outline.find(item => item.title === lesson.section_title)?.topics.filter(topic => topic.trim()) ?? [])].map(value => ({value, label: value}))} onChange={next => setLesson(index, {topic_title: next})} error={errors[`lessons.${index}.topic_title`]}/>
                    </div>
                    {course && lesson.uid && <div className="pm-course-admin-row-actions"><Link className="pm-admin-button pm-admin-button-quiet" href={`/admin/learning/courses/${course.id}/content?tab=resources&lesson=${encodeURIComponent(lesson.uid)}`}>Manage lesson documents</Link>{lesson.section_title && lesson.topic_title && <Link className="pm-admin-button pm-admin-button-quiet" href={`/admin/learning/courses/${course.id}/content?tab=questions&lesson=${encodeURIComponent(lesson.uid)}`}>Manage lesson questions</Link>}</div>}
                    <label className="pm-admin-field"><span>Study material</span><textarea required rows={5} maxLength={20000} value={lesson.body} onChange={e => setLesson(index, { body: e.target.value })}/>{fieldError(`lessons.${index}.body`)}</label>
                    <label className="pm-admin-field"><span>Video URL (optional HTTPS direct video link)</span><input type="url" maxLength={2000} value={lesson.video_url ?? ''} onChange={e => setLesson(index, { video_url: e.target.value })}/>{fieldError(`lessons.${index}.video_url`)}</label>
                    {([['takeaway', 'Key takeaway'], ['when_to_apply', 'When to apply it'], ['example', 'Example scenario'], ['references', 'Learning references'], ['application', 'Apply what you learned']] as const).map(([field, label]) => <label className="pm-admin-field" key={field}><span>{label} (optional)</span><textarea rows={2} maxLength={5000} value={lesson[field] ?? ''} onChange={e => setLesson(index, { [field]: e.target.value })}/>{fieldError(`lessons.${index}.${field}`)}</label>)}
                    <div className="pm-course-admin-repeat-card"><strong>Lesson Q&amp;A (optional)</strong>{(lesson.faq ?? []).map((pair, qi) => <div key={qi} className="pm-course-admin-repeat-card"><label className="pm-admin-field"><span>Question</span><input maxLength={300} value={pair.question} onChange={e => setLesson(index,{faq:lesson.faq!.map((item,i) => i===qi ? {...item,question:e.target.value} : item)})}/></label><label className="pm-admin-field"><span>Answer</span><textarea rows={3} maxLength={3000} value={pair.answer} onChange={e => setLesson(index,{faq:lesson.faq!.map((item,i) => i===qi ? {...item,answer:e.target.value} : item)})}/></label><button type="button" className="pm-admin-button" onClick={() => setLesson(index,{faq:lesson.faq!.filter((_,i) => i!==qi)})}>Remove Q&amp;A</button></div>)}<button type="button" className="pm-admin-button" disabled={(lesson.faq?.length ?? 0)>=20} onClick={() => setLesson(index,{faq:[...(lesson.faq ?? []),{question:'',answer:''}]})}><Plus size={16}/> Add lesson Q&amp;A</button></div>
                </div>)}</div>
                {fieldError('lessons')}
                <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={value.lessons.length >= 100} onClick={() => update('lessons', [...value.lessons, { title: '', body: '' }])}><Plus size={16}/> Add lesson</button>
            </section>
            <section id="course-provider" className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-section-heading"><h2>Course provider</h2><p>Shown in the provider card on the course details page.</p></div>
                <label className="pm-admin-field"><span>Provider name</span><input value={value.presentation.provider_name} maxLength={120} onChange={e => setPresentation('provider_name', e.target.value)}/>{fieldError('presentation.provider_name')}</label>
                <label className="pm-admin-field"><span>Provider description</span><textarea rows={3} value={value.presentation.provider_description} maxLength={1000} onChange={e => setPresentation('provider_description', e.target.value)}/>{fieldError('presentation.provider_description')}</label>
            </section>
            {([{field: 'faq', title: 'Q&A', hint: 'Additional course-specific questions. Access, duration and video answers are generated from actual course settings.', max: 20}, {field: 'practice_examples', title: 'Public practice examples', hint: 'Optional learning examples visible to visitors. Manage scored questions separately in Questions & resources.', max: 10}] as const).map(({field, title, hint, max}) => <section id={`course-${field}`} className="pm-admin-panel pm-course-admin-section" key={field}>
                <div className="pm-course-admin-section-heading"><h2>{title}</h2><p>{hint}</p></div>
                {value.presentation[field].map((pair, index) => <div className="pm-course-admin-repeat-card" key={index}>
                    <div className="pm-course-admin-repeat-card-head"><strong>Question {index+1}</strong><button type="button" className="pm-course-admin-remove" onClick={() => setPresentation(field, value.presentation[field].filter((_, i) => i !== index))}><Trash2 size={16}/> Remove</button></div>
                    <label className="pm-admin-field"><span>Question</span><input value={pair.question} maxLength={field === 'faq' ? 200 : 500} onChange={e => setPresentation(field, value.presentation[field].map((item, i) => i === index ? {...item, question: e.target.value} : item))}/>{fieldError(`presentation.${field}.${index}.question`)}</label>
                    <label className="pm-admin-field"><span>Answer</span><textarea rows={3} value={pair.answer} maxLength={field === 'faq' ? 2000 : 3000} onChange={e => setPresentation(field, value.presentation[field].map((item, i) => i === index ? {...item, answer: e.target.value} : item))}/>{fieldError(`presentation.${field}.${index}.answer`)}</label>
                </div>)}
                {fieldError(`presentation.${field}`)}
                <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={value.presentation[field].length >= max} onClick={() => setPresentation(field, [...value.presentation[field], {question: '', answer: ''}])}><Plus size={16}/> Add question</button>
            </section>)}
            <section id="course-publication" className="pm-admin-panel pm-course-admin-savebar">
                <label className="pm-course-admin-publish"><input type="checkbox" checked={value.is_published} onChange={e => update('is_published', e.target.checked)}/><span><strong>Publish this course</strong><small>Allow members to discover and enroll in this course.</small></span></label>
                <div className="pm-course-admin-footer-actions"><Link className="pm-admin-button" href="/admin/learning/courses">Cancel</Link><button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={busy}><Save size={17}/>{busy ? 'Saving…' : isEditing ? 'Save changes' : 'Create course'}</button></div>
            </section>
        </form>
    </AdminLayout>;
}
