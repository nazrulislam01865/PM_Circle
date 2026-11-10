import { useEffect, useState } from 'react';
import type { InterviewSession } from './types';

/**
 * A real-time countdown against the ONE fixed deadline assigned when the
 * interview began. Changing questions or submitting answers never adds time.
 * No polling, no additional database queries, and no timers per question.
 */
export function useInterviewCountdown(session: InterviewSession): number {
    const [remaining, setRemaining] = useState(session.remainingSeconds);

    useEffect(() => {
        const deadlineMs = Date.parse(session.deadlineAt);
        const serverNowMs = Date.parse(session.serverNow);
        if (!Number.isFinite(deadlineMs) || !Number.isFinite(serverNowMs)) {
            setRemaining(Math.max(0, session.remainingSeconds));
            return;
        }

        // Correct for the difference between the server and device clocks.
        // A wall-clock anchor continues to advance when a device is asleep or
        // browser timers are throttled in the background.
        const leftAtLoadMs = Math.max(0, deadlineMs - serverNowMs);
        const wallAtLoadMs = Date.now();
        const monotonicAtLoadMs = performance.now();
        const update = () => {
            const elapsedMs = Math.max(
                0,
                Date.now() - wallAtLoadMs,
                performance.now() - monotonicAtLoadMs,
            );
            setRemaining(Math.max(0, Math.ceil((leftAtLoadMs - elapsedMs) / 1000)));
        };

        update();
        // Sub-second ticks keep the MM:SS display aligned to actual second
        // boundaries without network traffic or a React render on every tick.
        const interval = window.setInterval(update, 250);
        document.addEventListener('visibilitychange', update);
        window.addEventListener('focus', update);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', update);
            window.removeEventListener('focus', update);
        };
    }, [session.id, session.deadlineAt, session.serverNow, session.remainingSeconds]);

    return remaining;
}
