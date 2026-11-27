import { usePage } from '@inertiajs/react';
import { AlertCircle, ChevronDown, ChevronUp, LoaderCircle, MessageCircle, Send, Sparkles } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

type FeatureSettings = { enabled: boolean; cost: number; max_chars: number };
type ChatMessage = { id: number; role: 'user' | 'assistant'; content: string | { explanation?: string; answer?: string; nextStep?: string | null } };
type TokenBalance = { allocated: number; used: number; pending: number; remaining: number; reset_at: string };
type PendingRequest = { request_id: string; status: string };
type LimitBucket = { used: number; pending: number; limit: number; reset_at?: string };
type ChatSession = {
    conversation_id: number | null;
    first_completed: boolean;
    messages: ChatMessage[];
    pending: PendingRequest | null;
    credits_available: number;
    tokens: TokenBalance | null;
    features: { pmp_explain: FeatureSettings; pmp_followup: FeatureSettings };
    limits: { daily?: LimitBucket; cycle?: LimitBucket; conversation?: LimitBucket } | null;
    limit_error: string | null;
};
type AiReceipt = { request_id: string; status: string };

const errorMessages: Record<string, string> = {
    FEATURE_DISABLED: 'AI tutoring is not enabled for this account yet.',
    NOT_ENTITLED: 'An active Plus or Pro membership is required for exam AI tutoring.',
    INSUFFICIENT_CREDITS: 'You do not have enough AI credits for this message.',
    CHAT_LIMIT_REACHED: 'You have reached your AI chat limit. Check the reset time below.',
    CONVERSATION_LIMIT_REACHED: 'The AI reply limit for this question has been reached.',
    FIRST_EXPLANATION_REQUIRED: 'An initial explanation is required before follow-up messages.',
    EXPLANATION_ALREADY_AVAILABLE: 'Your initial explanation is saved below. You can continue chatting.',
    ALREADY_RUNNING: 'A reply for this question is already being prepared.',
    CONVERSATION_CLOSED: 'This conversation has been closed.',
    RATE_LIMITED: 'Too many requests. Please try again shortly.',
    PRICE_CHANGED: 'The credit price changed. Review the new price and send again.',
    PROVIDER_UNAVAILABLE: 'The AI provider is temporarily unavailable. No credits were charged for a failed reply.',
    AI_PROCESSING_FAILED: 'The AI reply could not be completed. Your reserved credits should be released.',
    PROMPT_NOT_PUBLISHED: 'The AI tutor is awaiting administrator configuration.',
    MODEL_PRICE_NOT_APPROVED: 'The AI model needs administrator pricing approval.',
    CHAT_POLICY_NOT_CONFIGURED: 'The administrator has not configured AI chat limits yet.',
    MODERATION_UNAVAILABLE: 'The AI safety service is unavailable.',
    TOKEN_ALLOCATION_NOT_CONFIGURED: 'Your PMP AI token allocation is awaiting administrator setup.',
    AI_TOKEN_LIMIT_REACHED: 'Your PMP AI token allocation is exhausted or cannot cover another reply. It resets with your membership cycle.',
};

function describeError(code: string, fallback = 'AI chat is temporarily unavailable. Please try again.'): string {
    return errorMessages[code] ?? fallback;
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    const response = await fetch(path, {
        credentials: 'same-origin', cache: 'no-store',
        ...options,
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': token, ...(options?.headers ?? {}) },
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
        const code = data && typeof data === 'object' && 'code' in data && typeof data.code === 'string'
            ? data.code : '';
        if (response.status === 419) throw new Error('Your session expired. Refresh the page and sign in again.');
        if (response.status === 403) throw new Error(describeError(code, 'You cannot access this exam AI conversation.'));
        if (response.status === 404) throw new Error('This completed exam question is no longer available.');
        throw new Error(describeError(code));
    }
    return data as T;
}

/** Question-specific chat: only IDs are submitted; exam content is fetched again by Laravel. */
export function PmpQuestionAiChat({ attemptId, questionId, questionMeta }: { attemptId: number; questionId: number; questionMeta: string }) {
    const warnLowBalance = usePage<{auth?: {user?: {settings?: {warn_low_balance?: boolean}} | null}}>().props.auth?.user?.settings?.warn_low_balance !== false;
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<ChatSession | null>(null);
    const [draft, setDraft] = useState('');
    const [error, setError] = useState('');
    const [pending, setPending] = useState<PendingRequest | null>(null);
    const [pendingText, setPendingText] = useState('');
    const [sending, setSending] = useState(false);
    const inFlightKey = useRef<string | null>(null);
    const transcript = useRef<HTMLDivElement | null>(null);
    const mounted = useRef(true);
    const panelId = useId();
    const endpoint = `/exams/pmp/attempts/${attemptId}/questions/${questionId}/ai-chat`;

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const refresh = async () => {
        const data = await requestJson<ChatSession>(endpoint);
        if (mounted.current) {
            setSession(data);
            setPending(data.pending);
        }
        return data;
    };

    const toggle = async () => {
        if (open) { setOpen(false); return; }
        setOpen(true);
        setError('');
        setLoading(true);
        try { await refresh(); } catch (e) {
            if (mounted.current) setError(e instanceof Error ? e.message : 'Could not load this conversation.');
        } finally { if (mounted.current) setLoading(false); }
    };

    useEffect(() => {
        if (!open || !pending?.request_id) return;
        let stopped = false;
        let timer: ReturnType<typeof setTimeout>;
        let attempts = 0;
        const poll = async () => {
            try {
                const state = await requestJson<{ status: string; code?: string }>(`/ai/requests/${pending.request_id}`);
                if (stopped) return;
                if (state.status === 'completed' || state.status === 'failed' || state.status === 'cancelled') {
                    if (state.status !== 'completed') setError(describeError(state.code ?? 'AI_PROCESSING_FAILED'));
                    setPendingText('');
                    inFlightKey.current = null;
                    await refresh();
                    return;
                }
                if (state.status === 'provider_status_unknown') {
                    setError('The AI response is being reconciled. Your pending credits are protected.');
                }
            } catch {
                if (!stopped) setError('Connection interrupted. You can refresh the chat to check your reply.');
            }
            if (!stopped && attempts++ < 90) {
                timer = setTimeout(() => void poll(), Math.min(5000, 1500 + attempts * 250));
            } else if (!stopped) {
                setError('The reply is taking longer than expected. Use Refresh chat to check its status.');
            }
        };
        timer = setTimeout(() => void poll(), 1300);
        return () => { stopped = true; clearTimeout(timer); };
    }, [open, pending?.request_id, endpoint]);

    useEffect(() => {
        if (!open) return;
        const element = transcript.current;
        if (element) element.scrollTop = element.scrollHeight;
    }, [open, session?.messages.length, pendingText]);

    const isFollowup = Boolean(session?.first_completed);
    const feature = isFollowup ? 'pmp_followup' : 'pmp_explain';
    const settings = session?.features[feature];
    const maxChars = Math.min(2000, settings?.max_chars ?? 2000);
    const quotaReached = [session?.limits?.daily, session?.limits?.cycle, session?.limits?.conversation]
        .some(bucket => bucket && bucket.used + bucket.pending >= bucket.limit);
    const cannotSend = !session || !settings?.enabled || Boolean(session.limit_error) ||
        Boolean(pending) || sending || quotaReached ||
        Boolean(session?.tokens && session.tokens.remaining === 0) ||
        session.credits_available < (settings?.cost ?? 0);

    const send = async (event?: FormEvent) => {
        event?.preventDefault();
        if (cannotSend || !session) return;
        const text = draft.trim();
        if (isFollowup && text.length < 2) { setError('Type a question with at least two characters.'); return; }
        if (text.length > maxChars) { setError(`Keep your message under ${maxChars} characters.`); return; }
        setSending(true);
        setError('');
        try {
            // Reuse the same key on a network retry: no duplicate charge or chat slot.
            const key = inFlightKey.current ?? crypto.randomUUID();
            inFlightKey.current = key;
            const receipt = await requestJson<AiReceipt>('/ai/requests', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_request_key: key, feature,
                    subject: { attempt_id: attemptId, question_id: questionId },
                    message: text || null,
                    accepted_max_credits: settings!.cost,
                }),
            });
            setDraft('');
            setPendingText(text);
            setPending({ request_id: receipt.request_id, status: receipt.status });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not send your message.');
            // A changed price requires new explicit consent; never replay the stale price.
            if (e instanceof Error && e.message === errorMessages.PRICE_CHANGED) inFlightKey.current = null;
        } finally { if (mounted.current) setSending(false); }
    };

    return <section className="pm-pmp-review-ai" aria-label="AI tutoring for this question">
        <div className="pm-review-question-footer">
            <button type="button" className="pm-review-outline-button pm-review-ai-toggle"
                onClick={() => void toggle()} aria-expanded={open} aria-controls={panelId}>
                <MessageCircle size={16} aria-hidden="true"/>
                Ask AI About This Answer
                {open ? <ChevronUp size={15} aria-hidden="true"/> : <ChevronDown size={15} aria-hidden="true"/>}
            </button>
            <span className="pm-review-question-meta">{questionMeta}</span>
        </div>
        {open && <div id={panelId} className="pm-review-ai-chat">
            <header className="pm-review-ai-chat-header">
                <div><h3><Sparkles size={17} aria-hidden="true"/> PMP Question Tutor</h3>
                    <p>Discuss this completed question, its choices, your answer and the explanation.</p></div>
                <button type="button" className="pm-review-ai-refresh" disabled={loading}
                    onClick={() => { setError(''); setLoading(true); void refresh().catch(() => setError('Could not refresh chat.')).finally(() => setLoading(false)); }}>
                    Refresh chat
                </button>
            </header>
            {loading && <p className="pm-review-ai-loading" role="status"><LoaderCircle className="pm-review-ai-spin" size={17}/> Loading your question chat…</p>}
            {session && <>
                <div className="pm-review-ai-transcript" ref={transcript} role="log" aria-label="Question AI conversation" aria-live="polite" aria-relevant="additions text">
                    {session.messages.length === 0 && <p className="pm-review-ai-empty">Ask something about this answer, or generate an AI explanation. The tutor will use only this completed question and your selected answer.</p>}
                    {session.messages.map(message => {
                        const content = message.content;
                        const text = typeof content === 'string' ? content : (content.explanation ?? content.answer ?? '');
                        const next = typeof content === 'string' ? null : content.nextStep;
                        return <div key={message.id} className={`pm-review-ai-message ${message.role === 'user' ? 'is-member' : 'is-tutor'}`}>
                            <strong>{message.role === 'user' ? 'You' : 'PM Circle AI'}</strong>
                            <p>{text}</p>
                            {next && <p className="pm-review-ai-next"><strong>Study next:</strong> {next}</p>}

                        </div>;
                    })}
                    {pending && <div className="pm-review-ai-message is-tutor is-pending">
                        {pendingText && <p className="pm-review-ai-pending-user">Your question: {pendingText}</p>}
                        <p role="status"><LoaderCircle className="pm-review-ai-spin" size={16} aria-hidden="true"/>
                            {pending.status === 'provider_status_unknown' ? 'Checking the provider response…' : 'Preparing your AI reply…'}</p>
                    </div>}
                </div>
                {error && <p className="pm-review-ai-error" role="alert"><AlertCircle size={16} aria-hidden="true"/> {error}</p>}
                {session.limit_error && <p className="pm-review-ai-notice" role="status">{describeError(session.limit_error)}</p>}
                {quotaReached && <p className="pm-review-ai-notice" role="status">Your daily, billing-cycle or question chat limit has been reached.</p>}
                {warnLowBalance && ((session.tokens && session.tokens.allocated > 0 && session.tokens.remaining > 0 && session.tokens.remaining <= session.tokens.allocated * 0.1) || (settings?.enabled && settings.cost > 0 && session.credits_available >= settings.cost && session.credits_available < settings.cost * 2)) && <p className="pm-review-ai-notice" role="status">Your AI balance is running low. Check your available tokens and credits before continuing.</p>}
                {session.tokens?.remaining === 0 && <p className="pm-review-ai-notice" role="status">Your allocated PMP AI tokens are exhausted for this membership cycle.</p>}
                {settings?.enabled && session.credits_available < settings.cost &&
                    <p className="pm-review-ai-notice" role="status">You need {settings.cost} AI credits for the next reply. Current balance: {session.credits_available}.</p>}
                {!settings?.enabled && <p className="pm-review-ai-notice" role="status">AI chat for this question is not enabled by the administrator yet. Saved replies remain visible above.</p>}
                {settings && <form className="pm-review-ai-composer" onSubmit={event => void send(event)}>
                    <label htmlFor={`${panelId}-message`}>Your question</label>
                    <textarea id={`${panelId}-message`} rows={2} maxLength={maxChars} value={draft}
                        onChange={event => { setDraft(event.target.value); setError(''); inFlightKey.current = null; }}
                        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }}
                        disabled={Boolean(pending)}
                        placeholder={isFollowup ? 'Ask a follow-up about this question…' : 'Ask about the answer or leave blank for an explanation…'} />
                    <div className="pm-review-ai-composer-bottom">
                        <p>{draft.length}/{maxChars} characters{settings.cost > 0 ? ` · ${settings.cost} credit${settings.cost === 1 ? '' : 's'} per reply` : ''}</p>
                        <button type="submit" className="pm-review-ai-send" disabled={cannotSend}>
                            {sending || pending ? <LoaderCircle className="pm-review-ai-spin" size={16} aria-hidden="true"/> : <Send size={16} aria-hidden="true"/>}
                            {pending ? 'Working…' : settings.cost > 0 ? `${isFollowup ? 'Send' : 'Ask AI'} · ${settings.cost} credit${settings.cost === 1 ? '' : 's'}` : isFollowup ? 'Send' : 'Ask AI'}
                        </button>
                    </div>
                </form>}
                <p className="pm-review-ai-disclaimer">AI educational guidance only—not official PMP certification scoring.{settings?.cost ? ' Sending confirms the displayed credit charge; failed replies are not billed.' : ''}</p>
            </>}
            {!session && error && <p className="pm-review-ai-error" role="alert">{error}</p>}
        </div>}
    </section>;
}
