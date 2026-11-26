import { useEffect, useRef, useState } from 'react';
import { requestKey } from '@/lib/request-key';
import { interviewApi, type InterviewAnswer, type InterviewAiOffer, type InterviewAiReceipt } from './types';

const pending = (status?: string) => ['queued', 'running', 'reserved', 'provider_status_unknown'].includes(status ?? '');

/** Mounted per saved revision; no automatic provider call or credit charge. */
export function InterviewAiReview({ answer, offer, onReceipt }: { answer: InterviewAnswer; offer?: InterviewAiOffer | null; onReceipt?: (receipt: InterviewAiReceipt) => void }) {
    const [receipt, setReceipt] = useState<InterviewAiReceipt | null>(answer.ai_review ?? null);
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const key = useRef<string | null>(null);
    const sending = useRef(false);
    const notify = useRef(onReceipt); notify.current = onReceipt;
    useEffect(() => { if (receipt) notify.current?.(receipt); }, [receipt]);
    const id = receipt?.request_id;
    const needsRead = Boolean(id && (pending(receipt?.status) || (receipt?.status === 'completed' && !receipt.result)));
    useEffect(() => {
        if (!id || !needsRead) return;
        let active = true; let timer: ReturnType<typeof setTimeout>; let count = 0;
        const abort = new AbortController();
        const poll = async () => {
            try {
                const r = await fetch(`/ai/requests/${id}`, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: abort.signal });
                if (!r.ok) throw new Error('Unable to check AI review.');
                const result: InterviewAiReceipt = await r.json();
                if (!active) return;
                setReceipt(result);
                if (pending(result.status) && ++count < 60) timer = setTimeout(poll, 3000);
            } catch { if (active) setError('Unable to check AI review. Use Check status to retry.'); }
        };
        void poll();
        return () => { active = false; abort.abort(); clearTimeout(timer); };
    }, [id, needsRead]);
    const check = async () => {
        if (!id || sending.current) return;
        sending.current = true; setBusy(true); setError('');
        try { setReceipt(await interviewApi<InterviewAiReceipt>(`/ai/requests/${id}`)); }
        catch (e) { setError(e instanceof Error ? e.message : 'Status unavailable.'); }
        finally { sending.current = false; setBusy(false); }
    };
    const submit = async () => {
        if (!offer || !consent || !answer.id || !answer.revision || sending.current || pending(receipt?.status)) return;
        sending.current = true; setBusy(true); setError('');
        try {
            key.current ??= requestKey();
            const next = await interviewApi<InterviewAiReceipt>('/ai/requests', 'POST', {
                feature: 'interview_answer_review', client_request_key: key.current,
                subject: { answer_id: answer.id, answer_revision: answer.revision }, consent: true, accepted_max_credits: offer.credits,
            });
            key.current = null; setReceipt(next);
        } catch (e) { setError(e instanceof Error ? e.message : 'Unable to request AI review.'); }
        finally { sending.current = false; setBusy(false); }
    };
    if (answer.status !== 'evaluated' || (!offer && !receipt)) return null;
    const terminalFailure = receipt && ['failed', 'cancelled'].includes(receipt.status);
    return <section className="pm-if-box pm-if-stack-small" aria-label="AI answer review">
        <h3>AI answer review</h3>
        {offer && (!receipt || terminalFailure) && <>
            <label className="pm-account-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/> I agree to send this saved answer and question to the configured AI provider.</label>
            <div><button type="button" className="pm-button pm-button-outline" disabled={!consent || busy} onClick={() => void submit()}>{busy ? 'Submitting…' : `Review with AI · ${offer.credits} ${offer.credits === 1 ? 'credit' : 'credits'}`}</button></div>
        </>}
        {receipt && <div aria-live="polite">
            {pending(receipt.status) && <p className="pm-if-note">{receipt.status === 'provider_status_unknown' ? 'Provider outcome is being reconciled.' : 'AI review in progress…'}</p>}
            {terminalFailure && <p role="alert" className="pm-interview-error">AI review did not complete. Your practice score is unchanged.</p>}
            {needsRead && <button type="button" className="pm-button pm-button-outline" disabled={busy} onClick={() => void check()}>Check status</button>}
            {receipt.result && <div className="pm-if-stack-small"><p>{receipt.result.summary}</p><strong>Strengths</strong><ul>{receipt.result.strengths.map((v,i) => <li key={i}>{v}</li>)}</ul><strong>Improvements</strong><ul>{receipt.result.improvements.map((v,i) => <li key={i}>{v}</li>)}</ul><strong>Suggested answer</strong><p>{receipt.result.suggested_answer}</p><p className="pm-if-note">AI credits charged: {receipt.credits_charged ?? 0}</p></div>}
        </div>}
        {error && <p role="alert" className="pm-interview-error">{error}</p>}
    </section>;
}
