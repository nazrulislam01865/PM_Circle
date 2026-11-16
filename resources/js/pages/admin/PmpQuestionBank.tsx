import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Download, FileSpreadsheet, Plus, Save, Search, ShieldCheck, Upload, X } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';

type Settings = {
    enabled: boolean; full_question_count: number; full_duration_minutes: number;
    focused_question_count: number; focused_duration_minutes: number; shuffle_questions: boolean;
    sample_duration_seconds: number; sample_question_id: number | null;
    needs_improvement_below: number; target_below: number; above_target_from: number;
};
type OptionKey = 'A' | 'B' | 'C' | 'D';
type Question = {
    id?: number; code: string; domain: string; difficulty: string; prompt: string;
    options: Record<OptionKey, string>; correct_option: OptionKey;
    explanation: string; other_options: string; takeaway: string; concepts: string; references: string; is_active: boolean;
};
type Props = {
    settings: Settings;
    questions: { data: Question[]; links: { url: string | null; label: string; active: boolean }[]; total: number };
    stats: { total: number; active: number };
    filters: { search: string; domain: string; status: string };
};
const domains = ['People', 'Process', 'Business Environment'];
const optionKeys: OptionKey[] = ['A', 'B', 'C', 'D'];
const emptyQuestion = (): Question => ({
    code: '', domain: 'Process', difficulty: 'Moderate', prompt: '',
    options: { A: '', B: '', C: '', D: '' }, correct_option: 'A',
    explanation: '', other_options: '', takeaway: '', concepts: '', references: '', is_active: false,
});

export default function PmpQuestionBank({ settings, questions, stats, filters }: Props) {
    const [tab, setTab] = useState<'bank' | 'settings'>('bank');
    const [rules, setRules] = useState(settings);
    const [question, setQuestion] = useState<Question | null>(null);
    const [query, setQuery] = useState(filters);
    const [file, setFile] = useState<File | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [fileMessage, setFileMessage] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const chooseImportFile = (selected: File | null) => {
        setFileMessage('');
        setErrors(current => { if (!current.file) return current; const rest = { ...current }; delete rest.file; return rest; });
        if (!selected) { setFile(null); return; }
        const extension = selected.name.toLowerCase().split('.').pop();
        if (!['xlsx', 'csv'].includes(extension ?? '')) {
            setFile(null); setFileMessage('Choose an Excel (.xlsx) or CSV (.csv) file.');
            if (fileInput.current) fileInput.current.value = '';
            return;
        }
        if (selected.size > 5 * 1024 * 1024) {
            setFile(null); setFileMessage('The maximum file size is 5 MB.');
            if (fileInput.current) fileInput.current.value = '';
            return;
        }
        setFile(selected);
    };
    useEffect(() => {
        if (question) document.getElementById('pmp-question-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [question?.id]);
    const { flash } = usePage<{ flash?: { status?: string } }>().props;
    const otherErrors = Object.entries(errors).filter(([key]) => key !== 'file').map(([, message]) => message);
    const saveSettings = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); if (busy) return;
        setBusy(true); setErrors({});
        router.put('/admin/exam-simulator/pmp/settings', rules, {
            preserveScroll: true, onError: setErrors, onFinish: () => setBusy(false),
        });
    };
    const saveQuestion = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); if (!question || busy) return;
        setBusy(true); setErrors({});
        const url = question.id ? `/admin/exam-simulator/pmp/questions/${question.id}` : '/admin/exam-simulator/pmp/questions';
        const options = { preserveScroll: true, onSuccess: () => setQuestion(null), onError: setErrors, onFinish: () => setBusy(false) };
        if (question.id) router.put(url, question, options);
        else router.post(url, question, options);
    };
    const importQuestions = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); if (!file || busy) return;
        setBusy(true); setErrors({});
        router.post('/admin/exam-simulator/pmp/questions/import', { file }, {
            forceFormData: true, preserveScroll: true,
            onSuccess: () => { setFile(null); setFileMessage(''); if (fileInput.current) fileInput.current.value = ''; },
            onError: setErrors, onFinish: () => setBusy(false),
        });
    };
    const updateRules = (key: keyof Settings, value: Settings[keyof Settings]) => setRules(current => ({ ...current, [key]: value }));
    const updateQuestion = (key: keyof Question, value: Question[keyof Question]) => setQuestion(current => current ? { ...current, [key]: value } : null);
    const filterQuestions = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); router.get('/admin/exam-simulator/pmp/questions', query, { preserveState: true, preserveScroll: true });
    };
    const switchActive = (item: Question) => router.patch(`/admin/exam-simulator/pmp/questions/${item.id}/status`, {
        is_active: !item.is_active,
    }, { preserveScroll: true });

    return <AdminLayout active="/admin/exam-simulator/pmp/questions" title="PMP exam management"
        subtitle="Manage the question bank, Excel/CSV imports, and simulator rules without modifying ongoing attempts.">
        <Head title="PMP exam management | PM Circle"/>
        {flash?.status && <p className="pm-admin-notice pm-admin-notice-success" role="status"><CheckCircle2 size={17}/>{flash.status}</p>}
        {otherErrors.length > 0 && <div className="pm-admin-notice pm-admin-notice-error" role="alert"><AlertCircle size={18}/><span>{otherErrors.join(' ')}</span></div>}
        <div className="pm-admin-stats">
            <article className="pm-admin-panel pm-admin-stat"><span>Questions</span><strong className="pm-admin-stat-number">{stats.total}</strong></article>
            <article className="pm-admin-panel pm-admin-stat"><span>Active questions</span><strong className="pm-admin-stat-number">{stats.active}</strong></article>
        </div>
        <nav className="pm-pmp-bank-tabs" aria-label="PMP administration">
            <button type="button" className={tab === 'bank' ? 'is-active' : ''} onClick={() => setTab('bank')}>Question bank and import</button>
            <button type="button" className={tab === 'settings' ? 'is-active' : ''} onClick={() => setTab('settings')}>Exam settings</button>
        </nav>
        {tab === 'settings' ? <section className="pm-admin-panel pm-pmp-bank-panel">
            <h2>Exam configuration</h2>
            <p className="pm-pmp-bank-description">Changes apply to newly started exams. Completed and ongoing attempts retain their original question IDs, timer and scoring thresholds.</p>
            <form className="pm-pmp-bank-form" onSubmit={saveSettings}>
                <label className="pm-pmp-bank-checkbox"><input type="checkbox" checked={rules.enabled} onChange={e => updateRules('enabled', e.target.checked)}/> Allow members to start new PMP exams</label>
                <div className="pm-admin-field-grid">
                    {([['full_question_count', 'Full mock questions (1–180)', 1, 180], ['full_duration_minutes', 'Full mock duration (minutes)', 1, 480],
                        ['focused_question_count', 'Focused practice questions', 1, 100], ['focused_duration_minutes', 'Focused practice duration (minutes)', 1, 240],
                        ['sample_duration_seconds', 'Public sample duration (seconds)', 30, 900],
                        ['needs_improvement_below', 'Needs improvement below (%)', 1, 97],
                        ['target_below', 'Practice target starts at (%)', 2, 98],
                        ['above_target_from', 'Above target starts at (%)', 3, 99]] as const).map(([key, label, min, max]) =>
                        <label className="pm-admin-field" key={key}><span>{label}</span><input type="number" required min={min} max={max} step={1} value={rules[key]}
                            onChange={e => updateRules(key, Number(e.target.value))}/></label>)}
                    <label className="pm-admin-field"><span>Public sample question ID (optional)</span><input type="number" min={1} value={rules.sample_question_id ?? ''}
                        placeholder="Use built-in sample" onChange={e => updateRules('sample_question_id', e.target.value ? Number(e.target.value) : null)}/></label>
                </div>
                <label className="pm-pmp-bank-checkbox"><input type="checkbox" checked={rules.shuffle_questions} onChange={e => updateRules('shuffle_questions', e.target.checked)}/> Rotate and shuffle questions for new attempts</label>
                <p className="pm-pmp-bank-description">If fewer active full-mock questions exist than requested, the full exam uses the available count and a proportionally shorter duration (minimum 10 minutes). Readiness thresholds must increase in order; these are educational labels, not official PMP results.</p>
                <button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={busy}><Save size={17}/>{busy ? 'Saving…' : 'Save exam settings'}</button>
            </form>
        </section> : <>
            <section className="pm-admin-panel pm-pmp-bank-panel">
                <div className="pm-pmp-bank-heading"><div><h2>Import questions</h2><p>Import up to 1,000 questions in one batch. All rows are validated before any are saved.</p></div>
                    <a className="pm-admin-button pm-admin-button-quiet" href="/admin/exam-simulator/pmp/questions/template"><Download size={17}/> Download Excel template</a></div>
                <form onSubmit={importQuestions} className="pm-pmp-bank-import" noValidate>
                    <span className="pm-pmp-import-label" id="pmp-import-label">Question file (Excel .xlsx or CSV .csv)</span>
                    <div className="pm-pmp-import-picker">
                        <label className="pm-pmp-import-choose" htmlFor="pmp-import-file">
                            <FileSpreadsheet size={19} aria-hidden="true"/>
                            <span>Choose file</span>
                        </label>
                        <input id="pmp-import-file" ref={fileInput} className="pm-pmp-import-input" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            aria-labelledby="pmp-import-label" aria-describedby="pmp-import-guidance pmp-import-error" required
                            onChange={e => chooseImportFile(e.target.files?.[0] ?? null)}/>
                        <span className={`pm-pmp-import-filename${file ? ' is-selected' : ''}`} title={file?.name ?? ''}>{file?.name ?? 'No file selected'}</span>
                        {file && <button type="button" className="pm-pmp-import-remove" aria-label="Remove selected file" onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ''; }}><X size={17}/></button>}
                    </div>
                    <button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={!file || busy}>
                        <Upload size={17} aria-hidden="true"/>{busy ? 'Importing…' : 'Import questions'}
                    </button>
                    <span id="pmp-import-guidance" className="pm-pmp-import-hint">Maximum 5 MB · Up to 1,000 questions · Replace the example row in the downloaded Excel template.</span>
                    {(fileMessage || errors.file) && <span id="pmp-import-error" className="pm-pmp-import-error" role="alert">{fileMessage || errors.file}</span>}
                </form>
                <p className="pm-pmp-bank-description"><ShieldCheck size={16} aria-hidden="true"/> Upload only Excel (.xlsx) or CSV (.csv). The first worksheet must use the downloaded column headers. All rows are checked before insertion; duplicate question codes are rejected to protect previous exam results.</p>
            </section>
            <section className="pm-admin-panel pm-pmp-bank-panel">
                <div className="pm-pmp-bank-heading"><div><h2>Question bank</h2><p>Review imported answers and explanations before making a question active.</p></div>
                    <button type="button" className="pm-admin-button pm-admin-button-primary" onClick={() => { setErrors({}); setQuestion(emptyQuestion()); }}><Plus size={17}/> Add question</button></div>
                <form onSubmit={filterQuestions} className="pm-pmp-bank-filters">
                    <label className="pm-admin-field"><span>Search code or question</span><input value={query.search} onChange={e => setQuery(s => ({ ...s, search: e.target.value }))} placeholder="Search the question bank"/></label>
                    <label className="pm-admin-field"><span>Domain</span><select value={query.domain} onChange={e => setQuery(s => ({ ...s, domain: e.target.value }))}><option value="">All domains</option>{domains.map(d => <option key={d}>{d}</option>)}</select></label>
                    <label className="pm-admin-field"><span>Status</span><select value={query.status} onChange={e => setQuery(s => ({ ...s, status: e.target.value }))}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
                    <button type="submit" className="pm-admin-button pm-admin-button-quiet"><Search size={16}/> Filter</button>
                </form>
                <div className="pm-pmp-bank-table-wrap"><table className="pm-pmp-bank-table"><thead><tr><th>Question</th><th>Domain</th><th>Correct</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                    {questions.data.map(item => <tr key={item.id}><td><strong>{item.code}</strong><small>{item.prompt}</small></td><td>{item.domain}<small>{item.difficulty}</small></td><td>{item.correct_option}</td>
                        <td><span className={`pm-pmp-bank-status ${item.is_active ? 'is-active' : ''}`}>{item.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td><div className="pm-pmp-bank-row-actions"><button type="button" className="pm-admin-button pm-admin-button-quiet" onClick={() => { setErrors({}); setQuestion({ ...item, options: { ...item.options } }); }}>Edit</button>
                            <button type="button" className="pm-admin-button pm-admin-button-quiet" onClick={() => switchActive(item)}>{item.is_active ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}
                    </tbody></table>{questions.data.length === 0 && <p className="pm-pmp-bank-description">No questions match your filters.</p>}</div>
                <nav className="pm-pmp-bank-pagination" aria-label="Question pages">{questions.links.map((link, index) => link.url ? <Link key={index} href={link.url} preserveScroll preserveState
                    aria-current={link.active ? 'page' : undefined} className={link.active ? 'is-active' : ''}>{link.label.replace(/&laquo;|&raquo;/g, '').trim() || 'Page'}</Link>
                    : <span key={index}>{link.label.replace(/&laquo;|&raquo;/g, '').trim() || 'Page'}</span>)}</nav>
            </section>
        </>}
        {question && <section id="pmp-question-editor" className="pm-admin-panel pm-pmp-bank-panel" aria-label="Question editor">
            <div className="pm-pmp-bank-heading"><div><h2>{question.id ? `Edit ${question.code}` : 'New PMP question'}</h2><p>Questions already used in exams cannot be edited. Deactivate them and add a new version instead.</p></div>
                <button type="button" className="pm-admin-button pm-admin-button-quiet" onClick={() => setQuestion(null)}>Close editor</button></div>
            <form className="pm-pmp-bank-form" onSubmit={saveQuestion}>
                <div className="pm-admin-field-grid">
                    <label className="pm-admin-field"><span>Unique code</span><input required maxLength={70} value={question.code} onChange={e => updateQuestion('code', e.target.value)}/></label>
                    <label className="pm-admin-field"><span>Domain</span><select value={question.domain} onChange={e => updateQuestion('domain', e.target.value)}>{domains.map(d => <option key={d}>{d}</option>)}</select></label>
                    <label className="pm-admin-field"><span>Difficulty</span><select value={question.difficulty} onChange={e => updateQuestion('difficulty', e.target.value)}>{['Easy','Moderate','Hard'].map(d => <option key={d}>{d}</option>)}</select></label>
                    <label className="pm-admin-field"><span>Correct answer</span><select value={question.correct_option} onChange={e => updateQuestion('correct_option', e.target.value as OptionKey)}>{optionKeys.map(key => <option key={key}>{key}</option>)}</select></label>
                </div>
                <label className="pm-admin-field"><span>Question</span><textarea required rows={3} maxLength={10000} value={question.prompt} onChange={e => updateQuestion('prompt', e.target.value)}/></label>
                <div className="pm-admin-field-grid">{optionKeys.map(key => <label className="pm-admin-field" key={key}><span>Option {key}</span><textarea required rows={2} maxLength={3000} value={question.options[key]}
                    onChange={e => setQuestion(old => old ? { ...old, options: { ...old.options, [key]: e.target.value } } : null)}/></label>)}</div>
                {([['explanation', 'Explanation (optional)'], ['other_options', 'Why other options are incorrect (optional)'], ['takeaway','Takeaway (optional)'], ['concepts','Concepts (optional)'], ['references','References (optional)']] as const).map(([key, label]) =>
                    <label className="pm-admin-field" key={key}><span>{label}</span><textarea rows={2} value={question[key] ?? ''} onChange={e => updateQuestion(key, e.target.value)}/></label>)}
                <label className="pm-pmp-bank-checkbox"><input type="checkbox" checked={question.is_active} onChange={e => updateQuestion('is_active', e.target.checked)}/> Active for new attempts</label>
                <button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={busy}><BookOpen size={17}/>{busy ? 'Saving…' : 'Save question'}</button>
            </form>
        </section>}
    </AdminLayout>;
}
