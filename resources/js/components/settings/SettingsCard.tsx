import type { ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import { PMDropdown } from '@/components/pm/PMDropdown';

export type SettingValue = string | boolean;
export type SettingsValues = Record<string, SettingValue>;
export type SettingField = {
    id: string; name: string; help: string; type: 'action' | 'toggle' | 'select' | 'text' | 'email' | 'tel' | 'time';
    mode: 'profile' | 'preference' | 'theme' | 'readonly' | 'link' | 'action' | 'unavailable';
    value?: SettingValue; choices?: string[]; options?: {value: string; label: string}[]; label?: string; danger?: boolean; href?: string;
};
export type SettingsGroup = [string, SettingField[]];
export type SettingsSection = [string, string, string, SettingsGroup[]];

export function SettingsCard({ title, summary, children }: { title: string; summary?: ReactNode; children: ReactNode }) {
    return <section className="pm-account-card pm-settings-card">
        <header className="pm-settings-card-title"><h3>{title}</h3>{summary}</header>
        <div className="pm-settings-card-body">{children}</div>
    </section>;
}

export function SettingsRow({ field, value, error, disabled, onChange, onAction, confirmNavigation, centralized = false }: {
    field: SettingField; value?: SettingValue; error?: string; disabled: boolean;
    centralized?: boolean;
    onChange: (value: SettingValue) => void; onAction: () => void; confirmNavigation: () => boolean;
}) {
    const id = `setting-${field.id}`;
    const unavailable = field.mode === 'unavailable';
    const locked = disabled || unavailable || field.mode === 'readonly';
    const attrs = { id, 'aria-labelledby': `${id}-label`, 'aria-describedby': `${id}-help${error ? ` ${id}-error` : ''}`, 'aria-invalid': error ? true : undefined, disabled: locked };
    const buttonClass = `pm-btn pm-btn-secondary pm-btn-sm${field.danger ? ' pm-settings-danger' : ''}`;
    let control: ReactNode;
    if (field.type === 'action') {
        control = field.mode === 'link' && field.href ? <Link href={field.href} className={buttonClass} onClick={event => { if (disabled || !confirmNavigation()) event.preventDefault(); }}>{field.label}</Link>
            : <button type="button" disabled={locked} className={buttonClass} onClick={onAction}>{field.label}</button>;
    } else if (field.type === 'toggle') {
        control = <input {...attrs} className="pm-settings-switch" type="checkbox" role="switch" checked={value === true} onChange={event => onChange(event.target.checked)}/>;
    } else if (field.type === 'select') {
        control = centralized ? <PMDropdown id={id} value={unavailable ? '' : String(value ?? '')} onValueChange={onChange} options={field.options ?? (field.choices ?? []).map(choice => ({ value: choice, label: choice }))} placeholder={unavailable ? 'Unavailable' : 'Select an option'} required disabled={locked} invalid={Boolean(error)} className="pm-settings-control" aria-label={field.name} aria-describedby={attrs['aria-describedby']}/> : <select {...attrs} className="pm-select pm-settings-control" value={unavailable ? '' : String(value ?? '')} onChange={event => onChange(event.target.value)}>
            {unavailable ? <option value="">Unavailable</option> : value === 'Mixed' ? <option value="Mixed" disabled>Mixed visibility</option> : null}
            {field.choices?.map(choice => <option key={choice} value={choice}>{choice}</option>)}
        </select>;
    } else {
        control = <div className="pm-settings-input-wrap">{field.mode === 'readonly' ? <output id={id} aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`} className="pm-input pm-settings-control pm-settings-readonly">{String(value ?? field.value ?? '')}</output> : <input {...attrs} className="pm-input pm-settings-control" type={field.type} value={String(value ?? '')} maxLength={field.id === 'phone' ? 32 : 255} onChange={event => onChange(event.target.value)}/>}
            {field.mode === 'readonly' && field.href && <Link href={field.href} onClick={event => { if (disabled || !confirmNavigation()) event.preventDefault(); }}>Edit profile</Link>}</div>;
    }
    return <div className="pm-settings-row"><div className="pm-settings-copy"><h4 id={`${id}-label`}>{field.name}{centralized && field.mode === 'profile' && <span className="pm-settings-error"> *</span>}</h4><p id={`${id}-help`}>{field.help}{unavailable && <span className="pm-settings-unavailable"> · Not available</span>}</p>{error && <p className="pm-settings-error" id={`${id}-error`} role="alert">{error}</p>}</div><div className="pm-settings-control-wrap">{control}</div></div>;
}
