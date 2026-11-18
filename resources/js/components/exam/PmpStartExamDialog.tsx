import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { Info, LoaderCircle, X } from 'lucide-react';
import type { PmpWorkspaceAttempt } from '@/components/exam/PmpWorkspacePanels';

export type PmpExamSelection = 'new' | 'mixed' | 'random';
export type PmpExamCoverage = {
    bankTotal: number;
    usedCount: number;
    unseenCount: number;
    examSize: number;
    fullQuestionCount: number;
};

type Props = {
    open: boolean;
    phase: 'loading' | 'ready' | 'mixed' | 'preparing';
    coverage: PmpExamCoverage | null;
    attempts: PmpWorkspaceAttempt[];
    completedCount: number;
    inProgressCount: number;
    selection: PmpExamSelection;
    onSelectionChange: (next: PmpExamSelection) => void;
    onClose: () => void;
    onConfirm: () => void;
    onRetry: () => void;
    onBack: () => void;
    error: string;
};

function StartOption({ value, selected, onChange, title, description }: {
    value: PmpExamSelection;
    selected: boolean;
    onChange: (value: PmpExamSelection) => void;
    title: string;
    description: string;
}) {
    return <label className={`pm-pmp-start-option${selected ? ' is-selected' : ''}`}>
        <input type="radio" name="pm-pmp-exam-set" value={value} checked={selected}
            onChange={() => onChange(value)}/>
        <span><strong>{title}</strong><small>{description}</small></span>
    </label>;
}

function StartNotice({ variant, children }: { variant: 'info' | 'warning'; children: ReactNode }) {
    return <div className={`pm-pmp-start-notice is-${variant}`}>
        <Info size={18} aria-hidden="true"/>
        <div>{children}</div>
    </div>;
}

function PreparingExam() {
    return <div className="pm-pmp-start-preparing" role="status" aria-live="polite">
        <span className="pm-pmp-start-spinner" aria-hidden="true"/>
        <h2>Preparing Your Exam</h2>
        <p>Selecting questions from the question bank...</p>
        <div className="pm-pmp-start-preparing-rule"/>
        <p className="pm-pmp-start-small">Your exam will open automatically when the set is ready.</p>
        <p className="pm-pmp-start-small">The timer starts when Question 1 opens.</p>
    </div>;
}

/** A reusable, focus-managed dialog; no requests or business rules inside the view. */
export function PmpStartExamDialog({ open, phase, coverage, attempts, completedCount, inProgressCount,
    selection, onSelectionChange, onClose, onConfirm, onRetry, onBack, error }: Props) {
    const exhausted = Boolean(coverage && coverage.unseenCount === 0);
    const mixed = phase === 'mixed';
    const mockAttempts = attempts.filter(attempt => attempt.mode === 'full' || attempt.mode == null);
    const recent = mockAttempts.filter(attempt => attempt.status === 'completed' || attempt.status === 'in_progress').slice(0, 4);
    const available = coverage?.examSize ?? 0;
    const used = coverage?.usedCount ?? 0;
    const total = coverage?.bankTotal ?? 0;
    const unseen = coverage?.unseenCount ?? 0;
    const usedForMix = Math.max(0, available - Math.min(unseen, available));

    return <Dialog.Root open={open} onOpenChange={next => { if (!next && phase !== 'preparing') onClose(); }}>
        <Dialog.Portal>
            <Dialog.Overlay className="pm-pmp-start-overlay"/>
            <Dialog.Content className={`pm-pmp-start-dialog${phase === 'preparing' ? ' is-preparing' : ''}${phase === 'ready' && coverage && !exhausted ? ' is-history' : ''}`}
                aria-describedby="pm-pmp-start-description"
                onEscapeKeyDown={event => { if (phase === 'preparing') event.preventDefault(); }}
                onPointerDownOutside={event => event.preventDefault()}>
                {phase === 'preparing' ? <>
                    <Dialog.Title className="pm-pmp-start-sr-only">Preparing Your Exam</Dialog.Title>
                    <Dialog.Description className="pm-pmp-start-sr-only" id="pm-pmp-start-description">Selecting your questions.</Dialog.Description>
                    <PreparingExam/>
                </> : <>
                    <div className="pm-pmp-start-body">
                        <div className="pm-pmp-start-head">
                            <Dialog.Title className="pm-pmp-start-title">
                                {mixed ? 'Some New Questions Are Still Left' : 'Start a New Mock Exam'}
                            </Dialog.Title>
                            <button type="button" className="pm-pmp-start-close" aria-label="Close exam dialog" onClick={onClose}><X size={18}/></button>
                        </div>
                        <Dialog.Description className="pm-pmp-start-sr-only" id="pm-pmp-start-description">
                            Choose which questions will appear in your next PMP mock examination.
                        </Dialog.Description>
                        {phase === 'loading' ? <div className="pm-pmp-start-loading" role="status">
                            <LoaderCircle className="pm-pmp-start-loading-icon" size={30} aria-hidden="true"/>
                            Checking your question bank coverage...
                        </div> : coverage && total > 0 ? <>
                            {exhausted ? <>
                                <div className="pm-pmp-start-coverage-head">
                                    <strong>Question bank coverage</strong>
                                    <span>{used.toLocaleString('en-US')} of {total.toLocaleString('en-US')} questions already used</span>
                                </div>
                                <div className="pm-pmp-start-coverage-track" role="progressbar" aria-label="Question bank coverage"
                                    aria-valuenow={used} aria-valuemin={0} aria-valuemax={total}>
                                    <span style={{ width: `${Math.min(100, (used / total) * 100)}%` }}/>
                                </div>
                                <StartNotice variant="info"><strong>You've already received every question in the bank</strong>
                                    <p>Your next exam will use a randomly selected set from the full bank.</p>
                                    <p>You may see questions from earlier attempts.</p></StartNotice>
                                <StartOption value="random" selected={true} onChange={onSelectionChange}
                                    title="Random question set" description="Draw a fresh mix from the full question bank."/>
                            </> : mixed ? <>
                                <p className="pm-pmp-start-subtitle">
                                    A full set needs {coverage.fullQuestionCount.toLocaleString('en-US')} questions. You have {unseen.toLocaleString('en-US')} unseen questions left.
                                </p>
                                <StartNotice variant="warning"><strong>Use your remaining new questions</strong>
                                    <p>Your set will include all {Math.min(unseen, available).toLocaleString('en-US')} unseen questions and {usedForMix.toLocaleString('en-US')} questions you received in previous exams, picked at random.</p>
                                </StartNotice>
                                <div className="pm-pmp-start-mix-heading">Question mix</div>
                                <div className="pm-pmp-start-mix" aria-label="Question mix">
                                    <strong>{Math.min(unseen, available).toLocaleString('en-US')} new questions</strong>
                                    <strong>{usedForMix.toLocaleString('en-US')} previously used questions</strong>
                                </div>
                            </> : <>
                                <div className="pm-pmp-start-previous-head"><strong>Past attempts</strong>
                                    <span>{completedCount} completed · {inProgressCount} in progress</span></div>
                                <div className="pm-pmp-start-table-wrap">
                                    <table className="pm-pmp-start-table"><thead><tr><th>Exam</th><th>Status</th><th>Score</th></tr></thead>
                                        <tbody>{recent.length ? recent.map(attempt => <tr key={attempt.id}>
                                            <td>Mock Exam {String(attempt.id).padStart(2, '0')}</td>
                                            <td><span className={attempt.status === 'completed' ? 'is-completed' : 'is-progress'}>
                                                <span className="pm-pmp-start-status-dot" aria-hidden="true"/>
                                                {attempt.status === 'completed' ? 'Completed' : 'In progress'}</span></td>
                                            <td>{attempt.correct_count !== null && attempt.total_questions > 0
                                                ? `${Math.round(attempt.correct_count / attempt.total_questions * 100)}%` : '—'}</td>
                                        </tr>) : <tr><td colSpan={3}>No previous mock attempts yet.</td></tr>}</tbody>
                                    </table>
                                </div>
                                <div className="pm-pmp-start-choose"><strong>Choose your question set</strong>
                                    <span>{unseen.toLocaleString('en-US')} of {total.toLocaleString('en-US')} questions unseen</span></div>
                                <div className="pm-pmp-start-options">
                                    <StartOption value="new" selected={selection === 'new'} onChange={onSelectionChange}
                                        title="New questions only" description="Use questions you haven't received in any previous exam."/>
                                    <StartOption value="random" selected={selection === 'random'} onChange={onSelectionChange}
                                        title="Random question set" description="Draw from the full question bank. Previously used questions may appear."/>
                                </div>
                            </>}
                            {coverage.bankTotal < coverage.fullQuestionCount && <p className="pm-pmp-start-hint">
                                {coverage.bankTotal} active questions are available; this attempt will contain a shorter set than the configured {coverage.fullQuestionCount} questions.
                            </p>}
                        </> : <p className="pm-pmp-start-empty">
                            {error || 'No active questions are available. Ask an administrator to review and activate the question bank.'}
                        </p>}
                        {error && coverage && <p className="pm-pmp-start-error" role="alert">{error}</p>}
                    </div>
                    <div className="pm-pmp-start-footer">
                        {phase === 'loading' ? <button type="button" className="pm-pmp-secondary" onClick={onClose}>Cancel</button>
                            : (!coverage || available === 0) ? <>
                                <button type="button" className="pm-pmp-secondary" onClick={onClose}>Cancel</button>
                                <button type="button" className="pm-pmp-primary" onClick={onRetry}>Retry</button>
                            </> : <>
                                <button type="button" className="pm-pmp-secondary" onClick={mixed ? onBack : onClose}>
                                    {mixed ? 'Back' : 'Cancel'}</button>
                                <button type="button" className="pm-pmp-primary" onClick={onConfirm}>
                                    {mixed ? 'Start Mixed Set' : exhausted ? 'Start Random Exam' : 'Start Exam'}
                                </button>
                            </>}
                    </div>
                </>}
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>;
}
