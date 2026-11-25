import { router } from '@inertiajs/react';
import { WorkspaceConnectionPicker } from './WorkspaceConnectionPicker';
import { X, CheckCircle2, Circle } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ConnectionDialogContent, IntegrationCard, type ConnectionDisplay } from './ConnectionControls';
import { useDiagnosticTest } from './useDiagnosticTest';
import { AdminChoice } from '@/components/admin/AdminChoice';
import '../../../../css/pm-feature-settings.css';

export type Connection = ConnectionDisplay & { configured: boolean; request_id?: string; code?: string | null; };
export const choices = (values: (string | number)[], label: (v: string | number) => string = String) => values.map(v => ({ value: String(v), label: label(v) }));
export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
    return <section className="pm-admin-panel pm-career-settings-panel"><div className="pm-feature-panel-heading"><h2>{title}</h2>{action}</div>{children}</section>;
}
export function CheckField({ checked, onChange, children }: { checked: boolean; onChange?: (v: boolean) => void; children: ReactNode }) {
    return <label className="pm-admin-check-row pm-career-settings-check"><input type="checkbox" checked={checked} disabled={!onChange} onChange={e => onChange?.(e.target.checked)}/><span>{children}</span></label>;
}
export function FixedChoice({ label, value, id }: { label: string; value: string; id: string }) {
    return <AdminChoice id={id} label={label} value={value} options={choices([value])} onChange={() => {}} disabled/>;
}
export function Field({ label, id, children, error }: { label: string; id: string; children: ReactNode; error?: string }) {
    return <div className="pm-admin-field"><label htmlFor={id}>{label}</label>{children}{error && <small className="pm-admin-error" role="alert">{error}</small>}</div>;
}
export function Preview({ children }: { children: ReactNode }) { return <div className="pm-career-settings-preview">{children}</div>; }
export function PreviewRow({ icon, label, value }: { icon: ReactNode; label: string; value?: ReactNode }) { return <div>{icon}<span>{label}</span>{value !== undefined && <span>{value}</span>}</div>; }
export function Readiness({ ready, label }: { ready: boolean; label: string }) { return <PreviewRow icon={ready ? <CheckCircle2/> : <Circle/>} label={label} value={<span className={ready ? 'pm-feature-ready' : undefined}>{ready ? 'Ready' : 'Not configured'}</span>}/>; }
export function Actions({ children, form, processing, disabled }: { children?: ReactNode; form: string; processing: boolean; disabled?: boolean }) {
    return <div className="pm-career-settings-actions">{children}<button type="submit" form={form} className="pm-admin-button pm-admin-button-primary" disabled={processing || disabled}>{processing ? 'Saving…' : 'Save settings'}</button></div>;
}
export function Notices({ saved, errors }: { saved: boolean; errors: object }) {
    return <>{saved && <p role="status" className="pm-admin-notice pm-admin-notice-success">Settings saved successfully.</p>}{Object.keys(errors).length > 0 && <div role="alert" className="pm-admin-notice pm-admin-notice-error">{Object.values(errors).join(' · ')}</div>}</>;
}
export function ConnectionPanel({ feature, connection, detail, dialogRef: externalRef, onRouteSaved }: { feature: 'daily-challenge' | 'pmp' | 'feed-moderation'; connection: Connection; detail?: string; dialogRef?: RefObject<HTMLDialogElement | null>; onRouteSaved?: (feature: string, model: string) => void }) {
    const [open, setOpen] = useState(false);
    const [routingBusy, setRoutingBusy] = useState(false);
    const operations = feature === 'daily-challenge' ? [{ value: 'scenario_generate', label: 'Daily Challenge generation' }, { value: 'daily_challenge_review', label: 'Daily Challenge review' }] : feature === 'pmp' ? [{ value: 'pmp_explain', label: 'Question explanation' }, { value: 'pmp_followup', label: 'Follow-up tutoring' }] : [{ value: 'feed_moderation', label: 'Feed moderation' }];
    const [tested, setTested] = useState<Connection | null>(null);
    const { busy, retrySeconds, begin, finish, rateLimited } = useDiagnosticTest();
    const [error, setError] = useState('');
    const localRef = useRef<HTMLDialogElement>(null);
    const abortTest = useRef<AbortController | null>(null);
    useEffect(() => () => abortTest.current?.abort(), []);
    const dialog = externalRef ?? localRef;
    // A new Inertia settings response supersedes local diagnostics for the old saved configuration.
    useEffect(() => { setTested(null); setError(''); }, [connection]);
    const status = tested && tested.model === connection.model ? tested : connection;
    async function test() {
        if (routingBusy) return;
        if (!begin()) return;
        setError('');
        const controller = new AbortController(); abortTest.current = controller;
        try {
            const response = await fetch(`/admin/ai/feature-connection/${feature}`, { method: 'POST', credentials: 'same-origin', signal: controller.signal, headers: { Accept: 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '', 'X-Requested-With': 'XMLHttpRequest' } });
            if (rateLimited(response)) return;
            if (!response.ok) throw new Error(`Unable to check connection (${response.status}).`);
            let result: Connection = await response.json();
            setTested(result);
            const started = Date.now();
            while (result.pending && result.request_id && !controller.signal.aborted) {
                if (Date.now() - started > 180_000) throw new Error('Test still pending. Check the AI queue and test again to resume the pending request.');
                await new Promise(resolve => setTimeout(resolve, 3000));
                const poll = await fetch(`/admin/ai/feature-connection/${feature}/${encodeURIComponent(result.request_id)}`, { credentials: 'same-origin', signal: controller.signal, headers: { Accept: 'application/json' } });
                if (rateLimited(poll)) return;
                if (!poll.ok) throw new Error(`Unable to read test status (${poll.status}).`);
                result = await poll.json(); setTested(result);
            }
        } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to check connection.'); }
        finally { if (!controller.signal.aborted) finish(); }
    }
    const hint = feature === 'feed-moderation'
        ? (connection.verification === 'moderation' ? 'Test sends a harmless text sample to the existing Omni moderation endpoint. No post or comment is created.' : 'Test runs a small synthetic Responses request and any configured moderation preflight, using the existing moderation and global budgets. No post or comment is created.')
        : 'Test runs a small, budgeted generation request using the saved primary model and its existing moderation policy. It does not create a challenge, exam attempt or member credit charge.';
    return <Panel title="AI integration"><IntegrationCard connection={status} provider="openai" detail={detail} onManage={() => { setOpen(true); dialog.current?.showModal(); }}/>
        <dialog ref={dialog} onClose={() => setOpen(false)} className="pm-career-settings-dialog" aria-labelledby={`${feature}-connection-title`}><div className="pm-career-settings-dialog-head"><h2 id={`${feature}-connection-title`}>Manage connection</h2><button type="button" className="pm-admin-button" aria-label="Close dialog" onClick={() => dialog.current?.close()}><X size={18}/></button></div>
            <ConnectionDialogContent id={`${feature}-provider`} provider="openai" options={[{value:'openai',label:'OpenAI'}]} onChange={() => {}} fixed connection={status} portalContainer={dialog.current} testing={busy} retrySeconds={retrySeconds} error={error} onTest={test} onClose={() => dialog.current?.close()} routingBusy={routingBusy} hint={`${hint} Test connection checks the saved ${feature === 'daily-challenge' ? 'generation' : feature === 'pmp' ? 'explanation' : 'moderation'} route. Other operations can be assigned above and tested at credential level.`}>{open && <WorkspaceConnectionPicker operations={operations} portalContainer={dialog.current} disabled={busy} onBusy={setRoutingBusy} onHealthChanged={() => { setTested(null); router.reload({only:['connection']}); }} onSaved={(code, model) => { setTested(null); setError(''); onRouteSaved?.(code, model); router.reload({ only: feature === 'daily-challenge' ? ['connection', 'readiness'] : feature === 'pmp' ? ['connection', 'features', 'models'] : ['connection'] }); }}/>}</ConnectionDialogContent>
        </dialog>
    </Panel>;
}
