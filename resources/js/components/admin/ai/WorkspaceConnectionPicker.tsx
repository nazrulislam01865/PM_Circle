import { useEffect, useRef, useState } from 'react';
import { useDiagnosticTest } from './useDiagnosticTest';
import { AdminChoice } from '@/components/admin/AdminChoice';
import { Link } from '@inertiajs/react';

type Operation = { value: string; label: string };
type Credential = { id: string; name: string; provider: string; provider_id: string; suffix: string | null; health_code: string | null; eligible: boolean };
type Options = { feature: string; model: string | null; models: string[]; slot: string; selected: string; default_name: string | null; credential_name: string | null; credentials: Credential[]; providers: Operation[] };
const base = '/admin/ai/workspace';
const headers = () => ({ Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '', 'X-Requested-With': 'XMLHttpRequest' });

async function json(response: Response) {
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        const details = Object.values(result.errors ?? {}).flat().join(' · ');
        throw new Error(response.status >= 500 ? 'Request failed. Check the application logs.' : details || result.message || `Request failed (${response.status}).`);
    }
    return result;
}

/** A shortcut to the workspace's existing route writer; no secret inputs or separate settings. */
export function WorkspaceConnectionPicker({ operations, portalContainer, disabled, onSaved, onBusy, onHealthChanged }: {
    operations: Operation[]; portalContainer: HTMLElement | null; disabled: boolean;
    onSaved: (feature: string, model: string) => void; onHealthChanged?: () => void; onBusy: (busy: boolean) => void;
}) {
    const [operation, setOperation] = useState(operations[0].value);
    const [data, setData] = useState<Options | null>(null);
    const [selection, setSelection] = useState('default');
    const [profile, setProfile] = useState('default');
    const [model, setModel] = useState('');
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const { begin, finish, retrySeconds, rateLimited } = useDiagnosticTest();
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        setData(null); setLoading(true); setError('');
        fetch(`${base}/connection/${operation}`, { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: controller.signal })
            .then(json).then((value: Options) => { if (!controller.signal.aborted) { setData(value); setSelection(value.selected); setProfile(value.selected === 'default' ? 'default' : value.credentials.find(k => k.id === value.selected)?.provider_id ?? 'unavailable'); setModel(value.model ?? ''); } })
            .catch(e => { if (!controller.signal.aborted) setError(e.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [operation, refresh]);
    const selected = data?.credentials.find(k => k.id === selection);
    const profileKeys = data?.credentials.filter(k => k.provider_id === profile) ?? [];
    const changed = !!data && (selection !== data.selected || model !== data.model);
    const locked = disabled || busy || loading;
    async function save() {
        if (!data || locked || lock.current || !changed || !selection) return;
        lock.current = true; setBusy(true); onBusy(true); setError(''); setNotice('');
        try {
            const result = await json(await fetch(`${base}/connection/${operation}`, { method: 'PUT', credentials: 'same-origin', headers: headers(), body: JSON.stringify({ credential_id: selection === 'default' ? null : Number(selection), expected: data.selected, primary_model: model, expected_model: data.model }) }));
            setNotice(result.message); setRefresh(v => v + 1); onSaved(operation, model);
        } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save connection.'); }
        finally { lock.current = false; setBusy(false); onBusy(false); }
    }
    async function testCredential() {
        if (!data || !selected || locked || lock.current || !begin()) return;
        lock.current = true; setBusy(true); onBusy(true); setError(''); setNotice('');
        try {
            const response = await fetch(`${base}/credentials/${selected.id}/test`, { method: 'POST', credentials: 'same-origin', headers: headers() });
            if (rateLimited(response)) return;
            const result = await json(response);
            if (result.code === 'OPERATION_VERIFIED') setNotice(result.message); else setError(result.message ?? 'Credential test did not verify the operation.');
            const updated: Options = await json(await fetch(`${base}/connection/${operation}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } }));
            if (updated.selected !== data.selected || updated.model !== data.model) { setRefresh(v => v + 1); setNotice('The saved route changed. Review the refreshed selection before saving.'); }
            else setData(updated);
            onHealthChanged?.();
        } catch (e) { setError(e instanceof Error ? e.message : 'Credential test failed.'); }
        finally {
            lock.current = false; finish(); setBusy(false); onBusy(false);
        }
    }
    return <div className="pm-admin-field">
        {operations.length > 1 && <AdminChoice id="connection-operation" label="AI operation" value={operation} options={operations} portalContainer={portalContainer} disabled={locked} onChange={v => { setNotice(''); setOperation(v); }}/>}
        {loading && <p role="status" className="pm-admin-hint">Loading workspace connections…</p>}
        {data && <>
            <AdminChoice id="connection-model" label="AI model" value={model} options={Array.from(new Set([...data.models, ...(data.model ? [data.model] : [])])).map(value => ({ value, label: value }))} portalContainer={portalContainer} disabled={locked || data.models.length < 2} onChange={setModel}/>
            <AdminChoice id="connection-profile" label="Provider profile" value={profile} options={[{value: 'default', label: 'Use workspace default'}, ...data.providers, ...(profile === 'unavailable' ? [{value: 'unavailable', label: 'Current provider — unavailable'}] : [])]} portalContainer={portalContainer} disabled={locked} onChange={v => { setProfile(v); setSelection(v === 'default' ? 'default' : ''); setNotice(''); }}/>
            <AdminChoice id="connection-credential" label="Primary API credential" value={selection} options={profile === 'default' ? [{ value: 'default', label: data.default_name ? `Workspace default — ${data.default_name}` : 'Workspace default — not configured' }] : profile === 'unavailable' ? [{value: data.selected, label: 'Current assignment — unavailable'}] : profileKeys.map(k => ({ value: k.id, label: `${k.name}${k.suffix ? ` · ••••${k.suffix}` : ''}${k.eligible ? '' : ' · Test required'}` }))} portalContainer={portalContainer} disabled={locked} onChange={v => { setSelection(v); setNotice(''); }}/>
            {selected && !selected.eligible && <p className="pm-admin-hint">Verify this credential before assigning it. The existing connection remains unchanged until saved.</p>}
            {(!data.credentials.length || (profile !== 'default' && !profileKeys.length)) && <p className="pm-admin-hint">No eligible saved credentials. <Link href={`${base}/keys?slot=${encodeURIComponent(data.slot)}`}>Add an API key in AI Workspace</Link>.</p>}
            <div className="pm-career-settings-dialog-actions">
                {selected && <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={locked || retrySeconds > 0} onClick={testCredential}>{retrySeconds > 0 ? `Retry in ${retrySeconds}s` : 'Test selected credential'}</button>}
                <button type="button" className="pm-admin-button pm-admin-button-primary" disabled={locked || !changed || !selection || !data.models.includes(model) || (selection !== 'default' && !selected?.eligible && selection !== data.selected)} onClick={save}>{busy ? 'Working…' : 'Save connection'}</button>
            </div>
            <small className="pm-admin-hint">This updates the same workspace route. Backup routing and budgets stay unchanged.</small>
        </>}
        {error && <p role="alert" className="pm-admin-error">{error} <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={locked} onClick={() => setRefresh(v => v + 1)}>Refresh options</button></p>}
        {notice && <p role="status" className="pm-admin-hint">{notice}</p>}
    </div>;
}
