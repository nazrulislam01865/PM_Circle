import * as Dialog from '@radix-ui/react-dialog';
import { ArrowDown, ArrowUp, Check, Plus, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type SampleQuestionOption = {
    id: number;
    code: string;
    domain: string;
    prompt: string;
    is_active: boolean;
};

type Props = {
    value: number[];
    initialOptions: SampleQuestionOption[];
    disabled?: boolean;
    onChange: (ids: number[]) => void;
};

/** Admin-only bounded search; selected IDs stay ordered independently of the result pages. */
export function PmpSampleQuestionSelect({ value, initialOptions, disabled = false, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [domain, setDomain] = useState('');
    const [options, setOptions] = useState<SampleQuestionOption[]>([]);
    const [knownOptions, setKnownOptions] = useState<Record<number, SampleQuestionOption>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setKnownOptions(previous => ({
            ...previous,
            ...Object.fromEntries(initialOptions.map(item => [item.id, item])),
        }));
    }, [initialOptions]);

    useEffect(() => {
        if (!open || disabled) return;
        const abort = new AbortController();
        setOptions([]);
        setLoading(true);
        setError(false);
        const timer = window.setTimeout(async () => {
            try {
                const response = await fetch(`/admin/exam-simulator/pmp/questions/sample-options?search=${encodeURIComponent(search.trim())}&domain=${encodeURIComponent(domain)}`, {
                    credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: abort.signal,
                });
                if (!response.ok) throw new Error('Search unavailable');
                const result: { questions: SampleQuestionOption[] } = await response.json();
                if (!abort.signal.aborted) {
                    setOptions(result.questions);
                    setKnownOptions(previous => ({
                        ...previous,
                        ...Object.fromEntries(result.questions.map(item => [item.id, item])),
                    }));
                }
            } catch {
                if (!abort.signal.aborted) { setError(true); setOptions([]); }
            } finally {
                if (!abort.signal.aborted) setLoading(false);
            }
        }, 250);
        return () => { window.clearTimeout(timer); abort.abort(); };
    }, [disabled, domain, open, retry, search]);

    const selected = value.map(id => knownOptions[id] ?? initialOptions.find(item => item.id === id) ?? ({ id, code: `Question #${id}`, domain: 'Unavailable', prompt: 'This question is no longer in the bank. Remove it before saving.', is_active: false } as SampleQuestionOption));
    const addOrRemove = (item: SampleQuestionOption) => {
        if (disabled) return;
        if (value.includes(item.id)) onChange(value.filter(id => id !== item.id));
        else if (value.length < 20) onChange([...value, item.id]);
    };
    const addVisible = () => {
        const candidates = options.filter(item => !value.includes(item.id));
        onChange([...value, ...candidates.slice(0, Math.max(0, 20 - value.length)).map(item => item.id)]);
    };
    const move = (index: number, direction: number) => {
        const to = index + direction;
        if (to < 0 || to >= value.length) return;
        const next = [...value];
        [next[index], next[to]] = [next[to], next[index]];
        onChange(next);
    };

    return <div className="pm-pmp-sample-picker">
        <div className="pm-pmp-sample-selector-row">
            <div className="pm-pmp-sample-selector-caption">
                <strong>{value.length ? `${value.length} selected question${value.length === 1 ? '' : 's'}` : 'No questions selected'}</strong>
                <span>{value.length ? 'They will appear in this order in the public sample exam.' : 'The built-in practice question will appear until you select questions.'}</span>
            </div>
            <Dialog.Root open={open} onOpenChange={setOpen}>
                <Dialog.Trigger asChild>
                    <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={disabled}>
                        <Plus size={17} aria-hidden="true"/>{value.length ? 'Manage questions' : 'Choose questions'}
                    </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                    <Dialog.Overlay className="pm-pmp-sample-overlay"/>
                    <Dialog.Content className="pm-pmp-sample-dialog" aria-describedby="pm-pmp-sample-dialog-description"
                        onOpenAutoFocus={event => { event.preventDefault(); searchRef.current?.focus(); }}>
                        <header className="pm-pmp-sample-dialog-heading">
                            <div><Dialog.Title>Select sample exam questions</Dialog.Title>
                                <Dialog.Description id="pm-pmp-sample-dialog-description">Search the active question bank and choose up to 20 questions. Their order can be changed below.</Dialog.Description></div>
                            <Dialog.Close className="pm-pmp-sample-dialog-x" aria-label="Close question selector"><X size={19}/></Dialog.Close>
                        </header>
                        <div className="pm-pmp-sample-filter-row">
                            <label className="pm-pmp-sample-search"><Search size={19} aria-hidden="true"/>
                                <input ref={searchRef} type="search" maxLength={100} value={search} onChange={event => setSearch(event.target.value)}
                                    placeholder="Search code, ID, or keyword" aria-label="Search active exam questions"/>
                            </label>
                            <select value={domain} onChange={event => setDomain(event.target.value)} aria-label="Filter questions by domain">
                                <option value="">All domains</option><option value="People">People</option>
                                <option value="Process">Process</option><option value="Business Environment">Business Environment</option>
                            </select>
                        </div>
                        <div className="pm-pmp-sample-search-meta"><span>First 20 matching active questions · Refine your search for more</span>
                            <div><strong>{value.length}/20 selected</strong>
                                <button type="button" disabled={loading || error || options.every(item => value.includes(item.id)) || value.length >= 20} onClick={addVisible}>Add shown</button>
                                <button type="button" disabled={!value.length} onClick={() => onChange([])}>Clear all</button>
                            </div>
                        </div>
                        <div className="pm-pmp-sample-results" aria-label="Search results">
                            {loading ? <p role="status" className="pm-pmp-sample-message">Searching active questions…</p>
                                : error ? <div role="alert" className="pm-pmp-sample-message">Could not load questions. <button type="button" className="pm-admin-button pm-admin-button-quiet" onClick={() => setRetry(current => current + 1)}>Retry search</button></div>
                                : options.length === 0 ? <p className="pm-pmp-sample-message">No matching active questions. Try another keyword.</p>
                                : options.map(item => <label className="pm-pmp-sample-result" key={item.id}>
                                    <input type="checkbox" checked={value.includes(item.id)} disabled={disabled || (value.length >= 20 && !value.includes(item.id))}
                                        onChange={() => addOrRemove(item)}/>
                                    <span><strong>{item.code}</strong><small>{item.domain}</small><span className="pm-pmp-sample-prompt">{item.prompt}</span></span>
                                </label>)}
                        </div>
                        <footer className="pm-pmp-sample-dialog-footer"><span>Selections are saved when you click <strong>Save exam settings</strong>.</span>
                            <Dialog.Close className="pm-admin-button pm-admin-button-primary">Done</Dialog.Close>
                        </footer>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
        {selected.length > 0 && <ol className="pm-pmp-sample-selected" aria-label="Selected sample questions in exam order">
            {selected.map((item, index) => <li key={item.id}>
                <span className="pm-pmp-sample-number">{index + 1}</span>
                <div className="pm-pmp-sample-selected-detail"><strong>{item.code} <span>· {item.domain}</span></strong>
                    <p title={item.prompt}>{item.prompt}</p>
                    {!item.is_active && <small role="alert" className="pm-pmp-sample-error">Inactive: remove this question before saving.</small>}
                </div>
                <div className="pm-pmp-sample-order-actions">
                    <button type="button" disabled={disabled || index === 0} title="Move up" aria-label={`Move ${item.code} up`} onClick={() => move(index, -1)}><ArrowUp size={16}/></button>
                    <button type="button" disabled={disabled || index === value.length - 1} title="Move down" aria-label={`Move ${item.code} down`} onClick={() => move(index, 1)}><ArrowDown size={16}/></button>
                    <button type="button" disabled={disabled} title="Remove question" aria-label={`Remove ${item.code}`} onClick={() => onChange(value.filter(id => id !== item.id))}><X size={17}/></button>
                </div>
            </li>)}
        </ol>}
        <p className="pm-pmp-sample-hint"><Check size={15} aria-hidden="true"/>The selected questions are used for the public sample only. The duration above is the total time for all selected questions.</p>
    </div>;
}
