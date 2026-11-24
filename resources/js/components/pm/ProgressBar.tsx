/** Accessible shared progress control; the native element retains its semantics. */
export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label: string }) {
    const limit = Number.isFinite(max) && max > 0 ? max : 1;
    const progress = Number.isFinite(value) ? Math.max(0, Math.min(value, limit)) : 0;
    return <progress className="pm-progress" aria-label={label} value={progress} max={limit}/>;
}
