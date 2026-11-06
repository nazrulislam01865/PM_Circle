import { useForm, usePage } from '@inertiajs/react';
import { Bold, ImagePlus, Italic, List, ListOrdered, LockKeyhole, MessageSquareText, Pencil, Smile, Underline, VenetianMask, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { DashboardPlan } from '@/types/dashboard';

type ComposerTopic = 'From my project' | 'Ask the community';
type PostForm = { body: string; topic: ComposerTopic; image: File | null; is_anonymous: boolean; return_to: 'dashboard' };
const emojis = ['🙂', '😊', '👏', '🙌', '🎉', '💡', '👍', '🚀', '❤️', '🤝', '💬', '✅'];
const countCharacters = (text: string): number => Array.from(text).length;

/** Convert only known editor tags to a plain, safe formatting notation. */
function serializeEditor(root: HTMLElement): string {
    const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const element = node as HTMLElement;
        const tag = element.tagName.toLowerCase();
        if (tag === 'br') return '\n';
        const inner = Array.from(node.childNodes).map(walk).join('');
        if (tag === 'b' || tag === 'strong') return inner ? `**${inner}**` : '';
        if (tag === 'i' || tag === 'em') return inner ? `*${inner}*` : '';
        if (tag === 'u') return inner ? `++${inner}++` : '';
        if (tag === 'li') return `${element.parentElement?.tagName.toLowerCase() === 'ol' ? `${Array.from(element.parentElement.children).indexOf(element) + 1}.` : '-'} ${inner.trim()}\n`;
        if (tag === 'div' || tag === 'p') return `${inner}\n`;
        return inner;
    };
    return Array.from(root.childNodes).map(walk).join('').replace(/\n{3,}/g, '\n\n').trim();
}

export function DashboardComposer({ name, plan, demo }: { name: string; plan: DashboardPlan; demo: boolean }) {
    const { auth } = usePage<{ auth?: { user?: { avatar_path?: string | null } | null } }>().props;
    const [open, setOpen] = useState(false);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [localError, setLocalError] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const selectionRef = useRef<Range | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const { data, setData, transform, post, processing, errors, reset } = useForm<PostForm>({ body: '', topic: 'From my project', image: null, is_anonymous: false, return_to: 'dashboard' });
    useEffect(() => {
        if (!data.image) { setImagePreview(null); return; }
        const url = URL.createObjectURL(data.image);
        setImagePreview(url);
        return () => URL.revokeObjectURL(url);
    }, [data.image]);
    const start = (topic: ComposerTopic, anonymous = false) => {
        reset();
        setData({ body: '', topic, image: null, is_anonymous: anonymous, return_to: 'dashboard' });
        setLocalError('');
        selectionRef.current = null;
        setEmojiOpen(false);
        setOpen(true);
    };
    const close = () => {
        if (processing) return;
        setOpen(false);
        setEmojiOpen(false);
        setLocalError('');
        reset();
        if (editorRef.current) editorRef.current.innerHTML = '';
    };
    const rememberSelection = () => {
        const selection = window.getSelection();
        if (selection?.rangeCount && editorRef.current?.contains(selection.getRangeAt(0).commonAncestorContainer)) {
            selectionRef.current = selection.getRangeAt(0).cloneRange();
        }
    };
    const syncText = () => {
        rememberSelection();
        if (editorRef.current) setData('body', serializeEditor(editorRef.current));
    };
    const format = (command: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false);
        syncText();
    };
    const addEmoji = (emoji: string) => {
        editorRef.current?.focus();
        const selection = window.getSelection();
        if (selection && selectionRef.current) {
            selection.removeAllRanges();
            selection.addRange(selectionRef.current);
        }
        document.execCommand('insertText', false, emoji);
        syncText();
        setEmojiOpen(false);
    };
    const chooseImage = (file: File | undefined) => {
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            setLocalError('Choose a JPG, PNG, or WebP image up to 5 MB.');
            if (fileRef.current) fileRef.current.value = '';
            return;
        }
        setLocalError('');
        setData('image', file);
    };
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const body = editorRef.current ? serializeEditor(editorRef.current) : data.body;
        if ((!body.trim() && !data.image) || countCharacters(body) > 5000) {
            setLocalError('Write a post (up to 5000 characters), or attach an image.');
            return;
        }
        setLocalError('');
        // useForm automatically converts File attachments to multipart FormData.
        transform(current => ({ ...current, body }));
        post('/posts', { preserveScroll: true, forceFormData: true, onSuccess: close });
    };
    const characterCount = countCharacters(data.body);
    const canPost = (data.body.trim().length > 0 || data.image !== null) && characterCount <= 5000;
    return <>
        <div className="pm-dash-card pm-dash-composer">
            <div className="pm-dash-composer-top"><DashboardAvatar name={name} size={54} demo={demo} src={auth?.user?.avatar_path} />
                <button type="button" className="pm-dash-composer-input" onClick={() => start('From my project')}>Share a lesson, ask a question...</button>
            </div>
            <div className="pm-dash-composer-buttons">
                <button type="button" onClick={() => start('From my project')} className="pm-dash-btn pm-dash-btn-primary"><Pencil size={21}/> Post</button>
                <button type="button" onClick={() => start('Ask the community')} className="pm-dash-btn pm-dash-btn-soft"><MessageSquareText size={23}/> Ask community</button>
                <button type="button" disabled={plan === 'free'} onClick={() => start('Ask the community', true)} className={`pm-dash-btn ${plan === 'free' ? 'pm-dash-btn-disabled' : 'pm-dash-btn-outline'}`}><VenetianMask size={22}/> Ask anonymously {plan === 'free' && <><LockKeyhole size={19} className="pm-dash-lock"/><span className="pm-dash-plan-pill">Pro / Premium</span></>}</button>
            </div>
        </div>
        <Dialog open={open} onOpenChange={value => { if (!value) close(); }}>
            <DialogContent className="pm-compose-dialog" aria-describedby="pm-compose-description" onOpenAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => editorRef.current?.focus()); }} onInteractOutside={event => { if (processing) event.preventDefault(); }} onEscapeKeyDown={event => { if (processing) event.preventDefault(); }}>
                <DialogTitle className="pm-compose-title">{data.is_anonymous ? 'Ask anonymously' : data.topic === 'Ask the community' ? 'Ask the community' : 'Create a post'}</DialogTitle>
                <DialogDescription id="pm-compose-description" className="pm-compose-sr-description">Share a public post with the PM Circle community.</DialogDescription>
                <div className="pm-compose-identity"><DashboardAvatar name={data.is_anonymous ? 'Anonymous member' : name} size={56} demo={data.is_anonymous ? false : demo} src={data.is_anonymous ? null : auth?.user?.avatar_path}/><div><strong>{data.is_anonymous ? 'Anonymous member' : name}</strong><span>{data.topic === 'Ask the community' ? 'Question' : 'Post'} · Public</span></div></div>
                <form className="pm-compose-form" onSubmit={submit}>
                    <div ref={editorRef} className="pm-compose-editor" contentEditable={!processing} role="textbox" aria-multiline="true" aria-label="Post text" data-placeholder="Share your thoughts ..." suppressContentEditableWarning onInput={syncText} onKeyUp={rememberSelection} onMouseUp={rememberSelection} onPaste={event => { event.preventDefault(); const text = event.clipboardData.getData('text/plain'); document.execCommand('insertText', false, text); syncText(); }} />
                    {imagePreview && <div className="pm-compose-image"><img alt="Post attachment preview" src={imagePreview}/><button type="button" onClick={() => { setData('image', null); if (fileRef.current) fileRef.current.value = ''; }} aria-label="Remove attached image"><X size={18}/></button></div>}
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="pm-compose-file" onChange={event => chooseImage(event.target.files?.[0])} aria-label="Choose a post image" />
                    <div className="pm-compose-toolbar" role="toolbar" aria-label="Post formatting tools">
                        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => format('bold')} aria-label="Bold selected text" title="Bold"><Bold size={21}/></button>
                        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => format('italic')} aria-label="Italic selected text" title="Italic"><Italic size={21}/></button>
                        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => format('underline')} aria-label="Underline selected text" title="Underline"><Underline size={21}/></button>
                        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => format('insertUnorderedList')} aria-label="Bulleted list" title="Bulleted list"><List size={22}/></button>
                        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => format('insertOrderedList')} aria-label="Numbered list" title="Numbered list"><ListOrdered size={22}/></button>
                        <span className="pm-compose-tool-divider"/>
                        <button type="button" onClick={() => setEmojiOpen(value => !value)} aria-label="Insert emoji" aria-expanded={emojiOpen} title="Emoji"><Smile size={22}/></button>
                        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Add image" title="Add image"><ImagePlus size={22}/></button>
                    </div>
                    {emojiOpen && <div className="pm-compose-emojis" aria-label="Choose an emoji">{emojis.map(emoji => <button type="button" key={emoji} aria-label={`Insert ${emoji}`} onClick={() => addEmoji(emoji)}>{emoji}</button>)}</div>}
                    {(localError || errors.body || errors.image || errors.is_anonymous) && <p role="alert" className="pm-error pm-compose-error">{localError || errors.body || errors.image || errors.is_anonymous}</p>}
                    <div className="pm-compose-footer"><span>{characterCount} / 5000</span><button className="pm-button" type="submit" disabled={processing || !canPost}>{processing ? 'Posting…' : 'Post'}</button></div>
                </form>
            </DialogContent>
        </Dialog>
    </>;
}
