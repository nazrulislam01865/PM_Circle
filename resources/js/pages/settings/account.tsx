import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Bell, BookOpen, CreditCard, FileText, LockKeyhole, ShieldCheck, Sparkles, UserRound, UsersRound, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardShellData } from '@/types/dashboard';
import { useAppearance, type Appearance } from '@/hooks/use-appearance';
import { SettingsCard, SettingsRow, type SettingField, type SettingsSection, type SettingsValues } from '@/components/settings/SettingsCard';
import { ProfilePrivacyEditor, type ProfilePrivacyAudience, type ProfilePrivacyFieldGroup } from '@/components/profile/ProfilePrivacyTab';
import { ProgressBar } from '@/components/pm/ProgressBar';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import PasswordInput from '@/components/password-input';
import { PaymentHistory } from '@/components/settings/PaymentHistory';

const icons: Record<string, LucideIcon> = { user: UserRound, lock: LockKeyhole, shield: ShieldCheck, bell: Bell, book: BookOpen, people: UsersRound, spark: Sparkles, card: CreditCard, file: FileText };
const themeLabel = (mode: Appearance) => mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'System';
type Balance = { tokens: { configured: boolean; allocated: number; remaining: number }; credits: number };
type Props = { privacyFieldGroups: ProfilePrivacyFieldGroup[]; sections: SettingsSection[]; savedValues: SettingsValues; sessionInfo: { browser: string; canRevokeOthers: boolean }; canDeleteAccount: boolean; aiBalance?: Balance };

export default function AccountSettings({ sections, privacyFieldGroups, savedValues, sessionInfo, canDeleteAccount, aiBalance }: Props) {
    const { memberShell } = usePage<{ memberShell: DashboardShellData }>().props;
    const { appearance, updateAppearance } = useAppearance();
    const [baseline, setBaseline] = useState<SettingsValues>(() => ({ ...savedValues, theme: themeLabel(appearance) }));
    const [draft, setDraft] = useState<SettingsValues>(baseline);
    const [active, setActive] = useState(0);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState('');
    const [modal, setModal] = useState<string | null>(null);
    const [cachedBalance, setCachedBalance] = useState(aiBalance);
    const currentBalance = aiBalance ?? cachedBalance;
    const [balanceState, setBalanceState] = useState<'idle' | 'loading' | 'failed' | 'done'>('idle');
    const heading = useRef<HTMLHeadingElement>(null);
    const deleteForm = useForm({ password: '' });
    const revokeForm = useForm({ password: '' });
    const changed = Object.keys(draft).filter(key => draft[key] !== baseline[key]);
    const [title, , description, groups] = sections[active];
    const privacyChoices = (values: SettingsValues): Record<string, ProfilePrivacyAudience> => Object.fromEntries(privacyFieldGroups.flatMap(group => group.fields.map(field => [field.key, values[`privacy_${field.key}`] as ProfilePrivacyAudience])));
    const confirmNavigation = () => !changed.length || window.confirm('You have unsaved changes. Leave without saving?');

    useEffect(() => {
        if (!changed.length) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [changed.length]);

    // Keep the settings control synchronized when another browser tab saves a theme.
    useEffect(() => {
        const currentTheme = themeLabel(appearance);
        if (baseline.theme === currentTheme) return;
        const previousTheme = baseline.theme;
        setBaseline(previous => ({ ...previous, theme: currentTheme }));
        setDraft(previous => previous.theme === previousTheme ? { ...previous, theme: currentTheme } : previous);
    }, [appearance, baseline.theme]);

    // Load only the actual quota/credits when the AI section is first opened.
    const loadBalance = () => {
        setBalanceState('loading');
        router.reload({ only: ['aiBalance'], onSuccess: page => { const result = page.props.aiBalance as Balance | undefined; if (result) setCachedBalance(result); setBalanceState(result ? 'done' : 'failed'); }, onError: () => setBalanceState('failed'), onFinish: () => setBalanceState(state => state === 'loading' ? 'failed' : state) });
    };
    const selectSection = (index: number) => {
        setActive(index); setStatus('');
        if (sections[index][0] === 'AI & usage' && balanceState === 'idle' && !currentBalance) loadBalance();
        requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'auto' }); });
    };
    const editValue = (key: string, value: string | boolean) => {
        setDraft(previous => ({ ...previous, [key]: value }));
        setErrors(previous => { const next = { ...previous }; delete next[key]; if (key.startsWith('privacy_')) { delete next[`field_visibility.${key.slice(8)}`]; delete next[`field_visibility_patch.${key.slice(8)}`]; delete next.field_visibility; delete next.field_visibility_patch; } return next; });
        setStatus('');
    };
    const discard = () => { setDraft({ ...baseline }); setErrors({}); setStatus('Unsaved changes discarded.'); };
    const save = () => {
        if (!changed.length || saving) return;
        const mode = String(draft.theme).toLowerCase() as Appearance;
        const data: Record<string, string | boolean | Record<string, ProfilePrivacyAudience>> = Object.fromEntries(changed.filter(key => key !== 'theme' && !key.startsWith('privacy_')).map(key => [key, draft[key]]));
        const privacyPatch = changed.filter(key => key.startsWith('privacy_'));
        if (privacyPatch.length) data.field_visibility_patch = Object.fromEntries(privacyPatch.map(key => [key.slice(8), draft[key] as ProfilePrivacyAudience]));
        const finish = (values: SettingsValues) => {
            const persisted = !changed.includes('theme') || updateAppearance(mode);
            const next = { ...values, theme: draft.theme }; setBaseline(next); setDraft(next);
            setStatus(persisted ? 'Settings saved.' : 'Settings applied, but browser storage is blocked. Appearance may reset when you leave this page.');
        };
        setErrors({}); setStatus('');
        if (!Object.keys(data).length) { finish(baseline); return; }
        setSaving(true);
        router.patch('/settings/account', data, { preserveScroll: true, preserveState: true,
            onSuccess: page => finish(page.props.savedValues as SettingsValues),
            onError: validation => {
                setErrors(validation); setStatus(validation.settings ?? 'Please correct the highlighted settings.');
                const privacyError = Object.keys(validation).some(key => key === 'visibility' || key === 'field_visibility' || key.startsWith('field_visibility'));
                const index = privacyError ? sections.findIndex(section => section[0] === 'Privacy') : sections.findIndex(section => section[3].some(group => group[1].some(field => Object.prototype.hasOwnProperty.call(validation, field.id))));
                if (index >= 0) { setActive(index); requestAnimationFrame(() => document.getElementById(privacyError ? (Object.keys(validation)[0].startsWith('field_visibility') && Object.keys(validation)[0].includes('.') ? `privacy-${Object.keys(validation)[0].split('.')[1]}` : 'privacy-global') : `setting-${Object.keys(validation)[0]}`)?.focus()); }
            }, onFinish: () => setSaving(false),
        });
    };
    const act = (field: SettingField) => {
        if (field.id === 'export') {
            const url = URL.createObjectURL(new Blob([JSON.stringify(baseline, null, 2)], { type: 'application/json' }));
            const link = document.createElement('a'); link.href = url; link.download = 'pm-circle-settings.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); return;
        }
        if (field.id === 'delete' || field.id === 'currentDevice' || field.id === 'otherDevice' || field.id === 'invoice') setModal(field.id);
    };
    const planLabel = memberShell.plan === 'premium' ? 'Plus' : memberShell.plan === 'pro' ? 'Pro' : 'Free';
    const balance = <div className="pm-settings-balance">{currentBalance ? <>{currentBalance.tokens.configured && currentBalance.tokens.allocated > 0 ? <><p><strong>{currentBalance.tokens.remaining.toLocaleString()}</strong> of {currentBalance.tokens.allocated.toLocaleString()} PMP tokens remaining</p><ProgressBar value={currentBalance.tokens.remaining} max={currentBalance.tokens.allocated} label="PMP tokens remaining"/></> : <p>No active PMP token allowance.</p>}<p>Available AI credits: <strong>{currentBalance.credits.toLocaleString()}</strong></p></> : balanceState === 'failed' ? <p>Balance could not be loaded. <button type="button" onClick={loadBalance} className="pm-btn pm-btn-secondary pm-btn-sm">Retry</button></p> : <p role="status">Loading current balance…</p>}</div>;
    return <MemberDashboardLayout dashboard={memberShell}><Head title="Account settings"/>
        <div className="pm-account-page pm-settings-workspace" data-text-size={draft.size === 'Large' ? 'large' : 'default'} data-reduce-motion={String(draft.motion === true)}>
            <header className="pm-settings-heading"><p className="pm-settings-eyebrow">Account / Settings</p><h1>Account settings</h1><p className="pm-account-lead">Manage how you learn, use AI, and share information on PM Circle.</p></header>
            <nav className="pm-settings-menu" aria-label="Settings sections">{sections.map(([name, icon], index) => { const Icon = icons[icon]; return <button type="button" key={name} className="pm-btn pm-btn-secondary pm-btn-sm" aria-current={index === active ? 'page' : undefined} disabled={saving} onClick={() => selectSection(index)}>{Icon && <Icon size={18} aria-hidden="true"/>}{name}</button>; })}</nav>
            <section className="pm-settings-panel" aria-labelledby="settings-section-title">
                <div className="pm-settings-banner"><span><strong>Account preferences</strong> · Saved to your account; appearance is stored in this browser. Security and billing notices are unaffected by optional notification preferences.</span></div>
                <header className="pm-settings-intro"><h2 id="settings-section-title" ref={heading} tabIndex={-1}>{title}</h2><p>{description}</p></header>
                {groups.map(([groupTitle, fields]) => <SettingsCard key={groupTitle} title={groupTitle} summary={groupTitle === 'Usage balance' ? balance : undefined}>{fields.map(original => {
                    const field: SettingField = original.id === 'plans' ? { ...original, name: `${planLabel} plan` } : original.id === 'otherDevice' && !sessionInfo.canRevokeOthers ? { ...original, mode: 'unavailable', help: 'Requires database-backed sessions.' } : original;
                    return <SettingsRow key={field.id} centralized field={field} value={draft[field.id]} error={errors[field.id]} disabled={saving || (field.id === 'delete' && !canDeleteAccount) || (field.id === 'digest' && draft.mail !== true) || (['quietStart', 'quietEnd'].includes(field.id) && draft.quiet !== true)} onChange={value => editValue(field.id, value)} onAction={() => act(field)} confirmNavigation={confirmNavigation}/>;
                })}</SettingsCard>)}
                {title === 'Privacy' && <ProfilePrivacyEditor showSidebar={false} centralized groups={privacyFieldGroups} choices={privacyChoices(draft)} saved={privacyChoices(baseline)} globalVisibility={String(draft.visibility)} savedGlobalVisibility={String(baseline.visibility)} disabled={saving} onChange={(key, value) => editValue(`privacy_${key}`, value)} onGlobalChange={value => editValue('visibility', value)}>
                    {Object.entries(errors).filter(([key]) => key === 'visibility' || key.startsWith('field_visibility')).map(([key, error]) => <p key={key} className="pm-privacy-error" role="alert">{error}</p>)}
                </ProfilePrivacyEditor>}
                <p className={`pm-settings-status${Object.keys(errors).length ? ' pm-settings-error' : ''}`} role="status">{status}</p>
                <div className="pm-settings-save-bar"><span>{changed.length ? `${changed.length} unsaved ${changed.length === 1 ? 'change' : 'changes'}` : 'No unsaved changes'}</span><div><button type="button" className="pm-btn pm-btn-secondary pm-btn-sm" disabled={saving || !changed.length} onClick={discard}>Discard</button><button type="button" className="pm-btn pm-btn-primary pm-btn-sm" disabled={saving || !changed.length} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button></div></div>
            </section>
        </div>
        <Dialog open={modal !== null} onOpenChange={open => { if (!open && !deleteForm.processing && !revokeForm.processing) { setModal(null); deleteForm.resetAndClearErrors(); revokeForm.resetAndClearErrors(); } }}><DialogContent className={`pm-settings-dialog${modal === 'invoice' ? ' pm-settings-payment-dialog' : ''}`}><DialogTitle>{modal === 'delete' ? 'Delete account' : modal === 'otherDevice' ? 'Sign out other devices' : modal === 'invoice' ? 'Payment history' : 'Current session'}</DialogTitle><DialogDescription>{modal === 'delete' ? 'This permanently removes your account. Confirm with your current password to continue.' : modal === 'otherDevice' ? 'Confirm your current password. Other browser sessions and remembered sign-ins will be revoked.' : modal === 'invoice' ? 'Your central payment orders. These are payment records, not tax invoices.' : 'This is the browser used for your current authenticated session.'}</DialogDescription>
            {modal === 'delete' ? <form noValidate onSubmit={event => { event.preventDefault(); deleteForm.delete('/settings/profile', { preserveScroll: true, onSuccess: () => { setModal(null); deleteForm.reset(); } }); }}><label htmlFor="settings-delete-password">Current password <span className="pm-settings-error">*</span></label><PasswordInput id="settings-delete-password" autoComplete="current-password" value={deleteForm.data.password} onChange={event => deleteForm.setData('password', event.target.value)} required aria-invalid={Boolean(deleteForm.errors.password)}/>{deleteForm.errors.password && <p role="alert" className="pm-settings-error">{deleteForm.errors.password}</p>}<div className="pm-settings-dialog-actions"><button type="button" className="pm-btn pm-btn-secondary" disabled={deleteForm.processing} onClick={() => { setModal(null); deleteForm.resetAndClearErrors(); }}>Close</button><button type="submit" className="pm-btn pm-btn-secondary pm-settings-danger" disabled={deleteForm.processing || !deleteForm.data.password}>Delete account</button></div></form> : modal === 'otherDevice' ? <form noValidate onSubmit={event => { event.preventDefault(); revokeForm.post('/settings/account/revoke-sessions', { preserveScroll: true, preserveState: true, onSuccess: () => { setModal(null); revokeForm.resetAndClearErrors(); setStatus('Other browser sessions signed out.'); } }); }}><label htmlFor="settings-revoke-password">Current password <span className="pm-settings-error">*</span></label><PasswordInput id="settings-revoke-password" autoComplete="current-password" value={revokeForm.data.password} onChange={event => revokeForm.setData('password', event.target.value)} required aria-invalid={Boolean(revokeForm.errors.password)}/>{revokeForm.errors.password && <p role="alert" className="pm-settings-error">{revokeForm.errors.password}</p>}<div className="pm-settings-dialog-actions"><button type="button" className="pm-btn pm-btn-secondary" disabled={revokeForm.processing} onClick={() => { setModal(null); revokeForm.resetAndClearErrors(); }}>Cancel</button><button type="submit" className="pm-btn pm-btn-primary" disabled={revokeForm.processing || !revokeForm.data.password}>{revokeForm.processing ? 'Signing out…' : 'Sign out other devices'}</button></div></form> : modal === 'invoice' ? <PaymentHistory/> : <><p className="pm-settings-session-info">{sessionInfo.browser || 'Browser information unavailable'}</p><div className="pm-settings-dialog-actions"><button type="button" className="pm-btn pm-btn-primary" onClick={() => setModal(null)}>Close</button></div></>}
        </DialogContent></Dialog>
    </MemberDashboardLayout>;
}
