import { useId } from 'react';
import { InterviewProgress } from './InterviewShared';
import { dateLabel, type InterviewAnswer, type InterviewHistory, type Evaluation } from './types';

const categoryFields = [
    { label: 'PM Knowledge & Concepts', value: (evaluation: Evaluation) => evaluation.pm_knowledge },
    { label: 'Communication & Clarity', value: (evaluation: Evaluation) => (evaluation.communication + evaluation.clarity) / 2 },
    { label: 'Leadership & Management', value: (evaluation: Evaluation) => evaluation.leadership },
    { label: 'Problem Solving', value: (evaluation: Evaluation) => evaluation.problem_solving },
];

/** Scores are displayed only if a previous evaluation really provided them. */
export function InterviewCategoryScores({ answers }: { answers: InterviewAnswer[] }) {
    const evaluations = answers.map(answer => answer.evaluation).filter((value): value is Evaluation => value !== null);
    const rows = categoryFields.map(category => {
        const values = evaluations.map(category.value).filter(value => Number.isFinite(value) && value >= 0 && value <= 10);
        const score = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
        return { label: category.label, score };
    });

    return <div className="pm-interview-category-list">
        {rows.map(row => <div className="pm-interview-category-line" key={row.label}>
            <span>{row.label}</span>
            <InterviewProgress value={row.score ?? 0} max={10}/>
            <strong className={row.score === null ? 'is-unscored' : ''}>{row.score === null ? '— / 10' : `${row.score.toFixed(1)} / 10`}</strong>
        </div>)}
        {evaluations.length === 0 && <p className="pm-interview-scoring-note">AI scoring is disabled. Your answers are saved for review.</p>}
    </div>;
}

export const validScore = (raw: InterviewHistory['overall_score'] | InterviewAnswer['score']): number | null => {
    if (raw === null || raw === undefined || raw === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 && value <= 10 ? value : null;
};

/** Chart geometry is derived solely from the member's real completed sessions. */
export function InterviewPerformanceTrend({ history }: { history: InterviewHistory[] }) {
    const scored = history.filter(row => validScore(row.overall_score) !== null);
    const hasScores = scored.length > 0;
    const source = (hasScores ? scored : history).slice(0, 5).reverse();
    const data = source.map(row => ({
        value: hasScores ? validScore(row.overall_score)! : row.question_count,
        label: new Date(row.completed_at ?? row.created_at ?? '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        date: dateLabel(row.completed_at),
    }));
    const max = hasScores ? 10 : Math.max(10, ...data.map(item => item.value));
    const min = hasScores ? Math.max(0, Math.floor(Math.min(...data.map(item => item.value)) - 1)) : 0;
    const top = 23, bottom = 167, left = 46, right = 417;
    const plotY = (value: number) => bottom - (value - min) * (bottom - top) / (max - min || 1);
    const points = data.map((item, index) => ({ ...item,
        x: data.length === 1 ? (left + right) / 2 : left + (right - left) * index / (data.length - 1),
        y: plotY(item.value),
    }));
    const gradientId = useId().replace(/:/g, '');
    if (!points.length) return <p className="pm-interview-chart-empty">Your performance history will appear after your first completed interview.</p>;
    const line = points.map(point => `${point.x},${point.y}`).join(' ');
    const area = `${left},${bottom} ${line} ${points[points.length - 1].x},${bottom}`;
    const ticks = Array.from({ length: 5 }, (_, index) => min + (max - min) * index / 4).reverse();
    return <div className="pm-interview-trend-graph">
        <svg viewBox="0 0 445 219" role="img" aria-label={`${hasScores ? 'Previous interview scores' : 'Questions per completed interview'}: ${points.map(point => `${point.date} ${hasScores ? point.value.toFixed(1) + ' out of 10' : point.value + ' questions'}`).join('; ')}`}>
            <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--blue)" stopOpacity="0.23"/><stop offset="1" stopColor="var(--blue)" stopOpacity="0.02"/></linearGradient></defs>
            {ticks.map((value, index) => <g key={index}>
                <text className="pm-interview-trend-label" x="37" y={plotY(value) + 4} textAnchor="end">{hasScores ? value.toFixed(1) : value.toFixed(value % 1 ? 1 : 0)}</text>
                {index === 4 && <line x1={left} x2={right + 8} y1={bottom} y2={bottom} stroke="var(--border)"/>}
            </g>)}
            <line x1={left} x2={left} y1={top} y2={bottom} stroke="var(--border)"/>
            <polygon points={area} fill={`url(#${gradientId})`}/>
            {points.length > 1 && <polyline points={line} fill="none" stroke="var(--blue)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}
            {points.map((point, index) => <g key={`${point.date}-${index}`}>
                <circle cx={point.x} cy={point.y} r="4.7" stroke="var(--blue)" strokeWidth="2.5" fill="var(--surface)"/>
                <rect x={point.x - 20} y={Math.max(2, point.y - 39)} width="40" height="27" rx="6" fill={index === points.length - 1 ? 'var(--blue)' : 'var(--surface)'} stroke={index === points.length - 1 ? 'var(--blue)' : 'var(--border)'}/>
                <text x={point.x} y={Math.max(2, point.y - 39) + 18} className={index === points.length - 1 ? 'pm-interview-trend-point is-latest' : 'pm-interview-trend-point'} textAnchor="middle">{hasScores ? point.value.toFixed(1) : point.value}</text>
                <text className="pm-interview-trend-label" x={point.x} y="196" textAnchor="middle">{point.label}</text>
            </g>)}
        </svg>
        {!hasScores && <p className="pm-interview-chart-note">Questions per session · no AI scores</p>}
    </div>;
}
