import { useState, type ReactNode } from 'react';
import { PlanComparisonRows } from '@/components/billing/PlanComparison';
import { ProfileImportIllustration } from '@/components/billing/ProfileImportIllustration';
import type { Plan } from '@/components/billing/PlanCard';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

export type PricingPlanCode = 'free' | 'plus' | 'pro';

function money(minor: number): string {
    return `BDT ${(minor / 100).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
}

/** The single comparison experience for public pricing and authenticated membership management. */
export function PricingComparisonContent({ plans, renderAction, notice, error, billingFineprint }: {
    plans: Plan[];
    renderAction: (plan: PricingPlanCode) => ReactNode;
    notice?: ReactNode;
    error?: string | null;
    billingFineprint?: string;
}) {
    const [duration, setDuration] = useState(1);
    const planByCode = (code: PricingPlanCode) => plans.find(plan => plan.code === code);
    const planPrice = (code: PricingPlanCode, months = 1) =>
        planByCode(code)?.prices.find(price => price.months === months)?.amount_minor;

    const plusOptions = [...(planByCode('plus')?.prices ?? [])].sort((a, b) => a.months - b.months);
    const selectedPlus = plusOptions.find(option => option.months === duration) ?? plusOptions[0];
    const plusMonthly = selectedPlus ? money(selectedPlus.amount_minor / selectedPlus.months) : null;

    return <div className="pm-compare-page">
        <div className="pm-compare-intro">
            <h1>Choose the support you need to grow.</h1>
            <p>Start free. Add more practice and career tools when you're ready.</p>
        </div>

        {notice}
        {error && <p role="alert" className="pm-compare-error">{error}</p>}

        <div className="pm-compare-scroll" tabIndex={0} role="region" aria-label="Membership feature comparison; scroll horizontally on small screens">
            <table className="pm-compare-table">
                <colgroup><col className="pm-compare-feature-col"/><col/><col/><col/></colgroup>
                <thead><tr>
                    <th className="pm-compare-header-feature" scope="col"><strong>Features</strong><span>Compare what's included in each plan.</span></th>
                    <th scope="col"><strong>Free</strong><b>{money(planPrice('free') ?? 0)}</b><span>Always free</span></th>
                    <th scope="col" className="pm-compare-plus">
                        <span className="pm-compare-recommended">Recommended</span>
                        <strong>Plus</strong>
                        <b>{plusMonthly ? <>{plusMonthly} <span className="pm-compare-per-month">/ month</span></> : 'Price to confirm'}</b>
                        <label className="pm-compare-duration">
                            <span className="sr-only">Plus billing duration</span>
                            <select value={selectedPlus?.months ?? ''} onChange={event => setDuration(Number(event.target.value))} disabled={!plusOptions.length}>
                                {plusOptions.map(option => <option key={option.months} value={option.months}>{option.months === 1 ? 'Monthly' : option.months === 12 ? 'Yearly' : `${option.months} months`}</option>)}
                            </select>
                        </label>
                        <small>{plusOptions.filter(option => option.months !== 1).map(option => `${option.months === 12 ? 'Yearly' : `${option.months} months`}: ${money(option.amount_minor)}`).join(' · ')}</small>
                    </th>
                    <th scope="col"><strong>Pro</strong><b>{planPrice('pro') == null ? 'Price to confirm' : <>{money(planPrice('pro')!)} <span className="pm-compare-per-month">/ month</span></>}</b><span>Proposed pricing</span></th>
                </tr></thead>
                <PlanComparisonRows />
                <tfoot><tr>
                    <th scope="row">Start when you're ready.</th>
                    <td>{renderAction('free')}</td>
                    <td className="pm-compare-plus">{renderAction('plus')}</td>
                    <td>{renderAction('pro')}</td>
                </tr></tfoot>
            </table>
        </div>

        <p className="pm-compare-fineprint">*Viewer names appear only when their privacy settings permit.<br/>{billingFineprint ?? "AI limits are illustrative. Cancel renewal anytime; access continues until the paid term ends."}</p>

        <section className="pm-compare-import pm-panel" aria-labelledby="pm-profile-import-heading">
            <ProfileImportIllustration />
            <div className="pm-compare-import-copy">
                <h2 id="pm-profile-import-heading">Bring your experience with you.</h2>
                <p>Add your LinkedIn link or upload your own LinkedIn PDF / profile export.<br className="pm-compare-import-break"/> Review imported details before saving.</p>
                <small>File imports are snapshots, not automatic LinkedIn sync.</small>
            </div>
            <Dialog>
                <DialogTrigger asChild><button type="button" className="pm-button pm-button-outline pm-button-sm pm-compare-import-action">How profile import works</button></DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>How profile import works</DialogTitle>
                        <DialogDescription>Profile import is a planned feature, not yet available for upload.</DialogDescription>
                    </DialogHeader>
                    <p className="text-sm leading-relaxed text-slate-700">When available, you will be able to add your LinkedIn profile link or upload a PDF you exported yourself, review the extracted information, and choose what to save to your PM Circle profile. Files will not be synchronized automatically with LinkedIn.</p>
                </DialogContent>
            </Dialog>
        </section>
    </div>;
}
