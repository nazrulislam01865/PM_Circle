import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { resumeBasicFields } from './resumeFieldSchema';
import { alignedBasic, alignedCollections, alignedDefinitions, alignedPayload, alignedRecords, area, monthValue, navigation, type CollectionKey, type Field, type ProfileData, type RowData, type Value } from './profileResumeFields';
// Compatibility exports for the existing compact editor and profile pages.
export { definitions, initialRecords, alignedBasic, alignedCollections, alignedDefinitions, alignedRecords, type CollectionKey, type Field, type ProfileData, type RowData, type ProfileEditorDetails, type CompactDetailKey } from './profileResumeFields';
import { ProfileSectionJump } from './ProfileSectionJump';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';

type ProfileInputProps = {
    id: string; field: Field; value: Value; disabled?: boolean; error?: string; onChange: (value: string | boolean) => void;
};

export function ProfileInput({ id, field, value, disabled, error, onChange }: ProfileInputProps) {
    if (field.type === 'checkbox') return (
        <label className="pm-prototype-checkbox" htmlFor={id}>
            <input id={id} type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)} /> {field.label}
        </label>
    );
    return <div className={`pm-prototype-field ${field.full ? 'pm-prototype-field--full' : ''}`}>
        <label htmlFor={id} className="pm-label">{field.label}{field.required && ' *'}</label>
        {field.type === 'textarea' ? (
            <textarea id={id} className="pm-textarea" rows={3} required={field.required} disabled={disabled} value={String(value ?? '')} maxLength={field.maxLength ?? (field.key === 'about' ? 2000 : 4000)}
                aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
                onChange={e => onChange(e.target.value)} />
        ) : field.type === 'select' ? (
            <select id={id} className="pm-select" required={field.required} disabled={disabled} value={String(value ?? '')} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
                onChange={e => onChange(e.target.value)}>
                <option value="">Select...</option>
                {(field.options ?? []).map(option => typeof option === 'string'
                    ? <option key={option} value={option}>{option}</option>
                    : <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        ) : (
            <input id={id} className="pm-input" type={field.type === 'month' ? 'month' : field.type === 'url' ? 'url' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
                required={field.required} disabled={disabled} maxLength={field.maxLength} value={field.type === 'month' ? monthValue(value) : String(value ?? '')}
                aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
                onClick={field.type === 'month' ? event => {
                    try { event.currentTarget.showPicker?.(); } catch { /* Keep the native picker fallback. */ }
                } : undefined}
                onChange={e => onChange(e.target.value)} />
        )}
        {error && <span id={`${id}-error`} className="pm-profile-error" role="alert">{error}</span>}
    </div>;
}

function EditorCollection({ type, rows, errors, onChange, onAdd, onRemove }: {
    type: typeof alignedCollections[number]; rows: RowData[]; errors: Record<string, string>;
    onChange: (index: number, key: string, value: string | boolean) => void;
    onAdd: () => void; onRemove: (index: number) => void;
}) {
    const definition = alignedDefinitions[type];
    const [expanded, setExpanded] = useState(true);
    useEffect(() => {
        if (Object.keys(errors).some(key => key.startsWith(`editor_details.records.${type}.`))) {
            setExpanded(true);
        }
    }, [errors, type]);
    return <section className="pm-card pm-prototype-section pm-prototype-collection" id={`editor-${type}`} aria-label={definition.title}>
        <h3 className="pm-prototype-section-head"><button type="button" aria-expanded={expanded} aria-controls={`editor-${type}-body`}
            onClick={() => setExpanded(open => !open)}>{expanded ? '▾' : '▸'} {definition.title} ({rows.length})</button></h3>
        {expanded && <div className="pm-prototype-collection-body" id={`editor-${type}-body`}>
            {rows.map((row, index) => (
                <div className="pm-prototype-entry" key={row.id ?? `${type}-draft-${index}`}>
                    <div className="pm-prototype-entry-head">
                        <h4>{String(row[definition.titleField] || definition.itemTitle)}</h4>
                        <button type="button" className="pm-prototype-remove" onClick={() => onRemove(index)}
                            aria-label={`Remove ${definition.itemTitle.toLowerCase()} ${index + 1}`}>Remove</button>
                    </div>
                    <div className="pm-prototype-fields">
                        {definition.fields.map(field => {
                            const errorKey = `editor_details.records.${type}.${index}.${field.key}`;
                            return <ProfileInput key={field.key} id={`editor-${type}-${index}-${field.key}`}
                                field={field} value={row[field.key]} error={errors[errorKey]}
                                disabled={Boolean(field.disabledWhen && row[field.disabledWhen])}
                                onChange={value => onChange(index, field.key, value)} />;
                        })}
                    </div>
                </div>
            ))}
            <button type="button" className="pm-prototype-add" onClick={onAdd} disabled={rows.length >= 20}>+ {definition.addLabel}</button>
        </div>}
    </section>;
}

export function ProfileEditorPrototype({ profile, onImport, onCancel }: { profile: ProfileData & { completeness?: number }; onImport?: () => void; onCancel: () => void }) {
    const [basic, setBasic] = useState(() => alignedBasic(profile));
    const [completion, setCompletion] = useState(profile.completeness ?? 0);
    const [records, setRecords] = useState<Record<CollectionKey, RowData[]>>(() => alignedRecords(profile));
    const [removed, setRemoved] = useState<Record<string, number[]>>({});
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const setBasicField = (key: string, value: string | boolean) => setBasic(prev => ({ ...prev, [key]: value }));
    const changeRecord = (type: CollectionKey, index: number, key: string, value: string | boolean) => {
        setRecords(prev => ({ ...prev, [type]: prev[type].map((row, pos) => pos === index
            ? { ...row, [key]: value, ...(value === true && (key === 'is_current' || key === 'does_not_expire')
                ? { [key === 'does_not_expire' ? 'expiry_month' : 'end_month']: '' } : {}) }
            : row) }));
    };
    const addRecord = (type: CollectionKey) => setRecords(prev => ({ ...prev, [type]: [...prev[type], Object.fromEntries(
        alignedDefinitions[type as keyof typeof alignedDefinitions].fields.map(field => [field.key, ''])
    )] }));
    const removeRecord = (type: CollectionKey, index: number) => {
        const entry = records[type][index];
        if (entry.id && ['experiences', 'projects', 'educations', 'certifications'].includes(type)) {
            setRemoved(prev => ({ ...prev, [type]: [...(prev[type] ?? []), entry.id!] }));
        }
        setRecords(prev => ({ ...prev, [type]: prev[type].filter((_, pos) => pos !== index) }));
    };
    const rootField = (key: keyof ReturnType<typeof alignedBasic>, label: string, required = false, type: Field['type'] = 'text') =>
        <ProfileInput key={key} id={`editor-basic-${key}`} field={{ key, label, required, type, maxLength: key === 'role' ? 80 : key === 'headline' ? 180 : key === 'location' ? 241 : key === 'phone' ? 32 : 255 }} value={basic[key]}
            error={errors[key] || errors[`editor_details.${key}`] || (key === 'linkedin' ? errors.linkedin_url : key === 'location' ? errors.city || errors.country || errors['editor_details.display_location'] : undefined)} onChange={value => setBasicField(key, value)} />;
    const send = () => {
        if (saving) return;
        const digits = basic.phone.replace(/\D/g, '');
        const firstError: Record<string, string> = {};
        if (!basic.name.trim()) firstError.name = 'Full name is required.';
        if (!basic.email.trim()) firstError.email = 'Contact email is required.';
        if (digits.length < 7 || digits.length > 15) firstError.phone = 'Enter a phone number with 7 to 15 digits, including the country code.';
        if (Object.keys(firstError).length) {
            setErrors(firstError);
            const first = Object.keys(firstError)[0];
            document.getElementById(`editor-basic-${first}`)?.focus();
            return;
        }

        const location = basic.location.trim();
        const [city, ...countryParts] = location.split(',').map(part=>part.trim());
        const country = countryParts.join(', ');
        const changedLocation = location !== alignedBasic(profile).location;
        const linkedin = basic.linkedin.trim();
        const linkedinUrl = /^[a-zA-Z0-9_-]+$/.test(linkedin) ? `https://www.linkedin.com/in/${linkedin}` : linkedin;
        const url = ProfileController.update.url();
        setSaving(true);
        setErrors({});
        router.patch(url, {
            tab: 'edit', name: basic.name, email: basic.email, headline: basic.headline, role: basic.role,
            ...(changedLocation ? {city,country} : {}), phone: basic.phone, about: basic.about,
            linkedin_url: linkedinUrl,
            editor_details: {resume_aligned:true, portfolio:basic.portfolio,github:basic.github,
                ...(changedLocation ? {display_location:location} : {}), records:alignedPayload(records)},
            removed_entries: removed,
        }, {
            preserveScroll: true,
            onError: next => {
                setErrors(next);
                requestAnimationFrame(() => {
                    const firstKey = Object.keys(next)[0];
                    const match = /^editor_details\.records\.([^.]+)\.(\d+)\.([^.]+)$/.exec(firstKey ?? '');
                    const destination = match ? `editor-${match[1]}-${match[2]}-${match[3]}`
                        : firstKey?.startsWith('skills.') ? 'editor-skill_groups' : firstKey?.startsWith('languages.') ? 'editor-languages'
                        : `editor-basic-${firstKey === 'linkedin_url' ? 'linkedin' : ['city','country','editor_details.display_location'].includes(firstKey ?? '') ? 'location' : firstKey?.split('.').at(-1) ?? 'name'}`;
                    const input = document.getElementById(destination);
                    if (input) input.focus();
                });
            },
            onSuccess: page => {
                const updated = page.props.profileData as ProfileData | undefined;
                if (updated) { setRecords(alignedRecords(updated)); setBasic(alignedBasic(updated)); }
                const score = (page.props.profileData as (ProfileData & { completeness?: number }) | undefined)?.completeness;
                if (typeof score === 'number') setCompletion(score);
                setRemoved({});
            },
            onFinish: () => setSaving(false),
        });
    };

    return <div className="pm-prototype-editor">
        <ProfileSectionJump sections={navigation} targetPrefix="editor-" label="Edit profile sections" completion={completion} />
        <div className="pm-prototype-main pm-profile-editor-card">
                {onImport && <section className="pm-card pm-prototype-section pm-prototype-simple"><div className="pm-card-body"><h3 className="pm-card-title">Build from your CV</h3><p>Review imported suggestions and choose what to add to your draft.</p><button type="button" className="pm-btn pm-btn-primary pm-btn-sm" onClick={onImport}>Import CV</button></div></section>}
                <section className="pm-card pm-prototype-section pm-prototype-simple" id="editor-basic">
                    <div className="pm-card-body">
                        <h3 className="pm-card-title">Basic details</h3>
                        <div className="pm-prototype-fields">
                            {resumeBasicFields.map(([key,label]) => rootField(key, label, ['name','email','phone'].includes(key), key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'))}
                        </div>
                    </div>
                </section>
                <section className="pm-card pm-prototype-section pm-prototype-simple" id="editor-summary">
                    <div className="pm-card-body">
                        <h3 className="pm-card-title">Personal Profile</h3>
                        <div className="pm-prototype-fields">
                            <ProfileInput id="editor-basic-about" field={area('about', 'Summary')} value={basic.about}
                                error={errors.about} onChange={value => setBasicField('about', value)} />
                        </div>
                    </div>
                </section>
                {alignedCollections.map(type => <EditorCollection key={type} type={type} rows={records[type]} errors={errors}
                    onChange={(index, key, value) => changeRecord(type, index, key, value)}
                    onAdd={() => addRecord(type)} onRemove={index => removeRecord(type, index)} />)}
                {Object.keys(errors).length > 0 && <div className="pm-profile-error pm-prototype-error-summary" role="alert">
                    Please review the highlighted fields and try again.
                </div>}
            <div className="pm-profile-editor-actions pm-prototype-save" role="group" aria-label="Profile edit actions">
                <span className="pm-profile-save-description">* Required fields</span>
                <div className="pm-profile-sticky-buttons">
                    <button type="button" className="pm-btn pm-btn-secondary" disabled={saving} onClick={onCancel}>Cancel</button>
                    <button type="button" className="pm-btn pm-btn-primary" disabled={saving} onClick={send}>{saving ? 'Saving...' : 'Save changes'}</button>
                </div>
            </div>
        </div>
    </div>;
}
