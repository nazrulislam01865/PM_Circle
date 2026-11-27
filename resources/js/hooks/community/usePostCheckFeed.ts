import { useCallback, useEffect, useRef, useState } from 'react';
import type { PostCheckFeedData } from '@/components/community/PostCheckCard';

/** Poll the owner-only status endpoint only while a post is being checked. */
export function usePostCheckFeed(initialChecks: PostCheckFeedData, onCompleted: () => void) {
    const [postChecks, setPostChecks] = useState<PostCheckFeedData>(initialChecks);
    const hasPending = postChecks.posts.some(post => post.status === 'pending_check');
    const checkRequest = useRef<AbortController | null>(null);
    const checksRef = useRef(initialChecks);
    useEffect(() => {
        // A server visit may include a just-submitted post. Discard any older
        // in-flight status response before applying the new owner projection.
        checkRequest.current?.abort();
        checkRequest.current = null;
        checksRef.current = initialChecks;
        setPostChecks(initialChecks);
    }, [initialChecks]);
    const refreshCheckFeed = useCallback(async () => {
        if (checkRequest.current || document.visibilityState === 'hidden') return;
        const abort = new AbortController();
        checkRequest.current = abort;
        try {
            const response = await fetch('/posts/check-feed', { credentials: 'same-origin', signal: abort.signal, headers: { Accept: 'application/json' } });
            if (!response.ok || abort.signal.aborted) return;
            const data = await response.json() as PostCheckFeedData;
            if (abort.signal.aborted) return;
            const completed = checksRef.current.posts.some(post => post.status === 'pending_check' && !data.posts.some(next => next.id === post.id && next.status === 'pending_check'));
            checksRef.current = data;
            setPostChecks(data);
            if (completed) onCompleted();
        } catch { /* Never expose unchecked content. */ }
        finally { if (checkRequest.current === abort) checkRequest.current = null; }
    }, [onCompleted]);
    useEffect(() => {
        if (!hasPending) return;
        let live = true;
        let timer: number;
        const schedule = () => { timer = window.setTimeout(async () => {
            await refreshCheckFeed();
            if (live) schedule();
        }, 6000 + Math.random() * 1000); };
        schedule();
        return () => { live = false; window.clearTimeout(timer); };
    }, [hasPending, refreshCheckFeed]);
    useEffect(() => () => { checkRequest.current?.abort(); checkRequest.current = null; }, []);
    return { postChecks, refreshCheckFeed };
}
