/** Retry-After supports either seconds or an HTTP date. Do not retry automatically. */
export function retryAfterSeconds(value: string | null, now = Date.now()): number {
    if (value !== null && /^\d+$/.test(value.trim())) return Math.max(1, Number(value));
    const date = value === null ? NaN : Date.parse(value);
    return Number.isFinite(date) ? Math.max(1, Math.ceil((date - now) / 1000)) : 60;
}
