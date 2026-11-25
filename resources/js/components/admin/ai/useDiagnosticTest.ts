import { useEffect, useRef, useState } from 'react';
import { retryAfterSeconds } from './diagnostic-retry';

/** One in-flight test per control, with a server-directed cooldown after HTTP 429. */
export function useDiagnosticTest() {
    const running = useRef(false);
    const retryUntil = useRef(0);
    const [busy, setBusy] = useState(false);
    const [retrySeconds, setRetrySeconds] = useState(0);
    const [deadline, setDeadline] = useState(0);

    useEffect(() => {
        if (!deadline) return;
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setRetrySeconds(remaining);
            if (!remaining) setDeadline(0);
        };
        tick();
        const interval = window.setInterval(tick, 250);
        return () => window.clearInterval(interval);
    }, [deadline]);

    function begin() {
        if (running.current || retryUntil.current > Date.now()) return false;
        running.current = true;
        setBusy(true);
        return true;
    }

    function finish() {
        running.current = false;
        setBusy(false);
    }

    function rateLimited(response: Response) {
        if (response.status !== 429) return false;
        const seconds = retryAfterSeconds(response.headers.get('Retry-After'));
        retryUntil.current = Date.now() + seconds * 1000;
        setRetrySeconds(seconds);
        setDeadline(retryUntil.current);
        return true;
    }

    return { busy, retrySeconds, begin, finish, rateLimited };
}
