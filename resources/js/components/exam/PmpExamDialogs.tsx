import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { PmpSubmitReviewSummary } from './PmpSubmitReviewSummary';

type FinishProps = Omit<ComponentProps<typeof PmpSubmitReviewSummary>, 'onSubmit'> & {
    open: boolean; onOpenChange: (open: boolean) => void; confirming: boolean;
    onConfirmStep: () => void; onBack: () => void; onConfirm: () => void; error?: string;
    sample?: boolean;
};
export function PmpExamFinishDialog({ open, onOpenChange, confirming, onConfirmStep, onBack, onConfirm, error, sample = false, ...summary }: FinishProps) {
    return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="pm-exam-modal-overlay"/><Dialog.Content className={`pm-exam-modal pm-exam-finish-modal${confirming ? '' : ' pm-exam-finish-prototype'}`} aria-describedby="pm-exam-finish-description">
        {confirming ? <>
            <Dialog.Title>{sample ? 'Finish sample exam?' : 'Submit your exam?'}</Dialog.Title>
            <Dialog.Description id="pm-exam-finish-description">
                {sample ? `You answered ${summary.answeredCount} of ${summary.total} questions. ${summary.total - summary.answeredCount} will remain unanswered. This is a sample only; no paid exam attempt is created.` : <>{summary.total > summary.answeredCount ? 'Unanswered questions will be left blank. ' : ''}Once you submit, your answers are final.</>}
            </Dialog.Description>
            {error && <div className="alert error" role="alert">{error}</div>}
            <div className="pm-exam-confirm-actions">
                <button type="button" className="btn secondary pm-exam-action" disabled={summary.submitting} onClick={onBack}>Back to Summary</button>
                <button type="button" className="btn pm-exam-action" disabled={summary.submitting} onClick={onConfirm}>{summary.submitting ? 'Submitting…' : sample ? 'Finish & Review' : 'Confirm Submission'}</button>
            </div>
        </> : <PmpSubmitReviewSummary {...summary} onSubmit={onConfirmStep}/>}
    </Dialog.Content></Dialog.Portal></Dialog.Root>;
}

export function PmpExamCalculator({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [calculator, setCalculator] = useState({ a: '', b: '', op: '+' });
    const a = Number(calculator.a), b = Number(calculator.b);
    const validCalc = calculator.a.trim() !== '' && calculator.b.trim() !== '' && Number.isFinite(a) && Number.isFinite(b) && !(calculator.op === '/' && b === 0);
    const calcResult = calculator.op === '+' ? a + b : calculator.op === '-' ? a - b : calculator.op === '×' ? a * b : a / b;
    return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="pm-exam-modal-overlay"/><Dialog.Content className="pm-exam-modal pm-exam-calc"><Dialog.Close className="pm-exam-modal-close" aria-label="Close"><X/></Dialog.Close>
            <Dialog.Title>Calculator</Dialog.Title><Dialog.Description>Quick arithmetic during the practice exam.</Dialog.Description>
            <div className="pm-exam-calc-fields"><label>First number<input type="number" value={calculator.a} onChange={event => setCalculator(v => ({...v,a:event.target.value}))}/></label>
                <label>Operation<select value={calculator.op} onChange={event => setCalculator(v => ({...v,op:event.target.value}))}><option value="+">+</option><option value="-">−</option><option value="×">×</option><option value="/">÷</option></select></label>
                <label>Second number<input type="number" value={calculator.b} onChange={event => setCalculator(v => ({...v,b:event.target.value}))}/></label></div>
            <output className="pm-exam-calc-output">{validCalc ? Number(calcResult.toFixed(8)).toLocaleString() : calculator.op === '/' && b === 0 ? 'Cannot divide by zero' : 'Enter two numbers'}</output>
        </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
