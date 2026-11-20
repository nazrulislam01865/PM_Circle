import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Trash2, UploadCloud } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { PMDropdown } from '@/components/pm/PMDropdown';
import { homepageDefaultIcon } from '@/components/home/HomeDefaultIcons';

export type EditorField = { key: string; label: string; kind?: 'textarea' | 'select' | 'route' | 'lines' | 'image' | 'fixed-icon'; category?: string; choices?: { value: string; label: string }[] };
export type EditorOptions = { id: number; title?: string; name?: string }[];

export function ContentField({ id: fieldId, label, value, onChange, type = 'text', choices, error, hint }: {
    id?: string; label: string; value: string; onChange: (next: string) => void;
    type?: 'text' | 'textarea' | 'select' | 'route'; choices?: { value: string; label: string }[]; error?: string; hint?: string;
}) {
    const id = fieldId ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    return <div className="pm-admin-field"><label htmlFor={id}>{label}</label>
        {type === 'route' ? <div className="pm-admin-route-inputs">
            <input id={id} value={value} placeholder="Enter a same-site path (e.g. /community)"
                aria-invalid={Boolean(error)} autoComplete="off" onChange={event => onChange(event.target.value)}/>
            {(choices ?? []).length > 0 && <details className="pm-admin-route-chooser">
                <summary>Choose a suggested page</summary>
                <div className="pm-admin-route-chooser-options">
                    <PMDropdown id={`${id}-suggestion`} value={(choices ?? []).some(option => option.value === value) ? value : ''}
                        onValueChange={onChange} options={choices ?? []} placeholder="Select a page" aria-label={`Suggested destination for ${label}`}/>
                </div>
            </details>}
        </div>
        : type === 'textarea' ? <textarea id={id} rows={3} value={value} aria-invalid={Boolean(error)} onChange={event => onChange(event.target.value)}/>
            : type === 'select' ? <PMDropdown id={id} value={value} onValueChange={onChange}
                invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
                placeholder={(choices ?? []).length ? 'Select an option' : 'No available options'}
                options={value && !(choices ?? []).some(choice => choice.value === value)
                    ? [{ value, label: `${value} (previously selected)`, disabled: true }, ...(choices ?? [])]
                    : (choices ?? [])}/>
            : <input id={id} value={value} aria-invalid={Boolean(error)} onChange={event => onChange(event.target.value)}/>}
        {type === 'select' && !(choices ?? []).length && <small className="pm-admin-error">No options are available for this field.</small>}
        {hint && <small className="pm-admin-hint">{hint}</small>}{error && <span id={`${id}-error`} role="alert" className="pm-admin-error">{error}</span>}
    </div>;
}

export function RepeatableItems({ title, path, rows, fields, onChange, errors, max = 10, layout = 'grid', collapsible = false }: {
    title: string; path: string; rows: Record<string, unknown>[]; fields: EditorField[];
    onChange: (items: Record<string, unknown>[]) => void; errors: Record<string, string>; max?: number; layout?: 'grid' | 'stacked'; collapsible?: boolean;
}) {
    const [expanded, setExpanded] = useState<number>(0);
    const setItem = (index: number, key: string, value: string) => onChange(rows.map((row, i) => i === index ? { ...row, [key]: fields.find(f => f.key === key)?.kind === 'lines'
        ? value.split('\n').map(s => s.trim()).filter(Boolean) : value } : row));
    const needsMaster = fields.some(field => field.kind === 'select' && !field.choices?.length);
    const move = (index: number, direction: number) => {
        const next = [...rows]; const other = index + direction;
        if (other < 0 || other >= next.length) return;
        [next[index], next[other]] = [next[other], next[index]];
        onChange(next);
    };
    return <div className="pm-admin-repeater">
        <div className="pm-admin-list-heading"><h3>{title} <span>({rows.length})</span></h3>
            <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={rows.length >= max || needsMaster} onClick={() => onChange([...rows, Object.fromEntries(fields.map(field => [field.key, field.kind === 'lines' ? [] : field.kind === 'image' ? '' : field.kind === 'fixed-icon' && field.choices?.length ? field.choices[rows.length % field.choices.length].value : field.choices?.[0]?.value ?? '']))])}><Plus size={16}/> Add item</button>
        </div>
        {rows.length === 0 && <p className="pm-admin-empty">No items. Add a card to display it on the homepage.</p>}
        {rows.map((row, index) => <div className="pm-admin-repeat-card" key={`${path}-${index}`}>
            <div className="pm-admin-repeat-header">{collapsible ? <button type="button" className="pm-admin-repeat-toggle" aria-expanded={expanded === index} onClick={() => setExpanded(expanded === index ? -1 : index)}>
                {expanded === index ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}<strong>{String(row.title || row.category || row.name || `Item ${index + 1}`)}</strong></button>
                : <strong>Item {index + 1}</strong>}
                <div className="pm-admin-icon-actions">
                    <button type="button" aria-label={`Move item ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16}/></button>
                    <button type="button" aria-label={`Move item ${index + 1} down`} disabled={index === rows.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16}/></button>
                    <button type="button" aria-label={`Remove item ${index + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}><Trash2 size={16}/></button>
                </div></div>
            {(!collapsible || expanded === index) && <div className={`pm-admin-field-grid ${layout === 'stacked' ? 'pm-admin-field-stack' : ''}`}>{fields.map(field => field.kind === 'fixed-icon' ? null : field.kind === 'image'
                ? <div className="pm-admin-field pm-admin-icon-upload-field" key={field.key}>
                    <span className="pm-admin-field-label">{field.label} · {index + 1} (optional)</span>
                    <HomepageImageUploader variant="icon" value={String(row[field.key] ?? '')} onChange={value => setItem(index, field.key, value)}
                        fallbackPreview={(() => {
                            const iconField = fields.find(candidate => candidate.kind === 'fixed-icon');
                            if (!iconField) return undefined;
                            const Icon = homepageDefaultIcon(iconField.category ?? '', String(row[iconField.key] ?? ''));
                            return <Icon size={30} aria-hidden="true"/>;
                        })()}/>
                    {errors[`${path}.${index}.${field.key}`] && <span role="alert" className="pm-admin-error">{errors[`${path}.${index}.${field.key}`]}</span>}
                </div>
                : <ContentField key={field.key} id={`item-${path.replace(/[^a-zA-Z0-9]/g, '-')}-${index}-${field.key}`} label={`${field.label} · ${index + 1}`}
                    value={field.kind === 'lines' ? ((row[field.key] as string[] | undefined) ?? []).join('\n') : String(row[field.key] ?? '')}
                    type={field.kind === 'textarea' || field.kind === 'lines' ? 'textarea' : field.kind === 'select' ? 'select' : field.kind === 'route' ? 'route' : 'text'}
                    choices={field.choices} onChange={value => setItem(index, field.key, value)}
                    error={errors[`${path}.${index}.${field.key}`]}/>)}</div>}
        </div>)}
        {errors[path] && <span role="alert" className="pm-admin-error">{errors[path]}</span>}
    </div>;
}

export function FeaturedSelector({ label, hint, options, selected, onChange, max, error }: {
    label: string; hint: string; options: EditorOptions; selected: number[]; onChange: (value: number[]) => void; max: number; error?: string;
}) {
    return <div className="pm-admin-featured"><h3>{label}</h3><p>{hint}</p>
        {options.length === 0 ? <p className="pm-admin-empty">No eligible published content is available.</p> : <div className="pm-admin-featured-list">
            {options.map(option => <label key={option.id} className="pm-admin-check-row"><input type="checkbox" checked={selected.includes(option.id)}
                disabled={!selected.includes(option.id) && selected.length >= max}
                onChange={event => onChange(event.target.checked ? [...selected, option.id] : selected.filter(id => id !== option.id))}/>
                <span>{option.title || option.name || `#${option.id}`}</span></label>)}
        </div>}
        {selected.length > 0 && <div className="pm-admin-featured-clear"><span>{selected.length} selected</span><button type="button" className="pm-admin-button pm-admin-button-quiet" onClick={() => onChange([])}>Clear selection</button></div>}
        {error && <span className="pm-admin-error" role="alert">{error}</span>}
    </div>;
}

export function HomepageImageUploader({ value, onChange, variant = 'portrait', fallbackPreview, fallbackImage }: { value: string; onChange: (url: string) => void; variant?: 'portrait' | 'icon'; fallbackPreview?: ReactNode; fallbackImage?: string }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function upload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
            setError('Choose a PNG, JPG, or WebP image smaller than 2 MB.'); event.target.value = ''; return;
        }
        setBusy(true); setError('');
        try {
            const body = new FormData(); body.append('image', file);
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const response = await fetch('/admin/homepage/images', {
                method: 'POST', body, credentials: 'same-origin', headers: { 'X-CSRF-TOKEN': token, 'Accept': 'application/json' },
            });
            if (!response.ok) {
                if (response.status === 419) throw new Error('Your session expired. Reload the page and sign in again.');
                throw new Error(response.status === 422 ? 'Invalid image. Use a PNG, JPG, or WebP file under 2 MB.' : 'Unable to upload this image. Please try again.');
            }
            if (response.redirected || !response.headers.get('content-type')?.includes('application/json')) {
                throw new Error('Your session may have expired. Reload this page and try again.');
            }
            const result = await response.json() as { url?: string };
            if (!result.url) throw new Error('The upload did not return an image address.');
            onChange(result.url);
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Upload failed.'); }
        finally { setBusy(false); event.target.value = ''; }
    }
    return <div className={`pm-admin-upload ${variant === 'icon' ? 'pm-admin-upload-icon' : ''}`}>
        {(value || fallbackImage) ? <img src={value || fallbackImage} alt={value ? 'Uploaded image preview' : 'Default image preview'}/>
            : fallbackPreview && <span className="pm-admin-default-icon-preview" aria-label="Current default icon">{fallbackPreview}</span>}
        <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={busy}
            onClick={() => inputRef.current?.click()}>
            <UploadCloud size={16}/>{busy ? 'Uploading…' : value ? 'Replace image' : variant === 'icon' ? 'Upload icon' : 'Upload image'}
        </button>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy}
            onChange={upload} className="pm-admin-file-input" hidden/>
        {value && <button type="button" className="pm-admin-button pm-admin-button-quiet" onClick={() => onChange('')}>{fallbackImage || fallbackPreview ? 'Use default' : 'Remove image'}</button>}
        {variant === 'icon' && <small className="pm-admin-hint">36 × 36 px display · transparent PNG recommended · max 2 MB</small>}
        {error && <span role="alert" className="pm-admin-error">{error}</span>}
    </div>;
}

export function EditableStringList({ title, values, onChange, max = 10, error }: {
    title: string; values: string[]; onChange: (next: string[]) => void; max?: number; error?: string;
}) {
    return <div className="pm-admin-repeater"><div className="pm-admin-list-heading"><h3>{title}</h3>
        <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={values.length >= max} onClick={() => onChange([...values, 'New topic'])}><Plus size={16}/> Add topic</button></div>
        {values.map((value, index) => <div className="pm-admin-string-row" key={`topic-${index}`}>
            <input aria-label={`${title} ${index + 1}`} value={value} onChange={event => onChange(values.map((v, i) => i === index ? event.target.value : v))}/>
            <button type="button" aria-label={`Move topic ${index + 1} up`} disabled={index === 0} onClick={() => {
                const next = [...values]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next);
            }}><ArrowUp size={16}/></button>
            <button type="button" aria-label={`Move topic ${index + 1} down`} disabled={index === values.length - 1} onClick={() => {
                const next = [...values]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; onChange(next);
            }}><ArrowDown size={16}/></button>
            <button type="button" aria-label={`Remove topic ${index + 1}`} disabled={values.length <= 1} onClick={() => onChange(values.filter((_, i) => i !== index))}><Trash2 size={16}/></button>
        </div>)}
        {error && <span role="alert" className="pm-admin-error">{error}</span>}
    </div>;
}
