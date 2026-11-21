import { Head, Link, router, usePage } from '@inertiajs/react';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, Layers3, Pencil, Plus, Search, Settings2, Trash2, UploadCloud, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { AdminChoice } from '@/components/admin/AdminChoice';
import { AdminLayout } from '@/layouts/admin/AdminLayout';

type Option = { id: number; group: string; key: string; label: string; is_active: boolean; sort_order: number };
type QuestionSet = { id: number; title: string; description: string | null; industry: string | null; role: string | null; experience: string | null; is_active: boolean; sort_order: number; question_count: number | string };
type Question = { id: number; set_id: number; type: string; text: string; is_active: boolean; sort_order: number; set_title: string };
type Pagination = { data: Question[]; total: number; from: number | null; to: number | null; prev_page_url: string | null; next_page_url: string | null };
type Props = { options: Option[]; sets: QuestionSet[]; questions: Pagination; settings: { minutes_per_question: number }; filters: { search: string; set: number } };
type Tab = 'options' | 'sets' | 'questions' | 'settings';
type Editor = { kind: 'option' | 'set' | 'question'; id?: number } | null;
type FormData = Record<string, string | number | boolean | null>;
type Deleting = { kind: 'option' | 'set' | 'question'; id: number; name: string } | null;
const groups = [
    { key: 'industry', name: 'Industries', description: 'Which industries members can practise in' },
    { key: 'role', name: 'PM roles', description: 'Available interview job roles' },
    { key: 'experience', name: 'Experience levels', description: 'Experience selections for members' },
    { key: 'type', name: 'Question types', description: 'General, behavioral, situational and more' },
    { key: 'count', name: 'Question counts', description: 'How many questions members can request' },
    { key: 'mode', name: 'Answer modes', description: 'Type, speak or both; mode keys are fixed' },
] as const;
const base = '/admin/interview-preparation';
const optionEmpty = { group: 'industry', key: '', label: '', is_active: true, sort_order: 10 };
const setEmpty = { title: '', description: '', industry: null, role: null, experience: null, is_active: false, sort_order: 10 };
const questionEmpty = { set_id: 0, type: 'General', text: '', is_active: true, sort_order: 10 };

export default function InterviewCatalog({ options, sets, questions, settings, filters }: Props) {
    const { flash } = usePage<{ flash?: { status?: string } }>().props;
    const initialTab = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get('tab');
    const [tab, setTab] = useState<Tab>((['options', 'sets', 'questions', 'settings'].includes(initialTab ?? '') ? initialTab : 'options') as Tab);
    const [editor, setEditor] = useState<Editor>(null);
    const [deleting, setDeleting] = useState<Deleting>(null);
    const [deleteError, setDeleteError] = useState('');
    const [importOpen, setImportOpen] = useState(false);
    const [importSet, setImportSet] = useState(String(sets[0]?.id ?? ''));
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importDragging, setImportDragging] = useState(false);
    const [importErrors, setImportErrors] = useState<Record<string, string>>({});
    const [form, setForm] = useState<FormData>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [search, setSearch] = useState(filters.search);
    const [setFilter, setSetFilter] = useState(String(filters.set || ''));
    const [minutes, setMinutes] = useState(settings.minutes_per_question);
    const active = (group: string) => options.filter(option => option.group === group && option.is_active);
    const labelFor = (group: string, value: string) => options.find(option => option.group === group && option.key === value)?.label ?? value;
    const change = (key: string, value: FormData[string]) => setForm(previous => ({ ...previous, [key]: value }));
    const startCreate = (kind: NonNullable<Editor>['kind'], group?: string) => {
        setErrors({}); setForm(kind === 'option' ? { ...optionEmpty, group: group ?? 'industry' } : kind === 'set'
            ? { ...setEmpty } : { ...questionEmpty, set_id: sets[0]?.id ?? 0, type: active('type')[0]?.key ?? '' });
        setEditor({ kind });
    };
    const startEdit = (kind: NonNullable<Editor>['kind'], data: Option | QuestionSet | Question) => {
        setErrors({}); setForm({ ...data } as unknown as FormData); setEditor({ kind, id: data.id });
    };
    const submit = (event: FormEvent) => {
        event.preventDefault(); if (!editor || busy) return;
        const { kind, id } = editor;
        const name = kind === 'option' ? 'options' : kind === 'set' ? 'sets' : 'questions';
        const url = `${base}/${name}${id ? `/${id}` : ''}`;
        const payload = { ...form };
        if (kind === 'set') for (const key of ['industry', 'role', 'experience', 'description']) if (!payload[key]) payload[key] = null;
        if (kind === 'option' && id) { delete payload.key; delete payload.group; }
        setBusy(true); setErrors({});
        router.visit(url, {
            method: id ? 'patch' : 'post', data: payload, preserveScroll: true, preserveState: true,
            onError: next => setErrors(next), onSuccess: () => setEditor(null), onFinish: () => setBusy(false),
        });
    };
    const filter = (event: FormEvent) => {
        event.preventDefault();
        router.get(base, { tab: 'questions', search: search.trim(), set: setFilter }, { preserveScroll: true, preserveState: true });
    };
    const destroy = () => {
        if (!deleting || busy) return;
        const section = deleting.kind === 'option' ? 'options' : deleting.kind === 'set' ? 'sets' : 'questions';
        setBusy(true); setDeleteError('');
        router.delete(`${base}/${section}/${deleting.id}`, {
            preserveScroll: true, onSuccess: () => setDeleting(null),
            onError: issues => setDeleteError(Object.values(issues).join(' ') || 'Unable to delete.'),
            onFinish: () => setBusy(false),
        });
    };
    const chooseImportFile = (file: File | null) => {
        setImportErrors(previous => { const next = { ...previous }; delete next.file; return next; });
        setImportFile(null);
        if (!file) return;
        if (!/\.(csv|xlsx)$/i.test(file.name)) {
            setImportErrors(previous => ({ ...previous, file: 'Choose a CSV or Excel (.xlsx) file.' }));
        } else if (file.size === 0 || file.size > 5 * 1024 * 1024) {
            setImportErrors(previous => ({ ...previous, file: 'Choose a non-empty file smaller than 5 MB.' }));
        } else {
            setImportFile(file);
        }
    };
    const closeImport = () => { setImportFile(null); setImportDragging(false); setImportErrors({}); setImportOpen(false); };
    const importQuestions = (event: FormEvent) => {
        event.preventDefault(); if (!importFile || !importSet || busy) return;
        setBusy(true); setImportErrors({});
        router.post(`${base}/questions/import`, { set_id: Number(importSet), file: importFile }, {
            forceFormData: true, preserveScroll: true,
            onSuccess: closeImport,
            onError: issues => setImportErrors(issues), onFinish: () => setBusy(false),
        });
    };
    const confirmDelete = (kind: NonNullable<Deleting>['kind'], id: number, name: string) => {
        setDeleteError(''); setDeleting({ kind, id, name });
    };
    const saveSettings = (event: FormEvent) => {
        event.preventDefault(); setBusy(true); setErrors({});
        router.put(`${base}/settings`, { minutes_per_question: minutes }, { preserveScroll: true,
            onError: next => setErrors(next), onFinish: () => setBusy(false) });
    };
    const optionSelect = (name: string, field: string, value: string) => <AdminChoice
        key={field} id={`interview-set-${field}`} label={name} value={value} contentClassName="pm-interview-admin-choice-content"
        onChange={next => change(field, next || null)}
        placeholder={`All / any ${name.toLowerCase()}`} clearable
        options={options.filter(item => item.group === field).map(item => ({ value: item.key, label: `${item.label}${item.is_active ? '' : ' (inactive)'}` }))}
        error={errors[field]}/>;

    return <AdminLayout active={base} title="Interview preparation" subtitle="Manage interview choices from central Master Data, question sets, questions and practice timing.">
        <Head title="Interview preparation | PM Circle Admin"/>
        {flash?.status && <p className="pm-admin-notice pm-admin-notice-success" role="status"><CheckCircle2 size={17}/>{flash.status}</p>}
        <div className="pm-interview-admin-stats">
            <div className="pm-admin-panel"><Layers3 size={20}/><span>Question sets</span><strong>{sets.length}</strong></div>
            <div className="pm-admin-panel"><BookOpen size={20}/><span>Questions found</span><strong>{questions.total}</strong></div>
            <div className="pm-admin-panel"><Settings2 size={20}/><span>Active options</span><strong>{options.filter(item => item.is_active).length}</strong></div>
        </div>
        <div role="tablist" aria-label="Interview administration" className="pm-interview-admin-tabs">
            {([['options', 'Member options'], ['sets', 'Question sets'], ['questions', 'Question bank'], ['settings', 'Timing']] as const).map(([key, name]) => <button type="button" key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{name}</button>)}
        </div>
        {tab === 'options' && <p className="pm-interview-admin-master-note">These member options share the <Link href="/admin/master-data?category=interview_industry">central Master Data</Link> records; changes here also appear there.</p>}
        {tab === 'options' && <div className="pm-interview-admin-groups">{groups.map(group => <section className="pm-admin-panel" key={group.key}>
            <div className="pm-interview-admin-title"><div><h2>{group.name}</h2><p>{group.description}</p></div>{group.key !== 'mode' && <button className="pm-admin-button pm-admin-button-primary" type="button" onClick={() => startCreate('option', group.key)}><Plus size={16}/> Add</button>}</div>
            <div className="pm-interview-admin-option-list">{options.filter(option => option.group === group.key).map(option => <div className="pm-interview-admin-option" key={option.id}>
                <div><strong>{option.label}</strong><small>{option.key}</small></div><span className={`pm-interview-admin-status ${option.is_active ? 'is-active' : ''}`}>{option.is_active ? 'Active' : 'Hidden'}</span>
                <button type="button" className="pm-admin-button" aria-label={`Edit ${option.label}`} onClick={() => startEdit('option', option)}><Pencil size={15}/> Edit</button><button type="button" className="pm-admin-button pm-interview-admin-delete" aria-label={`Delete ${option.label}`} onClick={() => confirmDelete('option', option.id, option.label)}><Trash2 size={15}/> Delete</button>
            </div>)}{!options.some(option => option.group === group.key) && <p className="pm-interview-admin-muted">No options yet.</p>}</div>
        </section>)}</div>}
        {tab === 'sets' && <section className="pm-admin-panel">
            <div className="pm-interview-admin-title"><div><h2>Question sets</h2><p>Create industry-, role- or level-specific sets. Leave filters empty to apply a set to everyone.</p></div><button type="button" className="pm-admin-button pm-admin-button-primary" onClick={() => startCreate('set')}><Plus size={17}/> Add set</button></div>
            <div className="pm-interview-admin-record-list">{sets.map(item => <article key={item.id} className="pm-interview-admin-record"><div className="pm-interview-admin-record-text"><h3>{item.title}</h3><p>{item.description || 'No description'}</p><small>{[item.industry && labelFor('industry', item.industry), item.role && labelFor('role', item.role), item.experience && labelFor('experience', item.experience)].filter(Boolean).join(' · ') || 'All industries, roles and levels'} · {item.question_count} questions</small></div><span className={`pm-interview-admin-status ${item.is_active ? 'is-active' : ''}`}>{item.is_active ? 'Published' : 'Draft'}</span><button type="button" className="pm-admin-button" onClick={() => startEdit('set', item)}><Pencil size={15}/> Edit</button><button type="button" className="pm-admin-button pm-interview-admin-delete" onClick={() => confirmDelete('set', item.id, item.title)}><Trash2 size={15}/> Delete</button></article>)}
                {sets.length === 0 && <p className="pm-interview-admin-muted">Create a question set before adding questions.</p>}</div>
        </section>}
        {tab === 'questions' && <section className="pm-admin-panel">
            <div className="pm-interview-admin-title"><div><h2>Question bank</h2><p>Questions from published sets are selected for new practice sessions. Previously started interviews are unchanged.</p></div><div className="pm-interview-admin-header-actions"><button type="button" disabled={!sets.length} className="pm-admin-button" onClick={() => { setImportErrors({}); setImportFile(null); setImportOpen(true); }}><UploadCloud size={17}/> Import questions</button><button type="button" disabled={!sets.length || !active('type').length} className="pm-admin-button pm-admin-button-primary" onClick={() => startCreate('question')}><Plus size={17}/> Add question</button></div></div>
            <form className="pm-interview-admin-filters" onSubmit={filter} role="search"><label className="pm-admin-field"><span>Search questions</span><input value={search} onChange={event => setSearch(event.target.value)} type="search" placeholder="Search question text"/></label><AdminChoice id="interview-filter-set" label="Question set" value={setFilter} onChange={setSetFilter} placeholder="All sets" clearable options={sets.map(item => ({ value: String(item.id), label: item.title }))}/><button type="submit" className="pm-admin-button"><Search size={17}/> Filter</button></form>
            <div className="pm-interview-admin-record-list">{questions.data.map(item => <article className="pm-interview-admin-record" key={item.id}><div className="pm-interview-admin-record-text"><small>{item.set_title} · {labelFor('type', item.type)}</small><h3>{item.text}</h3></div><span className={`pm-interview-admin-status ${item.is_active ? 'is-active' : ''}`}>{item.is_active ? 'Active' : 'Hidden'}</span><button type="button" className="pm-admin-button" onClick={() => startEdit('question', item)}><Pencil size={15}/> Edit</button><button type="button" className="pm-admin-button pm-interview-admin-delete" onClick={() => confirmDelete('question', item.id, item.text)}><Trash2 size={15}/> Delete</button></article>)}
                {questions.data.length === 0 && <p className="pm-interview-admin-muted">No questions match these filters.</p>}</div>
            <div className="pm-interview-admin-pagination"><span>{questions.from ?? 0}–{questions.to ?? 0} of {questions.total}</span><div>{questions.prev_page_url ? <Link className="pm-admin-button" href={questions.prev_page_url}><ChevronLeft size={16}/> Previous</Link> : null}{questions.next_page_url ? <Link className="pm-admin-button" href={questions.next_page_url}>Next <ChevronRight size={16}/></Link> : null}</div></div>
        </section>}
        {tab === 'settings' && <section className="pm-admin-panel pm-interview-admin-settings"><div className="pm-interview-admin-title"><div><h2>Practice timing</h2><p>Set the estimated time per question. Existing sessions keep their original timing.</p></div><Clock3 size={24}/></div><form onSubmit={saveSettings}>
            <label className="pm-admin-field"><span>Minutes per question</span><input min="1" max="30" required type="number" value={minutes} onChange={event => setMinutes(Number(event.target.value))}/></label>{errors.minutes_per_question && <p role="alert" className="pm-interview-admin-error">{errors.minutes_per_question}</p>}
            <button className="pm-admin-button pm-admin-button-primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save timing'}</button></form><p className="pm-interview-admin-muted">AI evaluation and credit usage are not enabled by this setting.</p>
        </section>}
        {importOpen && <div className="pm-interview-admin-modal-overlay"><div className="pm-interview-admin-modal pm-interview-import-modal" role="dialog" aria-modal="true" aria-label="Import interview questions">
            <header><div><h2>Import interview questions</h2><p>Add multiple questions to a selected set.</p></div><button type="button" aria-label="Close import dialog" disabled={busy} onClick={closeImport}><X size={20}/></button></header>
            <form className="pm-interview-import-form" onSubmit={importQuestions}>
                <section className="pm-interview-import-section" aria-label="Step 1: Choose a question set">
                    <div className="pm-interview-import-heading"><span className="pm-interview-import-step" aria-hidden="true">1</span><strong>Choose a question set</strong></div>
                    <AdminChoice id="interview-import-set" contentClassName="pm-interview-admin-choice-content" label="Destination question set" required disabled={busy} value={importSet} onChange={setImportSet} options={sets.map(item => ({ value: String(item.id), label: item.title }))} error={importErrors.set_id}/>
                </section>
                <section className="pm-interview-import-section" aria-label="Step 2: Upload question file">
                    <div className="pm-interview-import-heading"><span className="pm-interview-import-step" aria-hidden="true">2</span><strong>Upload your questions</strong></div>
                    <input id="interview-import-file" type="file" className="pm-interview-import-input" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} aria-invalid={Boolean(importErrors.file) || undefined} aria-describedby="interview-import-file-hint" onChange={event => { chooseImportFile(event.currentTarget.files?.[0] ?? null); event.currentTarget.value = ''; }}/>
                    <label htmlFor="interview-import-file" className={`pm-interview-import-dropzone ${importDragging ? 'is-dragging' : ''} ${importFile ? 'has-file' : ''}`} onDragOver={event => { event.preventDefault(); if (!busy) setImportDragging(true); }} onDragLeave={() => setImportDragging(false)} onDrop={event => { event.preventDefault(); setImportDragging(false); if (!busy) chooseImportFile(event.dataTransfer.files?.[0] ?? null); }}>
                        {importFile ? <><CheckCircle2 size={24} aria-hidden="true"/><span className="pm-interview-import-file-name">{importFile.name}</span><span className="pm-interview-import-file-subtitle">Ready to import · {(importFile.size / 1024).toFixed(1)} KB · Click to change</span></> : <><UploadCloud size={25} aria-hidden="true"/><strong>Choose a file or drag it here</strong><span>CSV or Excel (.xlsx) · Maximum 5 MB</span></>}
                    </label>
                    {importFile && <button className="pm-interview-import-remove" type="button" onClick={() => chooseImportFile(null)} disabled={busy}><X size={15} aria-hidden="true"/> Remove selected file</button>}
                    {importErrors.file && <p className="pm-interview-admin-error" role="alert">{importErrors.file}</p>}
                    <p id="interview-import-file-hint" className="pm-interview-import-hint">Up to 500 questions per import. Existing questions will not be overwritten.</p>
                </section>
                <div className="pm-interview-import-template-row"><div><strong>Need the correct format?</strong><p>Use the template’s four columns. Question types must match active Master Data values.</p></div><a className="pm-admin-button pm-interview-admin-template" href={`${base}/questions/template`} download><Download size={17}/> Download template</a></div>
                {Object.entries(importErrors).filter(([key]) => key !== 'set_id' && key !== 'file').map(([key, value]) => <p className="pm-interview-admin-error" role="alert" key={key}>{value}</p>)}
                <footer><button type="button" disabled={busy} className="pm-admin-button" onClick={closeImport}>Cancel</button><button type="submit" disabled={busy || !importFile || !importSet} className="pm-admin-button pm-admin-button-primary"><UploadCloud size={17}/>{busy ? 'Importing…' : 'Import questions'}</button></footer>
            </form>
        </div></div>}
        {deleting && <div className="pm-interview-admin-modal-overlay"><div className="pm-interview-admin-modal pm-interview-admin-confirm" role="alertdialog" aria-modal="true" aria-label="Confirm delete">
            <header><div><h2>Delete {deleting.kind}?</h2><p>Only the selected item will be deleted.</p></div><button aria-label="Close delete dialog" type="button" disabled={busy} onClick={() => setDeleting(null)}><X size={20}/></button></header>
            <p className="pm-interview-admin-delete-label">{deleting.name}</p>
            <p className="pm-interview-admin-muted">This action cannot be undone. Used question types and non-empty question sets are protected. Existing interview sessions keep their original questions.</p>
            {deleteError && <p className="pm-interview-admin-error" role="alert">{deleteError}</p>}
            <footer><button type="button" className="pm-admin-button" disabled={busy} onClick={() => setDeleting(null)}>Cancel</button><button type="button" className="pm-admin-button pm-interview-admin-delete-confirm" disabled={busy} onClick={destroy}><Trash2 size={16}/>{busy ? 'Deleting…' : 'Delete'}</button></footer>
        </div></div>}
        {editor && <div className="pm-interview-admin-modal-overlay"><div className="pm-interview-admin-modal" role="dialog" aria-modal="true" aria-label={`Edit ${editor.kind}`}>
            <header><div><h2>{editor.id ? `Edit ${editor.kind}` : `Add ${editor.kind}`}</h2><p>{editor.id ? 'Change the fields you need and save.' : 'Enter the details for this new record.'}</p></div><button type="button" aria-label="Close dialog" disabled={busy} onClick={() => setEditor(null)}><X size={20}/></button></header>
            <form onSubmit={submit}>
                {editor.kind === 'option' && <>
                    <AdminChoice id="interview-option-group" contentClassName="pm-interview-admin-choice-content" label="Option group" disabled={Boolean(editor.id)} required value={String(form.group ?? '')} onChange={next => change('group', next)} options={groups.map(group => ({ value: group.key, label: group.name }))} />
                    <label className="pm-admin-field"><span>Value / key (cannot change after creation)</span><input disabled={Boolean(editor.id)} required maxLength={100} value={String(form.key ?? '')} onChange={event => change('key', event.target.value)} placeholder="e.g. energy, Junior PM, General"/>{errors.key && <small className="pm-interview-admin-error">{errors.key}</small>}</label>
                    <label className="pm-admin-field"><span>Display label</span><input required maxLength={150} value={String(form.label ?? '')} onChange={event => change('label', event.target.value)}/></label>
                </>}
                {editor.kind === 'set' && <>
                    <label className="pm-admin-field"><span>Set name</span><input required maxLength={180} value={String(form.title ?? '')} onChange={event => change('title', event.target.value)}/></label>
                    <label className="pm-admin-field"><span>Description</span><textarea rows={2} maxLength={500} value={String(form.description ?? '')} onChange={event => change('description', event.target.value)}/></label>
                    <div className="pm-interview-admin-grid">{optionSelect('Industry', 'industry', String(form.industry ?? ''))}{optionSelect('Role', 'role', String(form.role ?? ''))}{optionSelect('Experience', 'experience', String(form.experience ?? ''))}</div>
                </>}
                {editor.kind === 'question' && <>
                    <div className="pm-interview-admin-grid"><AdminChoice id="interview-question-set" contentClassName="pm-interview-admin-choice-content" label="Question set" required value={String(form.set_id ?? '')} onChange={next => change('set_id', Number(next))} options={sets.map(item => ({ value: String(item.id), label: item.title }))} error={errors.set_id}/>
                        <AdminChoice id="interview-question-type" contentClassName="pm-interview-admin-choice-content" label="Question type" required value={String(form.type ?? '')} onChange={next => change('type', next)} options={options.filter(item => item.group === 'type' && (item.is_active || item.key === form.type)).map(item => ({ value: item.key, label: `${item.label}${item.is_active ? '' : ' (inactive)'}` }))} error={errors.type}/></div>
                    <label className="pm-admin-field"><span>Interview question</span><textarea required rows={5} minLength={10} maxLength={4000} value={String(form.text ?? '')} onChange={event => change('text', event.target.value)} placeholder="Write a clear, realistic interview question"/><small>Optional placeholders: {'{role}'}, {'{industry}'}, {'{scenario}'}</small></label>
                </>}
                <div className="pm-interview-admin-grid"><label className="pm-admin-field"><span>Display order</span><input required type="number" min={0} max={65535} value={Number(form.sort_order ?? 0)} onChange={event => change('sort_order', Number(event.target.value))}/></label><label className="pm-interview-admin-checkbox"><input type="checkbox" checked={Boolean(form.is_active)} onChange={event => change('is_active', event.target.checked)}/><span>{editor.kind === 'set' ? 'Publish set' : 'Active / visible to members'}</span></label></div>
                {Object.entries(errors).map(([key, value]) => <p className="pm-interview-admin-error" role="alert" key={key}>{value}</p>)}
                <footer><button type="button" className="pm-admin-button" disabled={busy} onClick={() => setEditor(null)}>Cancel</button><button className="pm-admin-button pm-admin-button-primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save changes'}</button></footer>
            </form>
        </div></div>}
    </AdminLayout>;
}
