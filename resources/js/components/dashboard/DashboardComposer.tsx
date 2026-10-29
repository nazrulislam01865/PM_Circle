import { useForm } from '@inertiajs/react';
import { LockKeyhole, MessageSquareText, Pencil, VenetianMask, X } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';
import type { DashboardPlan } from '@/types/dashboard';

type ComposerTopic = 'From my project' | 'Ask the community';
export function DashboardComposer({ name, plan, demo }: { name: string; plan: DashboardPlan; demo: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const { data, setData, post, processing, errors, reset } = useForm<{ body: string; topic: ComposerTopic }>({ body: '', topic: 'From my project' });
    const open = (topic: ComposerTopic) => {
        setExpanded(true); setData('topic', topic);
        requestAnimationFrame(() => inputRef.current?.focus());
    };
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post('/posts', { preserveScroll: true, onSuccess: () => { reset(); setExpanded(false); } });
    };
    return <form className="pm-dash-card pm-dash-composer" onSubmit={submit}>
        <div className="pm-dash-composer-top"><DashboardAvatar name={name} size={54} demo={demo}/>
            {expanded ? <textarea ref={inputRef} rows={3} maxLength={5000} required minLength={2} placeholder="Share a lesson, ask a question..." aria-label="Your community post" value={data.body} onChange={e => setData('body', e.target.value)} /> : <button type="button" className="pm-dash-composer-input" onClick={() => open('From my project')}>Share a lesson, ask a question...</button>}
        </div>
        <div className="pm-dash-composer-buttons"><button type="button" onClick={() => open('From my project')} className="pm-dash-btn pm-dash-btn-primary"><Pencil size={21}/> Post</button>
            <button type="button" onClick={() => open('Ask the community')} className="pm-dash-btn pm-dash-btn-soft"><MessageSquareText size={23}/> Ask community</button>
            <button type="button" disabled={plan === 'free'} onClick={() => toast.info('Anonymous posting is not available in the current release.')} className={`pm-dash-btn ${plan === 'free' ? 'pm-dash-btn-disabled' : 'pm-dash-btn-outline'}`}><VenetianMask size={22}/> Ask anonymously {plan === 'free' && <><LockKeyhole size={19} className="pm-dash-lock"/><span className="pm-dash-plan-pill">Pro / Premium</span></>}</button>
        </div>
        <p className="pm-dash-composer-note">{plan === 'free' ? 'Upgrade to ask anonymously.' : 'Your name is hidden from members; moderators can review your identity.'}</p>
        {expanded && <div className="pm-dash-composer-submit">{errors.body && <p role="alert" className="pm-error">{errors.body}</p>}<span>{data.topic}</span><button type="button" className="pm-dash-compose-cancel" onClick={() => {reset(); setExpanded(false);}}><X size={15}/> Cancel</button><button className="pm-dash-btn pm-dash-btn-primary" disabled={processing || data.body.trim().length < 2} type="submit">{processing ? 'Publishing…' : 'Publish'}</button></div>}
    </form>;
}
