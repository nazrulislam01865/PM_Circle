import { useState } from 'react';

type Option = { id: number; label: string; votes_count: number };
export function PostPoll({ postId, options, selected = null, canInteract, onJoin }: {
    postId: number; options: Option[]; selected?: number | null; canInteract: boolean; onJoin?: (action: string) => void;
}) {
    const [votes, setVotes] = useState(options);
    const [choice, setChoice] = useState<number | null>(selected);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const total = votes.reduce((sum, option) => sum + option.votes_count, 0);
    const vote = async (id: number) => {
        if (!canInteract) { onJoin?.('vote in a poll'); return; }
        if (busy) return;
        setBusy(true); setError('');
        try {
            const response = await fetch(`/posts/${postId}/poll-votes`, {
                method: 'POST', credentials: 'same-origin',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '' },
                body: JSON.stringify({ option_id: id }),
            });
            if (!response.ok) throw new Error(response.status === 419 ? 'Session expired. Refresh and try again.' : 'Unable to save your vote.');
            const result = await response.json() as { viewer_vote: number; counts: Record<string, number> };
            setChoice(result.viewer_vote);
            setVotes(previous => previous.map(option => ({ ...option, votes_count: Number(result.counts[String(option.id)] ?? 0) })));
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save your vote.'); }
        finally { setBusy(false); }
    };
    return <div className="pm-post-poll"><div className="pm-post-poll-options">{votes.map(option => <button type="button" key={option.id} disabled={busy} className={choice === option.id ? 'is-selected' : ''} aria-pressed={choice === option.id} onClick={() => { void vote(option.id); }}>
        <span className="pm-post-poll-track" style={{ width: choice === null || total === 0 ? '0%' : `${Math.round(option.votes_count / total * 100)}%` }}/><span className="pm-post-poll-text">{option.label}</span>{choice !== null && <span className="pm-post-poll-percent">{total ? Math.round(option.votes_count / total * 100) : 0}%</span>}
    </button>)}</div><small>{total} {total === 1 ? 'vote' : 'votes'}</small>{error && <p role="alert" className="pm-post-action-error">{error}</p>}</div>;
}
