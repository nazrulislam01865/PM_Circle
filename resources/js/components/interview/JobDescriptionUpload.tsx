import { CheckCircle2, LoaderCircle, UploadCloud, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';

type Props = { fileName: string; busy: boolean; disabled: boolean; onSelect: (file: File) => void; onRemove: () => void; onInvalid: (message: string) => void };

/** Accessible file picker; the parent uses the existing temporary JD extraction endpoint. */
export function JobDescriptionUpload({ fileName, busy, disabled, onSelect, onRemove, onInvalid }: Props) {
    const id = useId();
    const input = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const select = (files: FileList | null) => {
        if (disabled || !files?.length) return;
        const file = files[0];
        if (files.length !== 1 || !/\.(txt|docx|pdf)$/i.test(file.name) || file.size === 0 || file.size > 5 * 1024 * 1024) {
            onInvalid('Choose one non-empty TXT, DOCX or PDF file up to 5 MB.');
            return;
        }
        onSelect(file);
    };
    return <div className="pm-if-upload" role="group" aria-labelledby={`${id}-label`}>
        <strong id={`${id}-label`}>Attach a job description</strong>
        <div className={`pm-if-upload-zone${dragging ? ' is-dragging' : ''}${fileName ? ' has-file' : ''}`} aria-busy={busy} onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files); }}>
            <input ref={input} id={id} hidden type="file" accept=".txt,.docx,.pdf" disabled={disabled} onChange={event => { select(event.currentTarget.files); event.currentTarget.value = ''; }}/>
            <div className="pm-if-upload-icon">{busy ? <LoaderCircle size={24} className="pm-if-upload-spinner" aria-hidden="true"/> : fileName ? <CheckCircle2 size={24} aria-hidden="true"/> : <UploadCloud size={24} aria-hidden="true"/>}</div>
            <div className="pm-if-upload-copy" role="status"><strong>{busy ? 'Reading your job description…' : fileName || 'Drag and drop your job description here'}</strong><span id={`${id}-hint`} className="pm-if-note">{busy ? 'Extracting text from the selected file.' : fileName ? 'Text extracted. Review and edit it above.' : 'TXT, DOCX or text-based PDF · Up to 5 MB'}</span></div>
            <button type="button" className="pm-button pm-button-outline" disabled={disabled} aria-describedby={`${id}-hint`} onClick={() => input.current?.click()}>{fileName ? 'Replace file' : 'Browse files'}</button>
        </div>
        {fileName && !busy && <button type="button" className="pm-if-quiet pm-if-self" disabled={disabled} onClick={onRemove}><X size={15} aria-hidden="true"/> Remove attachment label (keep text)</button>}
    </div>;
}
