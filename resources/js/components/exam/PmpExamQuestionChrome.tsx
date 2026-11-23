import { Calculator, Flag, Highlighter, Strikethrough } from 'lucide-react';

/** Same question heading for the paid exam and the public sample workspace. */
export function PmpExamQuestionHeading({ index, total, domain }: { index: number; total: number; domain: string }) {
    return <header><span>Question {index + 1} of {total}</span><span className="pm-exam-domain">Domain: {domain}</span></header>;
}

type ToolsProps = {
    marked: boolean;
    strikeMode: boolean;
    highlightMode: boolean;
    onToggleMark: () => void;
    onToggleStrike: () => void;
    onToggleHighlight: () => void;
    onCalculator: () => void;
};

/** Presentation only: state, persistence and entitlements remain with each parent exam. */
export function PmpExamQuestionTools({ marked, strikeMode, highlightMode, onToggleMark, onToggleStrike,
    onToggleHighlight, onCalculator }: ToolsProps) {
    return <div className="pm-exam-tools">
        <button type="button" aria-pressed={marked} className={marked ? 'is-review-remove' : ''} onClick={onToggleMark}>
            <Flag size={19}/>{marked ? 'Remove Review Mark' : 'Mark for Review'}
        </button>
        <button type="button" aria-pressed={strikeMode} className={strikeMode ? 'is-on' : ''} onClick={onToggleStrike}>
            <Strikethrough size={19}/>Strike Through
        </button>
        <button type="button" aria-pressed={highlightMode} className={highlightMode ? 'is-on' : ''} onClick={onToggleHighlight}>
            <Highlighter size={19}/>Highlight
        </button>
        <button type="button" onClick={onCalculator}><Calculator size={19}/>Calculator</button>
    </div>;
}
