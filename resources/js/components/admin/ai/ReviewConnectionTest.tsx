import { useEffect, useRef, useState } from 'react';
import { Button } from './WorkspaceShared';
import { useDiagnosticTest } from './useDiagnosticTest';

type Diagnostic = { connected: boolean; pending: boolean; request_id?: string; message: string; code?: string | null };

/** Runs the existing budgeted synthetic diagnostic, not a member review. */
export function ReviewConnectionTest({ code, enabled }: { code: string; enabled: boolean }) {
    const { busy, retrySeconds, begin, finish, rateLimited } = useDiagnosticTest();
    const [result, setResult] = useState<Diagnostic | null>(null);
    const [error, setError] = useState('');
    const request = useRef<AbortController | null>(null);
    useEffect(() => () => request.current?.abort(), []);
    async function test() {
        if (!begin()) return;
        const abort = new AbortController(); request.current = abort;
        setError(''); setResult(null);
        const path = `/admin/ai/feature-connection/${code}`;
        try {
            const response = await fetch(path, { method: 'POST', credentials: 'same-origin', signal: abort.signal, headers: { Accept: 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '', 'X-Requested-With': 'XMLHttpRequest' } });
            if (rateLimited(response)) return;
            if (!response.ok) throw new Error(`Unable to check connection (${response.status}).`);
            let next: Diagnostic = await response.json(); setResult(next);
            for (let i = 0; next.pending && next.request_id && i < 60 && !abort.signal.aborted; i++) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                if (abort.signal.aborted) return;
                const poll = await fetch(`${path}/${encodeURIComponent(next.request_id)}`, { credentials: 'same-origin', cache: 'no-store', signal: abort.signal, headers: { Accept: 'application/json' } });
                if (rateLimited(poll)) return;
                if (!poll.ok) throw new Error(`Unable to check status (${poll.status}).`);
                next = await poll.json(); setResult(next);
            }
            if (next.pending) setError('Test still pending. Check the AI queue and test again to resume the request.');
        } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Connection test failed.'); }
        finally { if (!abort.signal.aborted) finish(); }
    }
    return <div className="pm-admin-field"><Button disabled={!enabled || busy || retrySeconds > 0} onClick={() => void test()}>{busy ? 'Testing…' : retrySeconds ? `Retry in ${retrySeconds}s` : 'Test operation'}</Button>{result && <small role="status">{result.message}{result.code && !result.pending ? ` (${result.code})` : ''}</small>}{error && <small className="pm-admin-error" role="alert">{error}</small>}</div>;
}
