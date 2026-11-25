import { ImagePlus, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Props = {
    id: string;
    label: string;
    file: File | null;
    existingUrl?: string | null;
    removeExisting: boolean;
    onChange: (file: File | null, removeExisting: boolean) => void;
    buttonClass: string;
    disabled?: boolean;
    error?: string;
    hint?: string;
};

/** Select media locally; the parent submits it with its normal form. */
export function ImageUploadField({ id, label, file, existingUrl, removeExisting, onChange, buttonClass, disabled, error, hint }: Props) {
    const input = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [localError, setLocalError] = useState('');
    const [dragging, setDragging] = useState(false);
    useEffect(() => {
        if (!file) { setPreview(null); setLocalError(''); return; }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);
    const image = file ? preview : removeExisting ? null : existingUrl;
    const message = localError || error;
    function select(files: FileList | null) {
        if (disabled || !files?.length) return;
        const next = files[0];
        if (files.length !== 1 || !['image/jpeg', 'image/png', 'image/webp'].includes(next.type) || next.size > 5 * 1024 * 1024 || next.size === 0) {
            setLocalError('Choose one JPG, PNG or WebP image up to 5 MB.');
            return;
        }
        setLocalError('');
        onChange(next, false);
    }
    return <div className="pm-image-upload" role="group" aria-labelledby={`${id}-label`}>
        <div id={`${id}-label`} className="pm-image-upload-label">{label}</div>
        <div className={`pm-image-upload-zone${dragging ? ' is-dragging' : ''}`} onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); select(e.dataTransfer.files); }}>
            {image ? <img className="pm-image-upload-preview" src={image} alt={`${label} preview`}/> : <div className="pm-image-upload-placeholder"><ImagePlus aria-hidden="true"/><span>{removeExisting ? 'Image will be removed when saved' : 'No image selected'}</span></div>}
            <div className="pm-image-upload-info">
                <strong>{file ? file.name : image ? 'Current image' : 'Drag and drop an image here'}</strong>
                <small id={`${id}-hint`}>{hint ?? 'JPG, PNG or WebP · Up to 5 MB · Max 6000 × 6000 pixels'}</small>
                <input ref={input} id={id} type="file" hidden accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={e => { select(e.target.files); e.target.value = ''; }}/>
                <div className="pm-image-upload-actions">
                    <button className={buttonClass} type="button" disabled={disabled} aria-describedby={`${id}-hint${message ? ` ${id}-error` : ''}`} onClick={() => input.current?.click()}><UploadCloud aria-hidden="true"/>{image ? 'Replace image' : 'Choose image'}</button>
                    {file ? <button className={buttonClass} type="button" disabled={disabled} onClick={() => { setLocalError(''); onChange(null, false); }}><X aria-hidden="true"/>Clear selection</button> : image ? <button className={buttonClass} type="button" disabled={disabled} onClick={() => { setLocalError(''); onChange(null, true); }}><X aria-hidden="true"/>Remove image</button> : removeExisting ? <button className={buttonClass} type="button" disabled={disabled} onClick={() => onChange(null, false)}>Undo removal</button> : null}
                </div>
            </div>
        </div>
        {message && <p className="pm-image-upload-error" id={`${id}-error`} role="alert">{message}</p>}
    </div>;
}
