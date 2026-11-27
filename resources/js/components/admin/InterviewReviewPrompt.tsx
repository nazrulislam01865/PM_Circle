import { Link } from '@inertiajs/react';
import { Settings2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Prompt = { version: number; template: string; evaluation_reference: string };

/** Uses the same versioned prompt store and permissions as the central AI gateway. */
export function InterviewReviewPrompt() {
    const [prompt, setPrompt] = useState<Prompt | null>(null);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const load = async () => {
        if (busy) return;
        setBusy(true); setErrors({}); setNotice('');
        try {
            const response = await fetch('/admin/ai/prompts/interview_answer_review', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
            if (!response.ok) throw new Error(response.status === 403 ? 'Prompt editing requires the existing AI prompt-management permission.' : 'Unable to load the active prompt.');
            setPrompt(await response.json()); setReason('');
        } catch (e) { setErrors({ request: e instanceof Error ? e.message : 'Unable to load the prompt.' }); }
        finally { setBusy(false); }
    };
    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!prompt || busy) return;
        setBusy(true); setErrors({}); setNotice('');
        try {
            const response = await fetch('/admin/ai/prompts', { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '' }, body: JSON.stringify({ feature: 'interview_answer_review', template: prompt.template, evaluation_reference: prompt.evaluation_reference, reason, activate: true, expected_version: prompt.version }) });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (result.errors) { setErrors(Object.fromEntries(Object.entries(result.errors).map(([key, value]) => [key, Array.isArray(value) ? String(value[0]) : String(value)]))); return; }
                throw new Error(result.message ?? 'Unable to publish the prompt.');
            }
            setPrompt(old => old ? { ...old, version: result.version } : old); setReason(''); setNotice(`Prompt version ${result.version} is now active for new AI review requests.`);
        } catch (e) { setErrors({ request: e instanceof Error ? e.message : 'Unable to publish the prompt.' }); }
        finally { setBusy(false); }
    };
    const error = (key: string) => errors[key] && <small role="alert" className="pm-admin-error">{errors[key]}</small>;
    return <section className="pm-admin-panel">
        <div className="pm-interview-admin-title"><div><h2>AI answer review</h2><p>Configure the provider, model, credential assignment, availability and credit tariff in the existing AI Workspace. Local practice scores remain deterministic.</p></div><Link className="pm-admin-button" href="/admin/ai/workspace/features"><Settings2 size={17}/> AI Workspace</Link></div>
        <div className="pm-interview-admin-title"><div><h3>Review instructions</h3><p>Publish a new prompt version without changing the AI route, credit tariff or safety rules.</p></div><button type="button" className="pm-admin-button" disabled={busy} onClick={() => void load()}>{prompt ? 'Reload active prompt' : 'Edit review prompt'}</button></div>
        {prompt && <form noValidate onSubmit={save} className="pm-interview-config">
            <p className="pm-interview-admin-muted">Active version: {prompt.version}</p>
            <label className="pm-admin-field"><span>Prompt instructions <span className="pm-admin-error pm-interview-required">*</span></span><textarea required rows={8} maxLength={12000} aria-invalid={!!errors.template || undefined} value={prompt.template} onChange={e => setPrompt({ ...prompt, template: e.target.value })}/>{error('template')}</label>
            <div className="pm-admin-field-grid"><label className="pm-admin-field"><span>Evaluation reference <span className="pm-admin-error pm-interview-required">*</span></span><input required maxLength={160} aria-invalid={!!errors.evaluation_reference || undefined} value={prompt.evaluation_reference} onChange={e => setPrompt({ ...prompt, evaluation_reference: e.target.value })}/>{error('evaluation_reference')}</label>
                <label className="pm-admin-field"><span>Change reason <span className="pm-admin-error pm-interview-required">*</span></span><input required maxLength={500} aria-invalid={!!errors.reason || undefined} value={reason} onChange={e => setReason(e.target.value)}/>{error('reason')}</label></div>
            <div className="pm-interview-config-actions"><button type="button" className="pm-admin-button" disabled={busy} onClick={() => { setPrompt(null); setErrors({}); }}>Cancel</button><button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={busy}>{busy ? 'Publishing…' : 'Publish and activate'}</button></div>
        </form>}
        {error('request')}{error('expected_version')}{notice && <p role="status" className="pm-admin-notice pm-admin-notice-success">{notice}</p>}
    </section>;
}
