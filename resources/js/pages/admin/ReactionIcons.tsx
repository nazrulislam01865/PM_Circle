import { router } from '@inertiajs/react';
import { Check, ImagePlus, Pencil, Plus, RotateCcw, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ReactionGlyph, type ReactionDefinition } from '@/components/home/HomeEngagement';
import { AdminLayout } from '@/layouts/admin/AdminLayout';

type IconSetting = ReactionDefinition;

function useImagePreview(file: File | null) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!file) { setUrl(null); return; }
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);
    return url;
}

function ReactionRow({ icon }: { icon: IconSetting }) {
    const [file, setFile] = useState<File | null>(null);
    const preview = useImagePreview(file);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [editing, setEditing] = useState(false);
    const [label, setLabel] = useState(icon.label);
    const [active, setActive] = useState(icon.active);
    const input = useRef<HTMLInputElement>(null);
    useEffect(() => { setLabel(icon.label); setActive(icon.active); }, [icon.label, icon.active]);

    function clearFile() {
        setFile(null);
        if (input.current) input.current.value = '';
    }

    function upload(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!file || busy) return;
        setError(''); setNotice(''); setBusy(true);
        router.post(`/admin/reaction-icons/${icon.type}`, { icon: file }, {
            forceFormData: true, preserveScroll: true,
            onSuccess: () => { clearFile(); setNotice('Icon saved across the community.'); },
            onError: errors => setError(errors.icon ?? 'Could not upload this image.'),
            onFinish: () => setBusy(false),
        });
    }

    function restore() {
        if (busy || !icon.url || !icon.builtin) return;
        setError(''); setNotice(''); setBusy(true);
        router.delete(`/admin/reaction-icons/${icon.type}`, {
            preserveScroll: true,
            onSuccess: () => { clearFile(); setNotice('Original icon restored.'); },
            onError: () => setError('Could not restore the built-in icon.'),
            onFinish: () => setBusy(false),
        });
    }

    function saveSettings(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (icon.builtin || busy) return;
        setError(''); setNotice(''); setBusy(true);
        router.patch(`/admin/reaction-icons/${icon.type}`, { label: label.trim(), active }, {
            preserveScroll: true,
            onSuccess: () => { setEditing(false); setNotice('Reaction settings updated.'); },
            onError: errors => setError(errors.label ?? errors.active ?? 'Could not save reaction settings.'),
            onFinish: () => setBusy(false),
        });
    }

    return <article className="pm-reaction-manager-row">
        <div className="pm-reaction-manager-main">
            <span className={`pm-reaction-admin-preview is-${icon.type}`} aria-hidden="true">
                <ReactionGlyph type={icon.type} size={30} urlOverride={icon.url}/>
            </span>
            <div className="pm-reaction-manager-name">
                <h3>{icon.label}</h3>
                <p>{icon.builtin ? (icon.url ? 'Custom image' : 'Original icon') : (icon.active ? 'Available to members' : 'Hidden from picker')}</p>
            </div>
            <div className="pm-reaction-manager-controls">
                <input ref={input} className="pm-reaction-manager-file" type="file"
                    id={`reaction-icon-${icon.type}`} accept="image/png,image/jpeg,image/webp" disabled={busy}
                    onChange={event => { setFile(event.target.files?.[0] ?? null); setError(''); setNotice(''); }}/>
                <button type="button" className="pm-admin-button" disabled={busy} onClick={() => input.current?.click()}>
                    <ImagePlus size={16} aria-hidden="true"/>Change image
                </button>
                {icon.builtin && icon.url && <button type="button" className="pm-admin-button" disabled={busy} onClick={restore}>
                    <RotateCcw size={15} aria-hidden="true"/>Restore
                </button>}
                {!icon.builtin && <button type="button" className="pm-admin-button" disabled={busy}
                    aria-expanded={editing} onClick={() => { setEditing(!editing); setError(''); }}>
                    <Pencil size={15} aria-hidden="true"/>{editing ? 'Close' : 'Edit'}
                </button>}
            </div>
        </div>
        {file && <form className="pm-reaction-manager-pending" onSubmit={upload}>
            {preview && <img src={preview} alt="New reaction image preview" width="40" height="40"/>}
            <span className="pm-reaction-manager-filename">{file.name}</span>
            <button className="pm-admin-button pm-admin-button-primary" disabled={busy} type="submit"><Upload size={15}/>{busy ? 'Saving…' : 'Save image'}</button>
            <button type="button" className="pm-admin-button" onClick={clearFile} disabled={busy} aria-label="Cancel image selection"><X size={16}/></button>
        </form>}
        {editing && !icon.builtin && <form className="pm-reaction-manager-edit" onSubmit={saveSettings}>
            <label className="pm-admin-field" htmlFor={`reaction-name-${icon.type}`}>
                <span>Reaction name</span>
                <input id={`reaction-name-${icon.type}`} value={label} maxLength={32} required disabled={busy}
                    onChange={event => setLabel(event.target.value)}/>
            </label>
            <label className="pm-reaction-manager-toggle"><input type="checkbox" checked={active} disabled={busy}
                onChange={event => setActive(event.target.checked)}/><span>Show this reaction in pickers</span></label>
            <button className="pm-admin-button pm-admin-button-primary" type="submit" disabled={busy || label.trim().length < 2}>
                <Check size={15}/>{busy ? 'Saving…' : 'Save changes'}
            </button>
            <p className="pm-reaction-manager-hint">Hiding a reaction keeps existing reactions and counts visible.</p>
        </form>}
        {error && <p className="pm-admin-error" role="alert">{error}</p>}
        {notice && <p className="pm-reaction-manager-success" role="status">{notice}</p>}
    </article>;
}

function AddReaction({ onClose }: { onClose: () => void }) {
    const [label, setLabel] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const preview = useImagePreview(file);
    const input = useRef<HTMLInputElement>(null);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!file || label.trim().length < 2 || busy) return;
        setBusy(true); setError('');
        router.post('/admin/reaction-icons', { label: label.trim(), icon: file }, {
            forceFormData: true, preserveScroll: true,
            onSuccess: () => { setFile(null); setLabel(''); onClose(); },
            onError: errors => setError(errors.label ?? errors.icon ?? 'Could not add this reaction.'),
            onFinish: () => setBusy(false),
        });
    }

    return <form className="pm-admin-panel pm-reaction-manager-create" onSubmit={submit}>
        <div className="pm-reaction-manager-create-heading"><div><h3>Add a reaction</h3><p>Members will see it in post, comment, and scenario reactions.</p></div>
            <button type="button" className="pm-reaction-manager-icon-button" aria-label="Close add reaction" onClick={onClose} disabled={busy}><X size={19}/></button>
        </div>
        <div className="pm-reaction-manager-create-fields">
            <label className="pm-admin-field" htmlFor="reaction-new-name"><span>Name</span>
                <input id="reaction-new-name" placeholder="e.g. Celebrate" autoFocus value={label} maxLength={32} required disabled={busy}
                    onChange={event => setLabel(event.target.value)}/>
            </label>
            <div className="pm-reaction-manager-image-picker">
                <span className="pm-reaction-manager-field-label">Reaction image</span>
                <input ref={input} className="pm-reaction-manager-file" type="file" id="reaction-new-image"
                    accept="image/png,image/jpeg,image/webp" disabled={busy}
                    onChange={event => { setFile(event.target.files?.[0] ?? null); setError(''); }}/>
                <button type="button" className="pm-admin-button" onClick={() => input.current?.click()} disabled={busy}>
                    <ImagePlus size={16}/>{file ? 'Change image' : 'Choose image'}
                </button>
                {preview && <img src={preview} alt="New reaction preview" width="40" height="40"/>}
                {file && <span className="pm-reaction-manager-filename">{file.name}</span>}
            </div>
        </div>
        <p className="pm-reaction-manager-hint">PNG, JPG, or WebP · 32–1024px · maximum 1 MB. Square, transparent images look best.</p>
        {error && <p className="pm-admin-error" role="alert">{error}</p>}
        <div className="pm-reaction-admin-actions">
            <button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={!file || label.trim().length < 2 || busy}>
                <Plus size={16}/>{busy ? 'Adding…' : 'Add reaction'}
            </button>
            <button type="button" className="pm-admin-button" disabled={busy} onClick={onClose}>Cancel</button>
        </div>
    </form>;
}

export default function ReactionIcons({ icons, maxCustom = 12 }: { icons: IconSetting[]; maxCustom?: number }) {
    const [adding, setAdding] = useState(false);
    const original = icons.filter(icon => icon.builtin);
    const custom = icons.filter(icon => !icon.builtin);

    return <AdminLayout active="/admin/reaction-icons" title="Reaction icons"
        subtitle="Manage the reactions members can use across PM Circle.">
        <div className="pm-reaction-manager-page">
            <div className="pm-reaction-manager-toolbar">
                <p><strong>{original.length} defaults</strong> · {custom.length} custom {custom.length === 1 ? 'reaction' : 'reactions'}</p>
                <button className="pm-admin-button pm-admin-button-primary" type="button" disabled={adding || custom.length >= maxCustom}
                    onClick={() => setAdding(true)}><Plus size={17} aria-hidden="true"/>Add reaction</button>
            </div>
            {adding && <AddReaction onClose={() => setAdding(false)}/>}
            <section className="pm-admin-panel pm-reaction-manager-section" aria-labelledby="reaction-default-title">
                <div className="pm-reaction-manager-section-head"><h2 id="reaction-default-title">Default reactions</h2>
                    <p>Change the image anytime, or restore the original.</p></div>
                <div className="pm-reaction-manager-list">{original.map(icon => <ReactionRow key={icon.type} icon={icon}/>)}</div>
            </section>
            <section className="pm-admin-panel pm-reaction-manager-section" aria-labelledby="reaction-custom-title">
                <div className="pm-reaction-manager-section-head"><h2 id="reaction-custom-title">Custom reactions</h2>
                    <p>Add, rename or hide your own reactions. Existing member reactions remain safe.</p></div>
                {custom.length === 0 ? <div className="pm-reaction-manager-empty">No custom reactions yet. Use <strong>Add reaction</strong> to create your first.</div>
                    : <div className="pm-reaction-manager-list">{custom.map(icon => <ReactionRow key={icon.type} icon={icon}/>)}</div>}
                {custom.length >= maxCustom && <p className="pm-reaction-manager-hint">Custom reaction limit ({maxCustom}) reached.</p>}
            </section>
        </div>
    </AdminLayout>;
}
