import { router } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { AdminChoice } from '@/components/admin/AdminChoice';
import type { InterviewPracticeConfig } from '@/components/interview/types';

export function InterviewPracticeSettings({ settings, roles }: { settings: InterviewPracticeConfig; roles: { value: string; label: string }[] }) {
    const [draft, setDraft] = useState(settings);
    const [role, setRole] = useState(settings.role_profiles[0]?.role ?? '');
    const [focusText, setFocusText] = useState(() => Object.fromEntries(settings.role_profiles.map(item => [item.role, item.focus.join('\n')])));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const profileIndex = draft.role_profiles.findIndex(item => item.role === role);
    const profile = draft.role_profiles[profileIndex];
    const change = <K extends keyof InterviewPracticeConfig,>(key: K, value: InterviewPracticeConfig[K]) => setDraft(old => ({ ...old, [key]: value }));
    const save = (event: FormEvent) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true); setErrors({});
        router.put('/admin/interview-preparation/settings', { ...draft, role_profiles: draft.role_profiles.map(item => ({ ...item, focus: [...new Set((focusText[item.role] ?? '').split('\n').map(line => line.trim()).filter(Boolean))] })) }, {
            preserveScroll: true, onError: setErrors, onFinish: () => setBusy(false),
        });
    };
    const error = (key: string) => errors[key] && <small role="alert" className="pm-admin-error">{errors[key]}</small>;
    const numberField = (key: 'minutes_per_question' | 'recommended_common_percent' | 'focus_percent' | 'focus_common_percent', label: string, min: number, max: number) => <label className="pm-admin-field"><span>{label} <span className="pm-admin-error pm-interview-required" aria-hidden="true">*</span></span><input type="number" required min={min} max={max} value={Number.isFinite(draft[key]) ? draft[key] : ""} aria-invalid={!!errors[key] || undefined} onChange={event => change(key, event.target.valueAsNumber)}/>{error(key)}</label>;
    return <form noValidate onSubmit={save} className="pm-interview-config">
        <section className="pm-admin-panel">
            <div className="pm-interview-admin-title"><div><h2>Practice availability and timing</h2><p>Changes apply to new sessions. Existing practice and results remain available.</p></div></div>
            <div className="pm-admin-field-grid">
                {numberField('minutes_per_question', 'Minutes per question', 1, 30)}
                <div className="pm-interview-config-options"><label className="pm-interview-admin-checkbox"><input type="checkbox" checked={draft.allow_new_sessions} onChange={event => change('allow_new_sessions', event.target.checked)}/>Allow new interview sessions</label><label className="pm-interview-admin-checkbox"><input type="checkbox" checked={draft.allow_job_description} onChange={event => change('allow_job_description', event.target.checked)}/>Enable job description targeting and upload</label></div>
            </div>
            {error('allow_new_sessions')}{error('allow_job_description')}
        </section>
        <section className="pm-admin-panel">
            <div className="pm-interview-admin-title"><div><h2>Member introduction</h2><p>Update the existing interview banner text.</p></div></div>
            <div className="pm-admin-field-grid">
                <label className="pm-admin-field"><span>Banner title <span className="pm-admin-error pm-interview-required">*</span></span><textarea required maxLength={120} rows={2} value={draft.hero_title} aria-invalid={!!errors.hero_title || undefined} onChange={event => change('hero_title', event.target.value)}/>{error('hero_title')}</label>
                <label className="pm-admin-field"><span>Banner description <span className="pm-admin-error pm-interview-required">*</span></span><textarea required maxLength={500} rows={2} value={draft.hero_description} aria-invalid={!!errors.hero_description || undefined} onChange={event => change('hero_description', event.target.value)}/>{error('hero_description')}</label>
            </div>
        </section>
        <section className="pm-admin-panel">
            <div className="pm-interview-admin-title"><div><h2>Question mix</h2><p>Manage the labels and requested percentages. Actual distribution depends on published questions.</p></div></div>
            <div className="pm-admin-field-grid">
                {(['recommended', 'common', 'focus'] as const).map(key => <label key={key} className="pm-admin-field"><span>{key === 'recommended' ? 'Recommended mix label' : key === 'common' ? 'Common mix label' : 'Focus mix label'} <span className="pm-admin-error pm-interview-required">*</span></span><input required maxLength={80} value={draft.mix_labels[key]} onChange={event => change('mix_labels', { ...draft.mix_labels, [key]: event.target.value })} aria-invalid={!!errors[`mix_labels.${key}`] || undefined}/>{error(`mix_labels.${key}`)}</label>)}
                {numberField('recommended_common_percent', 'Recommended mix: common (%)', 0, 100)}
                {numberField('focus_percent', 'Focus mix: focus areas (%)', 1, 100)}
                {numberField('focus_common_percent', 'Focus mix: common (%)', 0, 100)}
            </div>
            <p className="pm-interview-admin-muted">The remaining percentage is allocated to role and industry scenarios. Common-only practice remains 100% common questions.</p>
        </section>
        <section className="pm-admin-panel">
            <div className="pm-interview-admin-title"><div><h2>Professions and focus areas</h2><p>Assign each role to a profession and set its available focus areas. One focus area per line.</p></div></div>
            <AdminChoice id="interview-config-role" label="Target role" value={role} onChange={setRole} options={roles}/>
            {profile && <div className="pm-admin-field-grid">
                <label className="pm-admin-field"><span>Profession <span className="pm-admin-error pm-interview-required">*</span></span><input required maxLength={100} value={profile.profession} onChange={event => change('role_profiles', draft.role_profiles.map(item => item.role === role ? { ...item, profession: event.target.value } : item))} aria-invalid={!!errors[`role_profiles.${profileIndex}.profession`] || undefined}/>{error(`role_profiles.${profileIndex}.profession`)}</label>
                <label className="pm-admin-field"><span>Focus areas</span><textarea rows={6} value={focusText[role] ?? ''} onChange={event => setFocusText(old => ({ ...old, [role]: event.target.value }))}/><small>Up to 30 unique areas, 100 characters each. Leave empty to hide focus-area mode for this role.</small></label>
            </div>}
            {Object.entries(errors).filter(([key]) => key.startsWith('role_profiles') || key === 'mix_labels').map(([key, value]) => <p key={key} className="pm-admin-error" role="alert">{key.startsWith('role_profiles.') ? `${roles.find(item => item.value === draft.role_profiles[Number(key.split('.')[1])]?.role)?.label ?? 'Role'}: ` : ''}{value}</p>)}
        </section>
        <div className="pm-interview-config-actions"><button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={busy}><Save size={17}/>{busy ? 'Saving…' : 'Save settings'}</button></div>

    </form>;
}
