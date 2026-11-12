import { ImagePlus, Film, Send, Smile, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar } from '@/components/pm/Avatar';
import type { RequestToJoin } from '@/components/home/HomeEngagement';

export type SavedComment = {
    id: number;
    body: string;
    media_url?: string | null;
    created_at: string;
    likes_count: number;
    viewer_liked: boolean;
    viewer_reaction?: import('@/components/home/HomeEngagement').ReactionType | null;
    author: { name: string; avatar_path?: string | null };
    replies: SavedComment[];
};

const emojis = ['🙂', '😊', '❤️', '👍', '👏', '🙌', '🎉', '🤝', '💡', '🚀', '😮', '😢'];
const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const maxFileBytes = 5 * 1024 * 1024;
const commentDrafts = new Map<number, string>();

/** Shared, bounded comment/reply editor for the post detail page and expanded feed cards. */
export function CommentComposer({ postId, parentId = null, avatarName, avatarSrc, canInteract, onJoin, onCreated, onCancel, replyToName, compact = false }: {
    postId: number;
    parentId?: number | null;
    avatarName: string;
    avatarSrc?: string | null;
    canInteract: boolean;
    onJoin: RequestToJoin;
    onCreated: (comment: SavedComment) => void;
    onCancel?: () => void;
    replyToName?: string;
    compact?: boolean;
}) {
    const [body, setBody] = useState(() => compact ? '' : (commentDrafts.get(postId) ?? ''));
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const photoInput = useRef<HTMLInputElement>(null);
    const gifInput = useRef<HTMLInputElement>(null);
    const editor = useRef<HTMLTextAreaElement>(null);
    const isReply = parentId !== null;
    const trimmedLength = Array.from(body.trim()).length;
    const valid = trimmedLength >= 2 || (Boolean(file) && trimmedLength === 0);

    useEffect(() => {
        if (!file) { setPreview(null); return; }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    useEffect(() => { if (isReply) editor.current?.focus(); }, [isReply]);

    const selectFile = (selected?: File) => {
        if (!selected) return;
        if (!allowed.includes(selected.type) || selected.size > maxFileBytes) {
            setError('Choose a PNG, JPEG, WebP, or GIF image up to 5 MB.');
            return;
        }
        setFile(selected);
        setError('');
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canInteract) { onJoin(isReply ? 'reply to a comment' : 'comment on a post'); return; }
        if (!valid || busy) return;
        setBusy(true); setError('');
        try {
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const payload = new FormData();
            if (body.trim()) payload.append('body', body.trim());
            if (file) payload.append('media', file);
            if (parentId !== null) payload.append('parent_id', String(parentId));
            const response = await fetch(`/posts/${postId}/comments`, {
                method: 'POST', credentials: 'same-origin',
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': token },
                body: payload,
            });
            if (!response.ok) {
                if (response.status === 419) throw new Error('Session expired. Refresh and try again.');
                if (response.status === 422) {
                    const details = await response.json().catch(() => ({})) as { errors?: Record<string, string[]>; message?: string };
                    throw new Error(Object.values(details.errors ?? {})[0]?.[0] ?? details.message ?? 'Please check your comment.');
                }
                throw new Error('Unable to save your comment. Please try again.');
            }
            const result = await response.json() as { comment: SavedComment };
            setBody(''); if (!compact) commentDrafts.delete(postId); setFile(null); setEmojiOpen(false);
            onCreated(result.comment);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to save your comment.');
        } finally { setBusy(false); }
    };

    return <form className={`pm-comment-compose${compact ? ' pm-comment-compose--reply' : ''}`} onSubmit={event => { void submit(event); }} aria-label={isReply ? `Reply to ${replyToName ?? 'comment'}` : 'Write a comment'}>
        <Avatar name={avatarName} src={avatarSrc} size={compact ? 32 : 38} />
        <div className="pm-comment-compose-field">
            {isReply && <div className="pm-comment-reply-context"><span>Reply to {replyToName ?? 'comment'}</span><button type="button" onClick={onCancel} aria-label="Cancel reply"><X size={15}/></button></div>}
            <textarea ref={editor} aria-label={isReply ? 'Write a reply' : 'Add a comment'}
                placeholder={isReply ? `Reply to ${replyToName ?? 'comment'}...` : 'Write a comment...'}
                maxLength={3000} rows={compact ? 1 : 2} value={body}
                onChange={event => { setBody(event.target.value); if (!compact) commentDrafts.set(postId, event.target.value); }} readOnly={!canInteract}
                onFocus={() => { if (!canInteract) onJoin(isReply ? 'reply to a comment' : 'comment on a post'); }}/>
            {preview && <div className="pm-comment-media-preview"><img src={preview} alt="Selected attachment preview"/><span>{file?.name}</span><button type="button" onClick={() => setFile(null)} aria-label="Remove image"><X size={17}/></button></div>}
            <div className="pm-comment-compose-toolbar">
                <div className="pm-comment-tools">
                    <button type="button" title="Insert emoji" aria-label="Insert emoji" aria-expanded={emojiOpen} disabled={!canInteract || busy} onClick={() => setEmojiOpen(open => !open)}><Smile size={19}/></button>
                    <button type="button" title="Attach an image" aria-label="Attach an image" disabled={!canInteract || busy} onClick={() => photoInput.current?.click()}><ImagePlus size={19}/></button>
                    <button type="button" title="Attach a GIF" aria-label="Attach a GIF" disabled={!canInteract || busy} onClick={() => gifInput.current?.click()}><Film size={19}/><span className="sr-only">GIF</span></button>
                    <input type="file" ref={photoInput} hidden accept="image/jpeg,image/png,image/webp" onChange={event => { selectFile(event.target.files?.[0]); event.target.value = ''; }}/>
                    <input type="file" ref={gifInput} hidden accept="image/gif" onChange={event => { selectFile(event.target.files?.[0]); event.target.value = ''; }}/>
                </div>
                <span className="pm-comment-character-count">{body.length}/3000</span>
                <button className="pm-button pm-button-sm pm-comment-submit" type="submit" disabled={!canInteract || !valid || busy}>
                    <Send size={16} aria-hidden="true"/>{busy ? 'Sending...' : isReply ? 'Reply' : 'Comment'}
                </button>
            </div>
            {emojiOpen && <div className="pm-comment-emoji-list" role="group" aria-label="Choose an emoji">{emojis.map(emoji => <button key={emoji} type="button" aria-label={`Insert ${emoji}`} onClick={() => { setBody(previous => { const value = previous + emoji; if (!compact) commentDrafts.set(postId, value); return value; }); editor.current?.focus(); setEmojiOpen(false); }}>{emoji}</button>)}</div>}
            {error && <p className="pm-inline-comment-error" role="alert">{error}</p>}
        </div>
    </form>;
}
