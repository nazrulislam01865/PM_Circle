import { ArrowLeft, ArrowRight, Clock3, Flag, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { ExamOptionList, Highlighted, type ExamQuestion, type ExamResponses, type ExamResponse } from './ExamShared';
import { ExamTimeProgress } from './ExamTimeProgress';
import { ExamToolGuide } from './ExamToolGuide';
import { PmpExamNavigator } from './PmpExamNavigator';
import { PmpExamQuestionHeading, PmpExamQuestionTools } from './PmpExamQuestionChrome';

type Props = {
    questions: ExamQuestion[]; responses: ExamResponses; index: number; selected: ExamResponse;
    seconds: number; duration: number; guideOpen: boolean; strikeMode: boolean; highlightMode: boolean;
    reviewingMarked?: boolean; markedIndexes: number[]; navStart: number; strikes: string[]; highlights: string[];
    canVisit: (index: number) => boolean; goto: (index: number, keepMarkedReview?: boolean) => void;
    onGuide: (open: boolean) => void; onToggleMark: () => void; onToggleStrike: () => void;
    onToggleHighlight: () => void; onCalculator: () => void; onSelection: (text: string) => void;
    onRemoveHighlight: (text: string) => void; onChoose: (key: string) => void; onStrike: (key: string) => void;
    onPageStartChange: (index: number) => void; onNavigate: (index: number, marked: boolean) => void;
    onReviewMarked?: () => void; onFinish: () => void; onFinal: () => void; onSummary: () => void;
    finishLabel?: string; finalLabel?: string; progressLabel?: string; choiceError?: string; saveNotice?: ReactNode;
};

/** One presentation for both exam modes; authorization, persistence and navigation policy stay with the caller. */
export function PmpExamTakingView({ questions, responses, index, selected, seconds, duration, guideOpen, strikeMode, highlightMode,
    reviewingMarked = false, markedIndexes, navStart, strikes, highlights, canVisit, goto, onGuide, onToggleMark, onToggleStrike,
    onToggleHighlight, onCalculator, onSelection, onRemoveHighlight, onChoose, onStrike, onPageStartChange, onNavigate,
    onReviewMarked, onFinish, onFinal, onSummary, finishLabel = 'Finish Exam', finalLabel = 'Finish & Review',
    progressLabel, choiceError, saveNotice }: Props) {
    const question = questions[index];
    const markedPosition = markedIndexes.indexOf(index);
    const markedCount = markedIndexes.length;
    const mm = (n: number) => String(Math.floor(n)).padStart(2, '0');
    const time = `${mm(seconds / 3600)}:${mm((seconds % 3600) / 60)}:${mm(seconds % 60)}`;
    return <>
        <div className="pm-exam-examhead"><div className="pm-exam-examhead-title"><strong>PMP® Exam Simulator</strong></div>
            <div className="pm-exam-examhead-right">{guideOpen ? <button className="btn secondary pm-exam-action" type="button" onClick={() => onGuide(false)}><X size={18}/>Close</button> : <>
                <span><Clock3 size={20}/>Time Remaining: <b role="timer" aria-label="Time remaining" className={seconds < 60 ? 'is-urgent' : ''}>{time}</b></span>
                <span>Question {index + 1} of {questions.length}</span><button type="button" aria-label="Mark current question for review" aria-pressed={selected.marked} onClick={onToggleMark}><Flag fill={selected.marked ? 'currentColor' : 'none'}/></button>
                <button className="pm-exam-guide-open" type="button" onClick={() => onGuide(true)}><Info size={18}/> Exam Tools Guide</button>
                <button className="btn secondary pm-exam-action" type="button" onClick={onFinish}>{finishLabel}</button></>}</div></div>
        <div className="pm-exam-take-body">
        {guideOpen ? <ExamToolGuide/> : <>
            <ExamTimeProgress secondsRemaining={seconds} durationSeconds={duration} label={progressLabel}/>
            <div className="pm-exam-take-grid"><section className="pm-exam-panel pm-exam-question-card">
                {(selected.marked || (reviewingMarked && markedPosition >= 0)) && <div className="pm-exam-marked-banner"><Flag size={15} fill="currentColor"/>
                    {reviewingMarked && markedPosition >= 0 ? <><strong>Reviewing marked questions</strong><span>· {markedPosition + 1} of {markedCount} · You can change your answers.</span></>
                        : <><strong>Marked for review</strong><span>· You can review this question before submitting.</span></>}
                </div>}
                <PmpExamQuestionHeading index={index} total={questions.length} domain={question.domain}/>
                <div className="pm-exam-question-main"><p className="pm-exam-question-prompt" onMouseUp={event => {
                    const selection = window.getSelection();
                    if (!selection || selection.isCollapsed || !event.currentTarget.contains(selection.anchorNode) || !event.currentTarget.contains(selection.focusNode)) return;
                    const text = selection.toString().trim();
                    if (text) onSelection(text);
                }}><Highlighted content={question.prompt} active={highlights} onRemove={onRemoveHighlight}/></p>
                    <ExamOptionList question={question} chosen={selected.choice}
                        onChoose={onChoose}
                        onStrike={onStrike} strikeMode={strikeMode} struck={strikes}/>{choiceError && <p className="pm-pmp-public-choice-error" role="alert">{choiceError}</p>}</div>
                <footer><PmpExamQuestionTools marked={selected.marked} strikeMode={strikeMode} highlightMode={highlightMode}
                    onToggleMark={onToggleMark}
                    onToggleStrike={onToggleStrike} onToggleHighlight={onToggleHighlight}
                    onCalculator={onCalculator}/>
                    {reviewingMarked && markedPosition >= 0 ?
                        <div className="pm-exam-nextprev"><button className="btn secondary pm-exam-action" disabled={markedPosition === 0} onClick={() => goto(markedIndexes[markedPosition - 1], true)}><ArrowLeft size={18}/>Previous Marked</button>
                            <button className="btn pm-exam-action" disabled={markedPosition === markedCount - 1} onClick={() => goto(markedIndexes[markedPosition + 1], true)}>Next Marked <ArrowRight size={18}/></button></div>
                        : <div className="pm-exam-nextprev"><button className="btn secondary pm-exam-action" disabled={index === 0} onClick={() => goto(index - 1)}><ArrowLeft size={18}/>Previous</button>
                            {index === questions.length - 1 ? <button className="btn pm-exam-action" onClick={onFinal}>{finalLabel} <ArrowRight size={18}/></button>
                                : <button className="btn pm-exam-action" disabled={!canVisit(index + 1)} title={!canVisit(index + 1) ? 'Answer this and preceding questions to continue' : undefined} onClick={() => goto(index + 1)}>Next <ArrowRight size={18}/></button>}</div>}</footer>
            </section><PmpExamNavigator questions={questions} responses={responses} currentIndex={index}
                pageStart={navStart} onPageStartChange={onPageStartChange} canVisit={canVisit}
                onNavigate={(target, marked) => onNavigate(target, marked)}
                onReviewMarked={onReviewMarked} onExamSummary={onSummary}/></div>
            {saveNotice}
        </>}</div>
    </>;
}
