import { remainingTimePercentage, remainingTimeSeconds } from './examCountdownMath';

/** Remaining exam time, not question completion or elapsed time. */
export function ExamTimeProgress({ secondsRemaining, durationSeconds, label = 'Exam time remaining' }: {
    secondsRemaining: number;
    durationSeconds: number;
    label?: string;
}) {
    const duration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 1;
    const remaining = remainingTimeSeconds(secondsRemaining, duration);

    return <div className="pm-exam-progress" role="progressbar" aria-label={label}
        aria-valuemin={0} aria-valuemax={duration} aria-valuenow={remaining}
        aria-valuetext={`${Math.ceil(remaining)} seconds remaining`}>
        <span style={{ width: `${remainingTimePercentage(remaining, duration)}%` }}/>
    </div>;
}
