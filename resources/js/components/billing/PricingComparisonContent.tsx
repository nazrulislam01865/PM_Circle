import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { useState, type ReactNode } from 'react';
import { PlanComparisonRows } from '@/components/billing/PlanComparison';
import defaults from '@/data/compare-plans.json';
import { PMDropdown } from '@/components/pm/PMDropdown';
import { ProfileImportIllustration } from '@/components/billing/ProfileImportIllustration';
import type { Plan } from '@/components/billing/PlanCard';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

export type PricingContent = typeof defaults;
export type PricingPlanCode = 'free' | 'plus' | 'pro';

function money(minor: number): string {
    return `BDT ${(minor / 100).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
}

/** The single comparison experience for public pricing and authenticated membership management. */
export function PricingComparisonContent({ plans, renderAction, notice, error, billingFineprint, content }: {
    plans: Plan[];
    renderAction: (plan: PricingPlanCode, months?: number) => ReactNode;
    notice?: ReactNode;
    error?: string | null;
    billingFineprint?: string;
    content?: PricingContent;
}) {
    const settings = content ?? defaults;
    const { banner, comparison, actions, notes } = settings;
    const profileImport = settings['profile-import'];
    const durationLabel = (months: number) => months === 1 ? comparison.monthlyLabel : months === 12 ? comparison.yearlyLabel : `${months} ${comparison.monthsLabel}`;
    const [duration, setDuration] = useState(1);
    const [proDuration, setProDuration] = useState(1);
    const planByCode = (code: PricingPlanCode) => plans.find(plan => plan.code === code);
    const planPrice = (code: PricingPlanCode, months = 1) =>
        planByCode(code)?.prices.find(price => price.months === months)?.amount_minor;

    const plusOptions = [...(planByCode('plus')?.prices ?? [])].sort((a, b) => a.months - b.months);
    const selectedPlus = plusOptions.find(option => option.months === duration) ?? plusOptions[0];
    const proOptions = [...(planByCode('pro')?.prices ?? [])].sort((a, b) => a.months - b.months);
    const selectedPro = proOptions.find(option => option.months === proDuration) ?? proOptions[0];
    const plusMonthly = selectedPlus ? money(selectedPlus.amount_minor / selectedPlus.months) : null;

    return <div className={`pm-compare-page${content ? ' pm-public-compare' : ''}`}>
        <LegacyPageHeading><div className="pm-compare-intro">
            <h1>{banner.title}</h1>
            <p>{banner.description}</p>
        </div></LegacyPageHeading>

        {notice}
        {error && <p role="alert" className="pm-compare-error">{error}</p>}

        <div className="pm-compare-scroll" tabIndex={0} role="region" aria-label={comparison.regionLabel}>
            <table className="pm-compare-table">
                <colgroup><col className="pm-compare-feature-col"/><col/><col/><col/></colgroup>
                <thead><tr>
                    <th className="pm-compare-header-feature" scope="col"><strong>{comparison.title}</strong><span>{comparison.description}</span></th>
                    <th scope="col"><strong>{content ? planByCode('free')?.name ?? 'Free' : 'Free'}</strong><b>{money(planPrice('free') ?? 0)}</b><span>{comparison.freeNote}</span></th>
                    <th scope="col" className="pm-compare-plus">
                        <span className="pm-compare-recommended">{comparison.recommended}</span>
                        <strong>{content ? planByCode('plus')?.name ?? 'Plus' : 'Plus'}</strong>
                        <b>{plusMonthly ? <>{plusMonthly} <span className="pm-compare-per-month">{comparison.perMonth}</span></> : comparison.priceUnavailable}</b>
                        <div className="pm-compare-duration">
                            <PMDropdown id="pm-compare-duration" aria-label={comparison.durationLabel} required value={String(selectedPlus?.months ?? '')} onValueChange={value => setDuration(Number(value))} options={plusOptions.map(option => ({value: String(option.months), label: durationLabel(option.months)}))} placeholder={comparison.priceUnavailable} disabled={!plusOptions.length}/>
                        </div>
                        <small>{plusOptions.filter(option => option.months !== 1).map(option => `${durationLabel(option.months)}: ${money(option.amount_minor)}`).join(' · ')}</small>
                    </th>
                    <th scope="col"><strong>{content ? planByCode('pro')?.name ?? 'Pro' : 'Pro'}</strong><b>{selectedPro ? <>{money(selectedPro.amount_minor / selectedPro.months)} <span className="pm-compare-per-month">{comparison.perMonth}</span></> : comparison.priceUnavailable}</b><span>{comparison.proNote}</span>
                        {(proOptions.length > 1 || (selectedPro && selectedPro.months !== 1)) && <div className="pm-compare-duration"><PMDropdown id="pm-compare-pro-duration" aria-label="Pro duration" required value={String(selectedPro?.months ?? '')} onValueChange={value => setProDuration(Number(value))} options={proOptions.map(option => ({value: String(option.months), label: durationLabel(option.months)}))} placeholder={comparison.priceUnavailable}/></div>}
                    </th>
                </tr></thead>
                <PlanComparisonRows sections={[settings.community, settings.learning, settings.career]}/>
                <tfoot><tr>
                    <th scope="row">{actions.title}</th>
                    <td>{renderAction('free')}</td>
                    <td className="pm-compare-plus">{renderAction('plus', selectedPlus?.months)}</td>
                    <td>{renderAction('pro', selectedPro?.months)}</td>
                </tr></tfoot>
            </table>
        </div>

        <p className="pm-compare-fineprint" hidden={!notes.enabled}>{notes.privacyNote}<br/>{billingFineprint ?? notes.billingNote}</p>

        {profileImport.enabled && <section className="pm-compare-import pm-panel" aria-labelledby="pm-profile-import-heading">
            <ProfileImportIllustration />
            <div className="pm-compare-import-copy">
                <h2 id="pm-profile-import-heading">{profileImport.title}</h2>
                <p>{content ? profileImport.description : <>Add your LinkedIn link or upload your own LinkedIn PDF / profile export.<br className="pm-compare-import-break"/> Review imported details before saving.</>}</p>
                <small>{profileImport.note}</small>
            </div>
            <Dialog>
                <DialogTrigger asChild><button type="button" className="pm-button pm-button-outline pm-button-sm pm-compare-import-action">{profileImport.linkLabel}</button></DialogTrigger>
                <DialogContent className={content ? 'pm-public-compare-dialog' : undefined}>
                    <DialogHeader>
                        <DialogTitle>{profileImport.dialogTitle}</DialogTitle>
                        <DialogDescription>{profileImport.dialogDescription}</DialogDescription>
                    </DialogHeader>
                    <p className={content ? 'pm-compare-dialog-body' : 'text-sm leading-relaxed text-slate-700'}>{profileImport.dialogBody}</p>
                </DialogContent>
            </Dialog>
        </section>}
    </div>;
}
