import { forwardRef, type DragEvent, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Check, CheckSquare2, ChevronDown, Eye, FileText, Info, RefreshCw, Trash2, Upload } from 'lucide-react';

export type ImportComparison = {
    field_key: string;
    field: string;
    current_value: string;
    imported_value: string;
    default_action: 'replace' | 'merge' | 'keep';
    actions: Array<'replace' | 'merge' | 'keep'>;
    selected: boolean;
    unchanged?: boolean;
    suggested_label?: string;
    notice?: string | null;
};

export type ResumeRecord = {
    id: number;
    original_name: string;
    file_size: number;
    file_size_formatted: string;
    updated_at: string;
    mime_type: string;
};

export type ResumeImportState = {
    id: number | null;
    status: 'empty' | 'processing' | 'ready' | 'applied' | 'failed' | 'cancelled';
    step: number;
    filename: string | null;
    comparisons: ImportComparison[];
    warnings: string[];
    history: Array<{ id: number; date: string; filename: string; fields_updated: number; status: string }>;
};

export type ResumeImportsHandle = { apply: () => void };

type Props = {
    resume: ResumeRecord | null;
    importData: ResumeImportState;
    linkedInUrl: string;
    employerVisibility: boolean;
    canImportLinkedIn: boolean;
};

type ImportAction = 'replace' | 'merge' | 'keep';

const recommendedAction = (row: ImportComparison): ImportAction =>
    row.actions.find((action) => action !== 'keep') ?? 'keep';

const actionDescription = (row: ImportComparison): string => {
    if (row.unchanged) return 'Keep existing';
    return row.suggested_label ?? (row.default_action === 'merge' ? 'Add / merge' : 'Replace');
};

export const ResumeImportsTab = forwardRef<ResumeImportsHandle, Props>(function ResumeImportsTab(
    { resume, importData, linkedInUrl, employerVisibility, canImportLinkedIn }, ref,
) {
    const inputRef = useRef<HTMLInputElement>(null);
    const linkedInInputRef = useRef<HTMLInputElement>(null);
    const exportInputRef = useRef<HTMLInputElement>(null);
    const [link, setLink] = useState(linkedInUrl);
    const [visibility, setVisibility] = useState(employerVisibility);
    const [working, setWorking] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [canRetry, setCanRetry] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [decisions, setDecisions] = useState<Record<string, ImportAction>>({});
    const [markedFields, setMarkedFields] = useState<string[]>([]);

    useEffect(() => {
        setDecisions(Object.fromEntries(importData.comparisons.map((row) => [row.field_key, row.selected && !row.unchanged ? recommendedAction(row) : 'keep'])));
        setMarkedFields([]);
    }, [importData.id, importData.status, importData.comparisons]);

    useEffect(() => {
        setStatusError(null);
        setCanRetry(false);
        if (!importData.id || importData.status !== 'processing') return;
        let stopped = false;
        let busy = false;
        const poll = async () => {
            if (busy || stopped) return;
            busy = true;
            try {
                const response = await fetch(`/settings/profile/import/${importData.id}/status`, {
                    headers: { Accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store',
                });
                if (stopped) return;
                if (response.status === 401 || response.status === 419 || response.redirected) {
                    setStatusError('Your session needs refreshing. Sign in again to check the import.');
                    stopped = true;
                    return;
                }
                if (!response.ok) {
                    setStatusError('Unable to check the resume processing status. Please refresh this page.');
                    return;
                }
                const data: { status?: string; stalled?: boolean; can_retry?: boolean } = await response.json();
                if (stopped) return;
                if (data.status && data.status !== 'processing') {
                    stopped = true;
                    router.reload({ only: ['profileData'] });
                    return;
                }
                if (data.stalled) {
                    setStatusError('Processing is taking longer than expected. Check that the resume worker is running, then retry this file.');
                    setCanRetry(Boolean(data.can_retry));
                } else {
                    setStatusError(null);
                    setCanRetry(false);
                }
            } catch {
                if (!stopped) setStatusError('Unable to reach the resume processing service. Please check your connection and refresh.');
            } finally {
                busy = false;
            }
        };
        const interval = window.setInterval(() => { void poll(); }, 3500);
        void poll();
        return () => { stopped = true; window.clearInterval(interval); };
    }, [importData.id, importData.status]);

    const selectedCount = useMemo(() => Object.values(decisions).filter((action) => action !== 'keep').length, [decisions]);
    const selectableRows = useMemo(() => importData.comparisons.filter((row) => !row.unchanged), [importData.comparisons]);
    const allMarked = selectableRows.length > 0 && selectableRows.every((row) => markedFields.includes(row.field_key));
    const editable = importData.status === 'ready' && selectedCount > 0 && !working;

    const apply = () => {
        if (!editable || !importData.id) return;
        setWorking(true);
        setError(null);
        router.post('/settings/profile/import/apply', { import_id: importData.id, decisions }, {
            preserveScroll: true,
            onError: (messages) => setError(Object.values(messages)[0] ?? 'Unable to apply these changes.'),
            onFinish: () => setWorking(false),
        });
    };
    useImperativeHandle(ref, () => ({ apply }), [editable, importData.id, decisions]);

    const upload = (file?: File, source = 'resume') => {
        if (!file) return;
        if (source === 'linkedin_export' && !canImportLinkedIn) {
            setError('LinkedIn export imports require Plus or Pro membership.');
            return;
        }
        if (!/\.(pdf|docx)$/i.test(file.name) || file.size > 5 * 1024 * 1024) {
            setError('Choose a PDF or DOCX smaller than 5 MB.');
            return;
        }
        setError(null);
        setUploadProgress(0);
        setWorking(true);
        const payload = new FormData();
        payload.append('resume', file);
        payload.append('source', source);
        router.post('/settings/profile/resume', payload, {
            forceFormData: true,
            preserveScroll: true,
            onProgress: (progress) => setUploadProgress(progress?.percentage ?? 0),
            onError: (messages) => setError(Object.values(messages)[0] ?? 'Upload failed.'),
            onFinish: () => { setWorking(false); setUploadProgress(null); },
        });
    };

    const saveLinkedIn = () => {
        if (working) return;
        setWorking(true);
        setError(null);
        router.patch('/settings/profile', { linkedin_url: link.trim(), tab: 'imports' }, {
            preserveScroll: true,
            onError: (messages) => setError(Object.values(messages)[0] ?? 'Unable to save LinkedIn URL.'),
            onFinish: () => setWorking(false),
        });
    };

    const setAll = (checked: boolean) => {
        setMarkedFields(checked ? selectableRows.map((row) => row.field_key) : []);
        setDecisions(Object.fromEntries(importData.comparisons.map((row) => [row.field_key, checked && !row.unchanged ? recommendedAction(row) : 'keep'])));
    };

    // The first column is the prototype's optional bulk-selection control.
    // The action checkbox is the actual approval submitted to Laravel.
    const markField = (row: ImportComparison, checked: boolean) => {
        setMarkedFields((current) => checked ? [...new Set([...current, row.field_key])] : current.filter((key) => key !== row.field_key));
        setDecisions((current) => ({ ...current, [row.field_key]: checked ? recommendedAction(row) : 'keep' }));
    };

    const toggleAction = (row: ImportComparison, checked: boolean) => {
        setDecisions((current) => ({ ...current, [row.field_key]: checked ? recommendedAction(row) : 'keep' }));
        setMarkedFields((current) => checked ? [...new Set([...current, row.field_key])] : current.filter((key) => key !== row.field_key));
    };

    const retryImport = () => {
        if (!importData.id || working) return;
        setWorking(true);
        setError(null);
        setStatusError(null);
        router.post(`/settings/profile/import/${importData.id}/retry`, {}, {
            preserveScroll: true,
            onError: (messages) => setError(Object.values(messages)[0] ?? 'Unable to restart analysis.'),
            onFinish: () => setWorking(false),
        });
    };

    const cancelImport = () => {
        if (!importData.id || working) return;
        setWorking(true);
        setError(null);
        router.post('/settings/profile/import/cancel', { import_id: importData.id }, {
            preserveScroll: true,
            onError: (messages) => setError(Object.values(messages)[0] ?? 'Unable to cancel this import.'),
            onFinish: () => setWorking(false),
        });
    };

    const uploadZoneProps = {
        onDragOver: (event: DragEvent<HTMLButtonElement>) => event.preventDefault(),
        onDrop: (event: DragEvent<HTMLButtonElement>) => {
            event.preventDefault();
            upload(event.dataTransfer.files[0]);
        },
    };

    return <section className="pm-resume-imports" aria-label="Resume and imports">
        <div className="pm-resume-heading">
            <h2>Resume & imports</h2>
            <p>Build your profile from your documents. Review every change before applying.</p>
        </div>

        {error && <p className="pm-resume-alert pm-resume-alert-error" role="alert">{error}</p>}

        <div className="pm-resume-source-grid">
            <section className="pm-resume-panel" aria-labelledby="resume-upload-title">
                <header className="pm-resume-panel-heading">
                    <h3 id="resume-upload-title"><FileText size={20} /> Upload a resume</h3>
                    <span className="pm-resume-muted">Available to all members</span>
                </header>
                <input ref={inputRef} type="file" accept=".pdf,.docx" className="pm-resume-visually-hidden"
                    aria-label="Choose a PDF or DOCX resume" onChange={(event) => { upload(event.target.files?.[0]); event.currentTarget.value = ''; }} />
                <button type="button" className="pm-resume-dropzone" onClick={() => inputRef.current?.click()} disabled={working} {...uploadZoneProps}>
                    <FileText size={30} aria-hidden="true" />
                    <span>PDF or Word (.docx) up to 5 MB</span>
                    <span className="pm-resume-choose">Choose file</span>
                    {uploadProgress !== null && <span role="status">Uploading {uploadProgress}%</span>}
                </button>
                {resume && <div className="pm-resume-file-row">
                    <span className="pm-resume-file-badge"><FileText size={22} /></span>
                    <span className="pm-resume-file-details"><strong>{resume.original_name}</strong><small>{resume.file_size_formatted}</small></span>
                    <span className="pm-resume-file-actions">
                        <a href={`/settings/profile/resume/${resume.id}/preview`} target="_blank" rel="noreferrer" title="Preview resume"><Eye size={16} /> Preview</a>
                        <button type="button" onClick={() => inputRef.current?.click()} disabled={working}><RefreshCw size={16} /> Replace</button>
                        <button type="button" className="pm-resume-danger" onClick={() => {
                            if (!window.confirm('Remove this uploaded resume?')) return;
                            router.delete(`/settings/profile/resume/${resume.id}`, { preserveScroll: true });
                        }}><Trash2 size={16} /> Remove</button>
                    </span>
                </div>}
            </section>

            <section className="pm-resume-panel" aria-labelledby="linkedin-import-title">
                <header className="pm-resume-panel-heading">
                    <h3 id="linkedin-import-title"><span className="pm-resume-linkedin-mark">in</span> Import from LinkedIn</h3>
                    <span className="pm-resume-plan-tag">Plus & Pro</span>
                </header>
                <div className="pm-resume-field">
                    <label htmlFor="pm-resume-linkedin">LinkedIn profile URL</label>
                    <input id="pm-resume-linkedin" type="url" ref={linkedInInputRef} value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://linkedin.com/in/your-name" />
                </div>
                <button type="button" className="pm-btn pm-btn-primary pm-resume-full-btn" onClick={saveLinkedIn} disabled={working}>Save LinkedIn link</button>
                <div className="pm-resume-or"><span>or</span></div>
                <input type="file" accept=".pdf,.docx" className="pm-resume-visually-hidden" aria-label="Upload LinkedIn profile export"
                    ref={exportInputRef} onChange={(event) => { upload(event.target.files?.[0], 'linkedin_export'); event.currentTarget.value = ''; }} />
                <button type="button" className="pm-btn pm-btn-secondary pm-resume-full-btn" onClick={() => exportInputRef.current?.click()} disabled={working || !canImportLinkedIn}>
                    <Upload size={18} /> Upload your LinkedIn profile PDF or data export
                </button>
                <p className="pm-resume-info"><Info size={15} /> {canImportLinkedIn ? 'File import, not automatic LinkedIn sync.' : 'Upgrade to Plus or Pro to import a LinkedIn export.'}</p>
            </section>
        </div>

        <section className="pm-resume-panel pm-resume-review" aria-labelledby="pm-resume-review-title">
            <div className="pm-resume-stepper" aria-label="Import progress">
                {['Upload', 'Review', 'Apply'].map((step, index) => <div key={step} className={`pm-resume-step ${index + 1 === importData.step ? 'is-current' : ''} ${index + 1 < importData.step ? 'is-complete' : ''}`}>
                    <span>{index + 1 < importData.step ? <Check size={16} /> : index + 1}</span><strong>{step}</strong>
                    {index < 2 && <i className="pm-resume-step-line" aria-hidden="true" />}
                </div>)}
            </div>
            <h3 id="pm-resume-review-title">Review extracted information</h3>
            <div className="pm-resume-source-line">
                <p className="pm-resume-muted">{importData.filename ? `Source: ${importData.filename}` : 'Upload a PDF or DOCX to see extracted information.'}</p>
                {importData.status === 'ready' && importData.comparisons.length > 0 && <span className="pm-resume-source-notice">Some details may need correction.</span>}
            </div>
            {importData.status === 'processing' && <div role="status">
                <p className="pm-resume-alert">Analysing your resume. The review will appear here when processing finishes.</p>
                {statusError && <p className="pm-resume-alert pm-resume-alert-warning">{statusError}</p>}
                {canRetry && <button type="button" className="pm-btn pm-btn-secondary" disabled={working} onClick={retryImport}>Retry analysis</button>}
            </div>}
            {importData.status === 'failed' && <div className="pm-resume-alert pm-resume-alert-error" role="alert">
                <p>{importData.warnings[0] ?? 'Unable to extract text from this document.'}</p>
                <button type="button" className="pm-btn pm-btn-secondary" disabled={working} onClick={retryImport}>Retry analysis</button>
            </div>}
            {importData.status === 'empty' && <p className="pm-resume-empty">No document reviewed yet. Your existing profile information will not change until you approve an import.</p>}
            {importData.status === 'cancelled' && <p className="pm-resume-empty">Import cancelled. Your uploaded file is still private and available for a new review.</p>}
            {importData.status === 'applied' && <p className="pm-resume-alert" role="status">The last selected updates were applied. Upload a new document to review more information.</p>}
            {importData.status === 'ready' && <>
                {importData.warnings.map((warning) => <p className="pm-resume-alert" key={warning}>{warning}</p>)}
                {importData.comparisons.length ? <>
                    <div className="pm-resume-table-scroller"><table className="pm-resume-table">
                        <colgroup><col className="pm-resume-col-bulk" /><col className="pm-resume-col-field" /><col className="pm-resume-col-current" /><col className="pm-resume-col-imported" /><col className="pm-resume-col-action" /></colgroup>
                        <thead><tr>
                            <th scope="col"><input aria-label="Mark all fields for bulk selection" type="checkbox" checked={allMarked} onChange={(event) => setAll(event.target.checked)} disabled={!selectableRows.length} /></th>
                            <th scope="col">Field</th><th scope="col">Current profile</th><th scope="col">Imported value</th><th scope="col">Action</th>
                        </tr></thead>
                        <tbody>{importData.comparisons.map((row) => {
                            const enabled = decisions[row.field_key] !== 'keep' && !row.unchanged;
                            const label = actionDescription(row);
                            return <tr key={row.field_key}>
                                <td><input type="checkbox" aria-label={`Mark ${row.field} for bulk selection`} checked={markedFields.includes(row.field_key)} disabled={!!row.unchanged} onChange={(event) => markField(row, event.target.checked)} /></td>
                                <th scope="row">{row.field}</th><td>{row.current_value}</td>
                                <td>{row.imported_value}{row.notice && <small className="pm-resume-warning">{row.notice}</small>}</td>
                                <td><label className="pm-resume-action-choice">
                                    <input type="checkbox" aria-label={`${label} for ${row.field}`} checked={enabled} disabled={!!row.unchanged || working} onChange={(event) => toggleAction(row, event.target.checked)} />
                                    <span>{label}</span>
                                    <span className="pm-resume-action-hint" title={row.notice || (row.unchanged ? 'The extracted value already matches your profile.' : 'Only checked actions will update your profile.')} aria-label={row.notice || (row.unchanged ? 'Already on your profile' : 'Only selected updates will be applied')}><Info size={14} aria-hidden="true" /></span>
                                </label></td>
                            </tr>;
                        })}</tbody>
                    </table></div>
                    <p className="pm-resume-alert pm-resume-alert-warning"><Info size={17} /> Certification details remain self-reported. Missing fields will not erase existing information.</p>
                    <div className="pm-resume-apply-row">
                        <label className="pm-resume-bulk-select"><input type="checkbox" checked={allMarked} onChange={(event) => setAll(event.target.checked)} disabled={!selectableRows.length} /> Select all new fields</label>
                        <span className="pm-resume-muted pm-resume-preserve-note"><CheckSquare2 size={18} /> Keep existing data (recommended)</span>
                        <div className="pm-resume-review-buttons">
                            <button type="button" className="pm-btn pm-btn-secondary" disabled={working} onClick={cancelImport}>Cancel import</button>
                            <button type="button" className="pm-btn pm-btn-primary" disabled={!editable} onClick={apply}>Apply {selectedCount} selected updates</button>
                        </div>
                    </div>
                </> : <p className="pm-resume-empty">No structured fields could be confidently extracted. Nothing will be applied to your profile.</p>}
            </>}
        </section>

        <div className="pm-resume-bottom-grid">
            <section className="pm-resume-panel" aria-labelledby="pm-resume-your-title">
                <header className="pm-resume-panel-heading"><h3 id="pm-resume-your-title"><FileText size={20} /> Your resume</h3></header>
                <div className="pm-resume-document-tools">
                    <span className="pm-resume-document-icon" aria-hidden="true"><FileText size={23} /></span>
                    <div className="pm-resume-file-details"><strong>{resume?.original_name ?? 'No resume uploaded'}</strong><small>{resume ? `Updated ${resume.updated_at} · ${resume.file_size_formatted}` : 'Private by default'}</small></div>
                    <div className="pm-resume-file-actions">
                        <a href="/settings/profile/resume/export?format=pdf" target="_blank" rel="noreferrer" title="Print or save as PDF"><FileText size={16} /> Download PDF</a>
                        <a href="/settings/profile/resume/export?format=word"><FileText size={16} /> Download Word</a>
                        <a href="/settings/profile/resume/export?format=word"><RefreshCw size={16} /> Generate from profile</a>
                    </div>
                </div>
                <label className="pm-resume-visibility"><input type="checkbox" role="switch" checked={visibility} onChange={(event) => {
                    const next = event.target.checked;
                    setVisibility(next);
                    router.patch('/settings/profile', { resume_employer_visibility: next, tab: 'imports' }, {
                        preserveScroll: true, onError: () => setVisibility(!next),
                    });
                }} /> Allow employers to view my resume</label>
                <p className="pm-resume-muted">Your resume is private by default. You can change this anytime.</p>
            </section>
            <aside className="pm-resume-panel" aria-labelledby="pm-resume-about-title">
                <header className="pm-resume-panel-heading"><h3 id="pm-resume-about-title"><Info size={20} /> About imports</h3></header>
                <ul className="pm-resume-about-list">
                    {['Your files are private and used only to suggest updates.', 'Importing does not publish to your profile.', 'Review every change before applying.', 'Re-import anytime to preview new changes.', 'Only selected updates will be applied.'].map((item) => <li key={item}><Check size={17} /> {item}</li>)}
                </ul>
            </aside>
            <div className="pm-resume-history pm-resume-panel">
                <button type="button" onClick={() => setHistoryOpen((old) => !old)} aria-expanded={historyOpen}>
                    <RefreshCw size={17} /> Import history ({importData.history.length}) <ChevronDown size={17} className={historyOpen ? 'is-up' : ''} />
                </button>
                {historyOpen && <ul>{importData.history.map((item) => <li key={item.id}><span><strong>{item.filename}</strong><small>{item.date}</small></span><span>{item.status} · {item.fields_updated} updates</span></li>)}</ul>}
            </div>
        </div>
    </section>;
});
