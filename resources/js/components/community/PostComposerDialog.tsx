import { router, usePage } from '@inertiajs/react';
import { Bold, ImagePlus, Italic, List, ListOrdered, Smile, Underline, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PMDropdown } from '@/components/pm/PMDropdown';
import type { DashboardPlan } from '@/types/dashboard';

export type EditablePost = { id: number; body: string; image_path?: string | null; topic?: string; is_anonymous?: boolean; visibility?: string };
const emojiList = ['🙂', '😊', '👏', '🙌', '🎉', '💡', '👍', '🚀', '❤️', '🤝', '💬', '✅'];

/** Serialize the same safe formatting subset as the shared PostContent renderer. */
function editorText(root: HTMLElement): string {
    const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const element = node as HTMLElement;
        const tag = element.tagName.toLowerCase();
        if (tag === 'br') return '\n';
        const text = Array.from(node.childNodes).map(walk).join('');
        if (tag === 'strong' || tag === 'b') return text ? `**${text}**` : '';
        if (tag === 'i' || tag === 'em') return text ? `*${text}*` : '';
        if (tag === 'u') return text ? `++${text}++` : '';
        if (tag === 'li') return `${element.parentElement?.tagName === 'OL' ? `${Array.from(element.parentElement.children).indexOf(element) + 1}.` : '-'} ${text.trim()}\n`;
        if (tag === 'div' || tag === 'p') return `${text}\n`;
        return text;
    };
    return Array.from(root.childNodes).map(walk).join('').replace(/\n{3,}/g, '\n\n').trim();
}

export function PostComposerDialog({ open, onClose, plan = 'free', editPost, onUpdated }: {
    open: boolean;
    onClose: () => void;
    plan?: DashboardPlan;
    editPost?: EditablePost | null;
    onUpdated?: (updated: { body: string; image_path: string | null }) => void;
}) {
    const { auth } = usePage<{ auth?: { user?: { name: string; avatar_path?: string | null } | null } }>().props;
    const name = auth?.user?.name ?? 'Member';
    const [identity, setIdentity] = useState('named');
    const [audience, setAudience] = useState('public');
    const [topic, setTopic] = useState('From my project');
    const [body, setBody] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [busy, setBusy] = useState(false);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [error, setError] = useState('');
    const editor = useRef<HTMLDivElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const editing = Boolean(editPost);
    const canAnonymous = plan === 'premium' || plan === 'pro';

    useEffect(() => {
        if (!open) return;
        setIdentity(editPost?.is_anonymous ? 'anonymous' : 'named');
        setAudience(editPost?.visibility === 'members' ? 'members' : 'public');
        setTopic(editPost?.topic ?? 'From my project');
        setBody(editPost?.body ?? '');
        setImage(null);
        setRemoveImage(false);
        setPollOptions(['', '']);
        setBusy(false);
        setEmojiOpen(false);
        setError('');
    }, [open, editPost]);
    useEffect(() => {
        if (!image) { setPreview(null); return; }
        const url = URL.createObjectURL(image);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [image]);

    const characterCount = Array.from(body).length;
    const pollReady = topic !== 'Poll' || (pollOptions.length >= 2 && pollOptions.every(option => option.trim()) && new Set(pollOptions.map(option => option.trim().toLowerCase())).size === pollOptions.length);
    const hasMedia = Boolean(image || (editPost?.image_path && !removeImage));
    const canSubmit = !busy && characterCount <= 5000 && (body.trim().length > 0 || hasMedia) && pollReady;
    const close = () => { if (!busy) onClose(); };
    const chooseFile = (file?: File) => {
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            setError('Choose a JPG, PNG, or WebP image up to 5 MB.');
            if (fileInput.current) fileInput.current.value = '';
            return;
        }
        setError(''); setImage(file); setRemoveImage(false);
    };
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const text = editor.current ? editorText(editor.current) : body;
        if (!text && !hasMedia) { setError('Write a post or attach an image.'); return; }
        if (Array.from(text).length > 5000) { setError('Post text cannot exceed 5,000 characters.'); return; }
        if (!pollReady) { setError('Add at least two different poll choices.'); return; }
        setBusy(true); setError('');
        const payload = new FormData();
        payload.append('body', text);
        if (image) payload.append('image', image);
        if (editPost) {
            payload.append('_method', 'PATCH');
            if (removeImage) payload.append('remove_image', '1');
            fetch(`/posts/${editPost.id}`, {
                method: 'POST', credentials: 'same-origin', body: payload,
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '' },
            }).then(async response => {
                if (!response.ok) {
                    const result = await response.json().catch(() => null) as { errors?: Record<string, string[]> } | null;
                    throw new Error(result?.errors ? Object.values(result.errors)[0]?.[0] : response.status === 419 ? 'Session expired. Refresh and try again.' : 'Unable to update your post.');
                }
                const result = await response.json() as { body: string; image_path: string | null };
                onUpdated?.(result);
                onClose();
            }).catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to update the post.')).finally(() => setBusy(false));
        } else {
            payload.append('topic', topic);
            payload.append('visibility', audience);
            payload.append('is_anonymous', identity === 'anonymous' ? '1' : '0');
            payload.append('return_to', 'dashboard');
            if (topic === 'Poll') pollOptions.forEach((option, index) => payload.append(`poll_options[${index}]`, option.trim()));
            router.post('/posts', payload, {
                preserveScroll: true, forceFormData: true,
                onSuccess: () => { setBusy(false); onClose(); },
                onError: errors => { setBusy(false); setError(Object.values(errors)[0] ?? 'Unable to publish your post.'); },
                onFinish: () => setBusy(false),
            });
        }
    };
    const insertText = (text: string) => {
        editor.current?.focus();
        document.execCommand('insertText', false, text);
        if (editor.current) setBody(editorText(editor.current));
        setEmojiOpen(false);
    };
    const format = (command: string) => {
        editor.current?.focus();
        document.execCommand(command, false);
        if (editor.current) setBody(editorText(editor.current));
    };

    return <Dialog open={open} onOpenChange={next => { if (!next) close(); }}>
        <DialogContent className="pm-compose-dialog pm-compose-prototype" aria-describedby="pm-compose-help" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onInteractOutside={event => { if (busy) event.preventDefault(); }}
            onOpenAutoFocus={event => { event.preventDefault(); if (editor.current) { editor.current.textContent = editPost?.body ?? ''; editor.current.focus(); } }}>
            <DialogTitle className="pm-compose-title">{editing ? 'Edit post' : 'Create a post'}</DialogTitle>
            <DialogDescription id="pm-compose-help" className="pm-compose-sr-description">Share your experience with the community. Only your text and selected audience are shared.</DialogDescription>
            <div className="pm-compose-identity-bar">
                <DashboardAvatar name={identity === 'anonymous' ? 'Anonymous member' : name} size={40} src={identity === 'anonymous' ? null : auth?.user?.avatar_path}/>
                {editing ? <strong>{editPost?.is_anonymous ? 'Anonymous member' : name}</strong> : <div className="pm-compose-identity-choice"><span className="pm-compose-label-spacer" aria-hidden="true"/><PMDropdown id="pm-compose-identity" value={identity} onValueChange={setIdentity} options={[{ value: 'named', label: name }, ...(canAnonymous ? [{ value: 'anonymous', label: 'Post anonymously' }] : [])]} placeholder="Post as" /></div>}
                <div className="pm-compose-audience"><label htmlFor="pm-compose-audience">Audience</label>
                    {editing ? <span>{audience === 'public' ? 'Public' : 'Community members only'}</span> : <PMDropdown id="pm-compose-audience" value={audience} onValueChange={setAudience} options={[{ value: 'public', label: 'Public' }, { value: 'members', label: 'Community members only' }]} placeholder="Audience" />}
                </div>
            </div>
            {!editing && identity === 'anonymous' && <p className="pm-compose-anon-note">Viewers will see Anonymous member. PM Circle administrators can see your identity. Your post will be reviewed before publication.</p>}
            <form className="pm-compose-form" onSubmit={submit}>
                <div className="pm-compose-scroll-region">
                <div ref={editor} className="pm-compose-editor" contentEditable={!busy} role="textbox" aria-label="Post content" aria-multiline="true" data-placeholder={topic === 'Ask the community' ? 'Ask the community a question...' : topic === 'Poll' ? 'What would you like to ask?' : 'Share your thoughts...'} suppressContentEditableWarning onInput={() => { if (editor.current) setBody(editorText(editor.current)); }} onPaste={event => { event.preventDefault(); insertText(event.clipboardData.getData('text/plain')); }} />
                {(preview || (editPost?.image_path && !removeImage)) && <div className="pm-compose-image"><img alt="Post image preview" src={preview ?? editPost?.image_path ?? ''}/><button type="button" onClick={() => { setImage(null); setRemoveImage(true); if (fileInput.current) fileInput.current.value = ''; }} aria-label="Remove image"><X size={18}/></button></div>}
                {topic === 'Poll' && !editing && <div className="pm-compose-poll-options"><label>Poll choices</label>{pollOptions.map((option, index) => <div key={index} className="pm-compose-poll-choice"><input aria-label={`Poll choice ${index + 1}`} maxLength={120} value={option} onChange={event => setPollOptions(prev => prev.map((value, i) => i === index ? event.target.value : value))} placeholder={`Option ${index + 1}`}/>{pollOptions.length > 2 && <button type="button" aria-label={`Remove choice ${index + 1}`} onClick={() => setPollOptions(prev => prev.filter((_, i) => i !== index))}><X size={16}/></button>}</div>)}{pollOptions.length < 4 && <button type="button" className="pm-compose-add-option" onClick={() => setPollOptions(prev => [...prev, ''])}>+ Add option</button>}</div>}
                </div>
                <input ref={fileInput} type="file" className="pm-compose-file" accept="image/png,image/jpeg,image/webp" aria-label="Attach a post image" onChange={event => chooseFile(event.target.files?.[0])}/>
                <div className="pm-compose-toolbar" role="toolbar" aria-label="Format your post">
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => format('bold')} aria-label="Bold"><Bold size={18}/></button>
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => format('italic')} aria-label="Italic"><Italic size={18}/></button>
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => format('underline')} aria-label="Underline"><Underline size={18}/></button>
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => format('insertUnorderedList')} aria-label="Bulleted list"><List size={18}/></button>
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => format('insertOrderedList')} aria-label="Numbered list"><ListOrdered size={18}/></button>
                    <span className="pm-compose-tool-divider"/>
                    <button type="button" onClick={() => setEmojiOpen(v => !v)} aria-expanded={emojiOpen} aria-label="Insert emoji"><Smile size={18}/></button>
                    <button type="button" onClick={() => fileInput.current?.click()} aria-label="Attach image"><ImagePlus size={18}/></button>
                </div>
                {emojiOpen && <div className="pm-compose-emojis">{emojiList.map(emoji => <button key={emoji} type="button" onClick={() => insertText(emoji)}>{emoji}</button>)}</div>}
                {!editing && <div className="pm-compose-types"><span>Post type</span>{[{ value: 'From my project', label: 'Post' }, { value: 'Ask the community', label: 'Question' }, { value: 'Poll', label: 'Poll' }].map(option => <button key={option.value} type="button" className={topic === option.value ? 'is-selected' : ''} aria-pressed={topic === option.value} onClick={() => setTopic(option.value)}>{option.label}</button>)}</div>}
                {error && <p className="pm-post-action-error pm-compose-error" role="alert">{error}</p>}
                <div className="pm-compose-footer"><span>{characterCount} / 5000</span><button className="pm-button" type="submit" disabled={!canSubmit}>{busy ? 'Saving…' : editing ? 'Save changes' : identity === 'anonymous' ? 'Submit for review' : 'Post'}</button></div>
            </form>
        </DialogContent>
    </Dialog>;
}
