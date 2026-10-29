import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, FileUp, Linkedin } from 'lucide-react';
import { useState } from 'react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { PlanComparisonRows } from '@/components/billing/PlanComparison';
import type { Plan } from '@/components/billing/PlanCard';

function money(minor: number) { return `BDT ${(minor / 100).toLocaleString('en-BD')}`; }
export default function Pricing({ plans }: { plans: Plan[] }) {
    const signedIn = Boolean(usePage<{ auth: { user: unknown | null } }>().props.auth?.user);
    const [duration, setDuration] = useState(1);
    const get = (code: string) => plans.find(plan => plan.code === code);
    const price = (code: string, months = 1) => get(code)?.prices.find(entry => entry.months === months)?.amount_minor;
    const plusOptions = get('plus')?.prices ?? [];
    const plusAmount = price('plus', duration);
    const freeHref = signedIn ? '/membership' : '/register';
    const paidHref = signedIn ? '/membership' : '/register';
    return <PublicLayout active="/pricing"><Head title="Compare Free, Plus and Pro"/>
        <div className="pm-compare-page">
            <div className="pm-compare-intro"><h1>Choose the support you need to grow.</h1><p>Start free. Add more practice and career tools when you're ready.</p></div>
            <div className="pm-compare-scroll" tabIndex={0} role="region" aria-label="Membership feature comparison; scroll horizontally on small screens">
                <table className="pm-compare-table"><colgroup><col className="pm-compare-feature-col"/><col/><col/><col/></colgroup>
                    <thead><tr>
                        <th className="pm-compare-header-feature" scope="col"><strong>Features</strong><span>Compare what's included in each plan.</span></th>
                        <th scope="col"><strong>Free</strong><b>{money(price('free') ?? 0)}</b><span>Always free</span></th>
                        <th scope="col" className="pm-compare-plus"><span className="pm-compare-recommended">Recommended</span><strong>Plus</strong>
                            <b>{plusAmount == null ? 'Price to confirm' : `${money(plusAmount / duration)} / month`}</b>
                            <label className="pm-compare-duration"><span className="sr-only">Plus billing duration</span><select value={duration} onChange={event => setDuration(Number(event.target.value))}>
                                {plusOptions.map(option => <option key={option.months} value={option.months}>{option.months === 1 ? 'Monthly' : `${option.months} months`}</option>)}
                            </select></label>
                            <small>{plusOptions.filter(item => item.months !== 1).map(item => `${item.months === 12 ? 'Yearly' : `${item.months} months`}: ${money(item.amount_minor)}`).join(' · ')}</small>
                        </th>
                        <th scope="col"><strong>Pro</strong><b>{price('pro') == null ? 'Price to confirm' : `${money(price('pro')!)} / month`}</b><span>Proposed pricing</span></th>
                    </tr></thead>
                    <PlanComparisonRows/>
                    <tfoot><tr><th scope="row">Start when you're ready.</th>
                        <td><Link className="pm-button pm-button-outline pm-button-sm" href={freeHref}>{signedIn ? 'Manage Free' : 'Register free'}</Link></td>
                        <td className="pm-compare-plus"><Link className="pm-button pm-button-sm" href={paidHref}>Get Plus</Link></td>
                        <td><Link className="pm-button pm-button-outline pm-button-sm" href={paidHref}>Get Pro</Link></td>
                    </tr></tfoot>
                </table>
            </div>
            <p className="pm-compare-fineprint">*Viewer names appear only when privacy settings permit.<br/>AI limits are illustrative. Cancel renewal anytime; access continues until the paid term ends.</p>
            <section className="pm-compare-import pm-panel"><div className="pm-compare-import-icon"><FileUp size={64} strokeWidth={1.5}/><Linkedin size={24}/></div>
                <div><h2>Bring your experience with you.</h2><p>Add your LinkedIn link or upload your own LinkedIn PDF / profile export.<br/>Review imported details before saving.</p><small>File imports are snapshots, not automatic LinkedIn sync. This import workflow is not yet available.</small></div>
                <Link className="pm-button pm-button-outline pm-button-sm" href="/about">How profile import works <ArrowRight size={16}/></Link>
            </section>
            <p className="pm-compare-fineprint">Plan benefits and prices are proposed. Production checkout is unavailable until payment verification is implemented.</p>
        </div>
    </PublicLayout>;
}
