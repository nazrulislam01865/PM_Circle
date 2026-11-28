import { Head, router, usePage } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { CheckCircle2, Gift, Save, ShieldCheck } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';

type Settings = { enabled: boolean; discount_type: 'percent' | 'fixed'; discount_value: string; currency: 'BDT' | 'USD'; validity_days: number };

export default function ProfileRewards({ settings, stats }: { settings: Settings; stats: { issued: number; redeemed: number } }) {
    const [form, setForm] = useState(settings);
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { flash } = usePage<{ flash?: { status?: string } }>().props;

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setErrors({});
        router.put('/admin/profile-rewards', { ...form }, {
            preserveScroll: true,
            onError: next => setErrors(next),
            onFinish: () => setBusy(false),
        });
    }

    return <AdminLayout active="/admin/profile-rewards" title="Profile completion rewards" subtitle="Set the discount and expiry for members who complete the ten required reward profile fields.">
        <Head title="Profile completion rewards | PM Circle" />
        <div className="pm-admin-stats">
            <article className="pm-admin-panel pm-admin-stat"><span>Codes issued</span><strong className="pm-admin-stat-number">{stats.issued.toLocaleString()}</strong></article>
            <article className="pm-admin-panel pm-admin-stat"><span>Codes redeemed</span><strong className="pm-admin-stat-number">{stats.redeemed.toLocaleString()}</strong></article>
        </div>
        <section className="pm-admin-panel pm-profile-reward-admin-panel">
            <div className="pm-profile-reward-admin-intro"><Gift aria-hidden="true" size={24}/><div><h2>Reward settings</h2><p>The member receives one non-transferable code after completing all ten profile requirements. Codes apply only to eligible simulator purchases when verified checkout is connected.</p></div></div>
            {flash?.status && <p className="pm-admin-notice pm-admin-notice-success" role="status"><CheckCircle2 size={18} aria-hidden="true"/>{flash.status}</p>}
            {Object.keys(errors).length > 0 && <p className="pm-admin-notice pm-admin-notice-error" role="alert">Please correct the highlighted reward settings.</p>}
            <form onSubmit={submit} className="pm-profile-reward-admin-form">
                <label className="pm-profile-reward-admin-enabled"><input type="checkbox" checked={form.enabled} onChange={event => setForm(previous => ({ ...previous, enabled: event.target.checked }))}/><span>Enable profile completion rewards for new qualifiers</span></label>
                <div className="pm-admin-field-grid">
                    <div className="pm-admin-field"><label htmlFor="reward-discount-type">Discount type</label><select id="reward-discount-type" value={form.discount_type} onChange={event => setForm(previous => ({ ...previous, discount_type: event.target.value as Settings['discount_type'] }))}><option value="percent">Percentage (%)</option><option value="fixed">Fixed amount</option></select></div>
                    <div className="pm-admin-field"><label htmlFor="reward-discount-value">{form.discount_type === 'percent' ? 'Discount percentage' : 'Discount amount'}</label><input id="reward-discount-value" type="number" min="0.01" max={form.discount_type === 'percent' ? '100' : '100000'} step="0.01" required value={form.discount_value} aria-invalid={Boolean(errors.discount_value)} onChange={event => setForm(previous => ({ ...previous, discount_value: event.target.value }))}/>{errors.discount_value && <span className="pm-admin-error" role="alert">{errors.discount_value}</span>}</div>
                    <div className="pm-admin-field"><label htmlFor="reward-currency">Currency (used for fixed discounts)</label><select id="reward-currency" value={form.currency} onChange={event => setForm(previous => ({ ...previous, currency: event.target.value as Settings['currency'] }))}><option value="BDT">BDT</option><option value="USD">USD</option></select></div>
                    <div className="pm-admin-field"><label htmlFor="reward-validity">Validity after issuance (days)</label><input id="reward-validity" type="number" min="1" max="365" step="1" required value={form.validity_days} aria-invalid={Boolean(errors.validity_days)} onChange={event => setForm(previous => ({ ...previous, validity_days: Number(event.target.value) }))}/>{errors.validity_days && <span className="pm-admin-error" role="alert">{errors.validity_days}</span>}</div>
                </div>
                <div className="pm-profile-reward-admin-note"><ShieldCheck size={18} aria-hidden="true"/><span>Changes affect future codes only. Existing codes retain their issued value, currency and expiry. A fixed-amount reward is valid only for matching-currency purchases.</span></div>
                <button type="submit" disabled={busy} className="pm-admin-button pm-admin-button-primary"><Save size={17} aria-hidden="true" />{busy ? 'Saving…' : 'Save reward settings'}</button>
            </form>
        </section>
    </AdminLayout>;
}
