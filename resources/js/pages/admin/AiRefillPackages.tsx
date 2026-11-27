import { Head, router } from '@inertiajs/react';
import { Archive, Pencil, Plus, Save, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { refillServerErrors, validateRefill, type RefillErrors, type RefillField } from '@/lib/ai-refill-validation';

type Pack = { id: number; code: string; version: number; title: string; credits: number; price_minor: number; currency: string; active: boolean; expires_after_days: number | null };
type Provider = 'bkash' | 'sslcommerz';
type Editor = { kind: 'add' | 'edit' | 'archive'; pack?: Pack; code: string; title: string; credits: string; price: string; expiry: string; active: boolean; reason: string };
const url = '/admin/ai/refill-packages';
const money = (minor: number) => new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100) + ' BDT';

export default function AiRefillPackages({ packages, providers }: { packages: Pack[]; providers: Provider[] }) {
    const [editor, setEditor] = useState<Editor | null>(null);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<RefillErrors>({});
    const editorRef = useRef<HTMLElement>(null);
    const latestVersions = new Map<string, number>();
    for (const pack of packages) latestVersions.set(pack.code, Math.max(latestVersions.get(pack.code) ?? 0, pack.version));
    const editorKind = editor?.kind;
    const editorPackId = editor?.pack?.id;
    useEffect(() => {
        if (editorKind) editorRef.current?.scrollIntoView({ block: 'nearest' });
    }, [editorKind, editorPackId]);
    const open = (kind: Editor['kind'], pack?: Pack) => {
        setError(''); setNotice(''); setFieldErrors({});
        setEditor({ kind, pack, code: pack?.code ?? `pack-${crypto.randomUUID()}`, title: pack?.title ?? '', credits: pack ? String(pack.credits) : '', price: pack ? (pack.price_minor / 100).toFixed(2) : '', expiry: pack?.expires_after_days ? String(pack.expires_after_days) : '', active: pack ? Boolean(pack.active) : true, reason: '' });
    };
    const change = <K extends keyof Editor>(key: K, value: Editor[K]) => {
        setEditor(current => current ? { ...current, [key]: value } : current);
        setFieldErrors(current => current[key as RefillField] ? { ...current, [key]: undefined } : current);
    };
    const fieldProps = (field: RefillField) => ({
        id: `refill-${field}`,
        'aria-invalid': Boolean(fieldErrors[field]) || undefined,
        'aria-describedby': fieldErrors[field] ? `refill-${field}-error` : undefined,
    });
    const fieldError = (field: RefillField) => fieldErrors[field] && <small id={`refill-${field}-error`} className="pm-admin-error" role="alert">{fieldErrors[field]}</small>;
    const requiredMark = <span className="pm-refill-required" aria-hidden="true"> *</span>;
    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!editor || busy) return;
        setError(''); setNotice('');
        const { errors, priceMinor } = validateRefill(editor);
        setFieldErrors(errors);
        if (Object.keys(errors).length) return;
        setBusy(true);
        const archive = editor.kind === 'archive';
        try {
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const response = await fetch(archive ? `/admin/ai/packages/${editor.pack?.id}/disable` : '/admin/ai/packages', {
                method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': token },
                body: JSON.stringify(archive ? { reason: editor.reason.trim() } : { code: editor.code, title: editor.title.trim(), credits: Number(editor.credits), price_minor: priceMinor, currency: 'BDT', expires_after_days: editor.expiry === '' ? null : Number(editor.expiry), active: editor.active, reason: editor.reason.trim(), replace_id: editor.pack?.id ?? null }),
            });
            const data = await response.json().catch(() => null) as { message?: string; errors?: Record<string, string[]>; version?: number; active?: boolean } | null;
            if (!response.ok) {
                if (response.status === 422 && data?.errors) {
                    const { fields, general } = refillServerErrors(data.errors);
                    setFieldErrors(fields);
                    setError(general.join(' ') || (Object.keys(fields).length ? '' : 'Please review the package details.'));
                    setBusy(false);
                    return;
                }
                throw new Error(data?.message ?? 'Could not save package. Please try again.');
            }
            if (!data || (archive ? data.active !== false : typeof data.version !== 'number')) throw new Error('Could not confirm the save. Refresh the package list before trying again.');
            router.reload({ only: ['packages', 'providers'], onSuccess: () => { setEditor(null); setNotice(archive ? 'Package removed from the member catalog.' : 'Package saved.'); }, onFinish: () => setBusy(false) });
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save package.'); setBusy(false); }
    };
    return <AdminLayout title="AI refill packages" subtitle="Manage AI credit packs and BDT prices shown in the PMP AI Usage tab." active={url} headingAction={<button className="pm-admin-button pm-admin-button-primary" type="button" onClick={() => open('add')} disabled={busy}><Plus size={16}/> Add package</button>}>
        <Head title="AI refill packages | PM Circle Admin"/>
        {notice && <p className="pm-admin-notice pm-admin-notice-success" role="status">{notice}</p>}
        <div className="pm-course-admin-editor pm-refill-admin">
            <section className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-section-heading"><h2>Payment methods · BDT</h2></div>
                <p>bKash: <strong>{providers.includes('bkash') ? 'Available' : 'Not configured or disabled'}</strong> · SSLCommerz: <strong>{providers.includes('sslcommerz') ? 'Available' : 'Not configured or disabled'}</strong></p>
                <p className="pm-admin-hint">Only verified, server-enabled payment adapters can accept orders. You can prepare packages before enabling checkout.</p>
            </section>
            {editor && <section ref={editorRef} className="pm-admin-panel pm-course-admin-section" aria-labelledby="refill-editor-title">
                <div className="pm-admin-editor-toolbar"><h2 id="refill-editor-title">{editor.kind === 'add' ? 'Add refill package' : editor.kind === 'edit' ? 'Edit refill package' : 'Remove refill package'}</h2><button className="pm-admin-button" type="button" disabled={busy} onClick={() => {setEditor(null); setError(''); setFieldErrors({});}}><X size={16}/> Cancel</button></div>
                <form className="pm-admin-field-grid" onSubmit={save} noValidate>
                    {editor.kind === 'archive' ? <p className="pm-course-admin-wide">Remove <strong>{editor.title}</strong> from future purchases? Existing orders and issued credits are preserved.</p> : <>
                        <label className="pm-admin-field"><span>Package name{requiredMark}</span><input {...fieldProps('title')} required maxLength={120} value={editor.title} onChange={e => change('title', e.target.value)}/>{fieldError('title')}</label>
                        <label className="pm-admin-field"><span>AI credits{requiredMark}</span><input {...fieldProps('credits')} required inputMode="numeric" value={editor.credits} onChange={e => change('credits', e.target.value)}/>{fieldError('credits')}</label>
                        <label className="pm-admin-field"><span>Total price (BDT){requiredMark}</span><input {...fieldProps('price')} required inputMode="decimal" value={editor.price} onChange={e => change('price', e.target.value)} placeholder="0.00"/>{fieldError('price')}</label>
                        <label className="pm-admin-field"><span>Valid for (days, optional)</span><input {...fieldProps('expiry')} inputMode="numeric" value={editor.expiry} onChange={e => change('expiry', e.target.value)} placeholder="No expiry"/>{fieldError('expiry')}</label>
                        <label className="pm-course-admin-publish pm-course-admin-wide"><input type="checkbox" checked={editor.active} onChange={e => change('active', e.target.checked)}/> Available to members</label>
                    </>}
                    <label className="pm-admin-field pm-course-admin-wide"><span>Change reason{requiredMark}</span><textarea {...fieldProps('reason')} required maxLength={500} rows={2} value={editor.reason} onChange={e => change('reason', e.target.value)}/>{fieldError('reason')}</label>
                    {error && <p className="pm-admin-error pm-course-admin-wide" role="alert">{error}</p>}
                    <div className="pm-course-admin-wide pm-admin-editor-actions pm-refill-save-actions"><button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={busy}><Save size={16}/>{busy ? 'Saving…' : editor.kind === 'archive' ? 'Confirm removal' : 'Save package'}</button></div>
                </form>
            </section>}
            <section className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-section-heading"><h2>Refill packages</h2><p>Editing creates a new price version. Removing a package hides it from members without changing past orders or credits.</p></div>
                <div className="pm-course-admin-table-scroll" role="region" aria-label="AI refill packages" tabIndex={0}><table className="pm-course-admin-table"><thead><tr><th scope="col">Package</th><th scope="col">Credits</th><th scope="col">Price</th><th scope="col">Validity</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>
                    {packages.map(pack => <tr key={pack.id}><td><strong>{pack.title}</strong><small>Version {pack.version}</small></td><td>{Number(pack.credits).toLocaleString('en-BD')}</td><td>{money(pack.price_minor)}</td><td>{pack.expires_after_days ? `${pack.expires_after_days} days` : 'No expiry'}</td><td><span className="pm-course-admin-status">{pack.active ? 'Available' : 'Removed / disabled'}</span></td><td><div className="pm-course-admin-row-actions"><button className="pm-admin-button" type="button" disabled={busy || pack.version !== latestVersions.get(pack.code)} onClick={() => open('edit', pack)}><Pencil size={15}/> Edit</button>{Boolean(pack.active) && <button className="pm-admin-button" type="button" disabled={busy} onClick={() => open('archive', pack)}><Archive size={15}/> Remove</button>}</div></td></tr>)}
                    {!packages.length && <tr><td colSpan={6}>No packages yet. Add your first refill pack.</td></tr>}
                </tbody></table></div>
            </section>
        </div>
    </AdminLayout>;
}
