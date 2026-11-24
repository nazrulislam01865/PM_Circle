import { useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

type Option = { value: string; label: string };
type Props = { id: string; label: string; options: Option[]; value: string[]; onChange: (value: string[]) => void; error?: string; maxSelections?: number };

/** Search master data or add a custom value; custom entries stay in the consuming form. */
export function AdminCreatableMultiChoice({ id, label, options, value, onChange, error, maxSelections = 500 }: Props) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const names = useMemo(() => new Map(options.map(option => [option.value, option.label])), [options]);
    const normalized = (text: string) => text.trim().toLowerCase();
    const term = normalized(query);
    const selectedNames = new Set(value.flatMap(item => [normalized(item), normalized(names.get(item) ?? item)]));
    const available = options.filter(option => !selectedNames.has(normalized(option.value)) && !selectedNames.has(normalized(option.label)));
    const matches = available.filter(option => normalized(option.label).includes(term) || normalized(option.value).includes(term));
    const exact = options.find(option => normalized(option.label) === term || normalized(option.value) === term);
    const selected = value.some(item => normalized(item) === term || normalized(names.get(item) ?? item) === term);
    const canAdd = !!term && !selected && value.length < maxSelections && /^[^\p{C}<>]*[\p{L}\p{N}][^\p{C}<>]*$/u.test(query.trim());
    const add = (item: string) => {
        if (value.length >= maxSelections || selectedNames.has(normalized(item)) || selectedNames.has(normalized(names.get(item) ?? item))) return;
        onChange([...value, item]); setQuery(''); setOpen(true);
    };
    return <div className="pm-admin-field pm-admin-multi-choice pm-admin-creatable" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
        <label htmlFor={id}>{label}</label>
        <div className="pm-admin-creatable-wrap">
            <div className="pm-admin-multi-inline-control pm-admin-creatable-control">
                <div className="pm-admin-multi-tags">{value.map(item => <span className="pm-admin-multi-tag" key={item}>{names.get(item) ?? item}<button type="button" aria-label={`Remove ${names.get(item) ?? item}`} onClick={() => onChange(value.filter(entry => entry !== item))}><X size={14}/></button></span>)}
                    <input id={id} value={query} maxLength={160} placeholder="Type to search or add" autoComplete="off" aria-expanded={open} aria-controls={`${id}-options`} aria-invalid={!!error || undefined} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }} onKeyDown={event => {
                        if (event.key === 'Enter') { event.preventDefault(); if (canAdd) add(exact?.value ?? query.trim()); }
                        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
                        if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); requestAnimationFrame(() => document.getElementById(`${id}-options`)?.querySelector('button')?.focus()); }
                    }}/>
                </div><button type="button" className="pm-admin-choice-trigger" aria-label={`Show ${label} choices`} aria-expanded={open} onClick={() => setOpen(!open)}><ChevronDown size={17}/></button>
            </div>
            {open && <div id={`${id}-options`} className="pm-admin-creatable-options" role="group" aria-label={`${label} suggestions`}>
                {canAdd && !exact && <button type="button" onClick={() => add(query.trim())}>Add “{query.trim()}”</button>}
                {matches.slice(0, 60).map(option => <button type="button" key={option.value} disabled={value.length >= maxSelections} onClick={() => add(option.value)}>{option.label}</button>)}
                {matches.length > 60 && <p className="pm-admin-hint">Type to narrow {matches.length} matches.</p>}
                {!matches.length && !canAdd && <p className="pm-admin-hint">{value.length >= maxSelections ? 'Selection limit reached.' : 'No available matches. Type a new value.'}</p>}
            </div>}
        </div>
        {error && <small className="pm-error" role="alert">{error}</small>}
    </div>;
}
