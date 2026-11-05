import { useState } from 'react';
import { router } from '@inertiajs/react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { ProfileDateInput } from './ProfileDateInput';

type Entry = { id?: number; [key: string]: unknown };
type Field = {
    key: string;
    label: string;
    required?: boolean;
    kind?: 'text' | 'number' | 'textarea' | 'checkbox' | 'select' | 'date';
    fullWidth?: boolean;
    choices?: string[];
    placeholder?: string;
};

type Props = {
    entries: Entry[];
    fields: Field[];
    blank: Entry;
    label: string;
    summary: (item: Entry) => string;
    saveUrl: string;
    deleteUrl: (id: number) => string;
};

export function ProfileEntryEditor({ entries, fields, blank, label, summary, saveUrl, deleteUrl }: Props) {
    const [editing, setEditing] = useState<number | 'new' | null>(entries.length === 1 && label === 'experience' ? entries[0].id ?? 'new' : null);
    const [draft, setDraft] = useState<Entry>(entries.length === 1 && label === 'experience' ? { ...entries[0] } : { ...blank });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const choose = (entry?: Entry) => {
        const target = entry?.id ?? 'new';
        if (editing === target) {
            setEditing(null);
            return;
        }
        setEditing(target);
        setDraft(entry ? { ...entry } : { ...blank });
        setErrors({});
    };

    const save = () => {
        setSaving(true);
        // Inertia accepts serializable form values, not arbitrary `unknown` data.
        // Submit only the editable fields, retaining the ID when updating a record.
        const payload: Record<string, string | number | boolean | null> = {};
        if (draft.id !== undefined) payload.id = draft.id;
        for (const field of fields) {
            const value = draft[field.key];
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
                payload[field.key] = value;
            }
        }
        if (payload.is_current) payload.end_date = null;
        router.post(saveUrl, payload, {
            preserveScroll: true,
            onSuccess: () => { setEditing(null); setErrors({}); },
            onError: setErrors,
            onFinish: () => setSaving(false),
        });
    };

    const remove = (entry: Entry) => {
        if (!entry.id || !window.confirm(`Remove this ${label}?`)) return;
        router.delete(deleteUrl(entry.id), {
            preserveScroll: true,
            onSuccess: () => { if (editing === entry.id) setEditing(null); },
        });
    };

    const editor = (key: string) => (
        <div className="pm-accordion-body space-y-4" id={`${label}-${key}-editor`}>
            <div className="pm-form-row-2">
                {fields.map((field, index) => {
                    if (field.kind === 'checkbox' && index > 0 && fields[index - 1].kind === 'checkbox') return null;
                    if (field.kind === 'checkbox' && fields[index + 1]?.kind === 'checkbox') {
                        return <div key={field.key} className="pm-profile-checkbox-pair">
                            {[field, fields[index + 1]].map((item) => <label key={item.key} className="pm-profile-checkbox">
                                <input type="checkbox" checked={Boolean(draft[item.key])}
                                    onChange={(e) => setDraft(previous => ({ ...previous, [item.key]: e.target.checked }))} />{item.label}
                            </label>)}
                        </div>;
                    }
                    return <div className={`pm-form-group ${field.fullWidth ? 'pm-profile-field-full' : ''} ${field.key === 'is_current' ? 'pm-profile-current-work' : ''}`} key={field.key}>
                        {field.kind === 'checkbox' ? (
                            <label className="pm-profile-checkbox">
                                <input type="checkbox" checked={Boolean(draft[field.key])}
                                    onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: e.target.checked, ...(field.key === 'is_current' && e.target.checked ? { end_date: '' } : {}) }))} />
                                {field.label}
                            </label>
                        ) : (
                            <>
                                <label htmlFor={`${label}-${key}-${field.key}`} className="pm-label">{field.label}{field.required ? ' *' : ''}</label>
                                {field.kind === 'textarea' ? (
                                    <textarea id={`${label}-${key}-${field.key}`} className="pm-textarea" rows={3}
                                        placeholder={field.placeholder || 'Describe the work and measurable outcomes'}
                                        value={String(draft[field.key] ?? '')} maxLength={3000}
                                        onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))} />
                                ) : field.kind === 'date' ? (
                                    <ProfileDateInput id={`${label}-${key}-${field.key}`} className="pm-input"
                                        required={field.required} disabled={field.key === 'end_date' && Boolean(draft.is_current)}
                                        aria-label={field.label} value={String(draft[field.key] ?? '')}
                                        onChange={(date) => setDraft((prev) => ({ ...prev, [field.key]: date }))} />
                                ) : field.kind === 'select' ? (
                                    <select id={`${label}-${key}-${field.key}`} className="pm-select" value={String(draft[field.key] ?? '')}
                                        onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}>
                                        {(field.choices ?? []).map((choice) => <option key={choice} value={choice}>{choice}</option>)}
                                    </select>
                                ) : (
                                    <input id={`${label}-${key}-${field.key}`} className="pm-input"
                                        type={field.kind === 'number' ? 'number' : 'text'}
                                        min={field.kind === 'number' ? 1 : undefined}
                                        required={field.required} placeholder={field.placeholder}
                                        value={String(draft[field.key] ?? '')}
                                        onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: field.kind === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value }))} />
                                )}
                            </>
                        )}
                        {errors[field.key] && <span role="alert" className="pm-profile-error">{errors[field.key]}</span>}
                    </div>;
                })}
            </div>
            <div className="pm-profile-entry-actions"><button type="button" className="pm-btn pm-btn-secondary pm-btn-sm" onClick={() => setEditing(null)} disabled={saving}>Cancel</button><button type="button" className="pm-btn pm-btn-primary pm-btn-sm" disabled={saving} onClick={save}>
                {saving ? 'Saving...' : `Save ${label}`}
            </button></div>
        </div>
    );

    return <div className="pm-profile-records">
        {entries.map((entry) => <div key={entry.id} className="pm-accordion-box">
            <div className="pm-profile-record-head">
                <button type="button" className="pm-profile-record-toggle" aria-expanded={editing === entry.id}
                    aria-controls={`${label}-${entry.id}-editor`} onClick={() => choose(entry)}>
                    <span>{summary(entry)}</span>
                    <ChevronDown size={18} className={editing === entry.id ? 'rotate-180' : ''} />
                </button>
                <button type="button" className="pm-profile-record-delete" aria-label={`Remove ${label}: ${summary(entry)}`}
                    onClick={() => remove(entry)}><Trash2 size={16} /></button>
            </div>
            {editing === entry.id && editor(String(entry.id))}
        </div>)}
        {editing === 'new' && <div className="pm-accordion-box"><div className="pm-accordion-head">New {label}</div>{editor('new')}</div>}
        {!entries.length && editing !== 'new' && <p className="pm-profile-empty">No {label} entries yet.</p>}
        {editing !== 'new' && <button type="button" className="pm-btn pm-btn-secondary pm-btn-sm w-full" onClick={() => choose()}>
            <Plus size={16} /> Add {label}
        </button>}
    </div>;
}
