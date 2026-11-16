/** Pure countdown math shared by paid and public sample exams. */
export function remainingTimeSeconds(secondsRemaining: number, durationSeconds: number): number {
    const duration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 1;
    return Number.isFinite(secondsRemaining) ? Math.max(0, Math.min(duration, secondsRemaining)) : 0;
}

export function remainingTimePercentage(secondsRemaining: number, durationSeconds: number): number {
    const duration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 1;
    return (remainingTimeSeconds(secondsRemaining, duration) / duration) * 100;
}

/** Clock skew should not give an attempt extra seconds or hide bar progress. */
export function examServerClockOffset(serverNow: string | undefined, clientNowMs: number): number {
    const parsed = serverNow ? Date.parse(serverNow) : NaN;
    return Number.isFinite(parsed) ? parsed - clientNowMs : 0;
}

/** Calculate time left using the same server-adjusted deadline as the progress bar. */
export function examSecondsUntilExpiry(expiresAt: string, clientNowMs: number, serverClockOffsetMs = 0): number {
    const expiry = Date.parse(expiresAt);
    if (!Number.isFinite(expiry)) return 0;
    return Math.max(0, Math.ceil((expiry - clientNowMs - serverClockOffsetMs) / 1000));
}
