import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Crown, ShieldCheck } from 'lucide-react';
import { PlanCard, type Plan } from '@/components/billing/PlanCard';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardShellData } from '@/types/dashboard';
import { taka } from '@/lib/money';

export default function Membership({ plans, currentPlan, temporaryAccessEnabled }: {
    plans: Plan[];
    currentPlan: 'free' | 'plus' | 'pro';
    temporaryAccessEnabled: boolean;
}) {
    const { memberShell } = usePage<{ memberShell: DashboardShellData }>().props;
    const [selected, setSelected] = useState(currentPlan);
    const [processing, setProcessing] = useState(false);
    const [months, setMonths] = useState(1);
    const [errors, setErrors] = useState<string | null>(null);
    const active = plans.find(plan => plan.code === selected);
    const price = active?.prices.find(option => option.months === months);

    const activate = () => {
        if (!temporaryAccessEnabled || processing) return;
        setProcessing(true);
        setErrors(null);
        router.post('/membership/temporary', { plan: selected }, {
            onError: errors => { setErrors(errors.plan || 'Unable to update membership.'); },
            onFinish: () => setProcessing(false),
        });
    };

    return <MemberDashboardLayout dashboard={memberShell}><Head title="Membership plans" />
        <div className="pm-member-plans">
            <div className="pm-learn-page-title"><div><h1>Membership plans</h1><p>Choose the right starting point for your professional growth.</p></div>
                <Link href="/dashboard" className="pm-dash-btn pm-dash-btn-white">Back to dashboard</Link></div>
            <div className="pm-member-plans-current"><Crown size={20}/><span>Current membership: <strong>{currentPlan === 'plus' ? 'Plus' : currentPlan === 'pro' ? 'Pro' : 'Free'}</strong></span></div>
            {temporaryAccessEnabled && <p className="pm-member-plans-note"><ShieldCheck size={19}/>Local/testing access: Plus and Pro can be enabled without checkout. Durations are displayed for comparison only; demo access has no billing cycle. No charge is created.</p>}
            <div className="pm-pricing-grid">{plans.map(plan => <PlanCard key={plan.code} plan={plan} active={selected === plan.code} onSelect={() => { setSelected(plan.code as typeof selected); setMonths(1); }}>
                {selected === plan.code && plan.prices.length > 1 && <div className="pm-member-duration" aria-label="Select subscription duration">{plan.prices.map(option => <button type="button" key={option.months} aria-pressed={months === option.months} onClick={() => setMonths(option.months)} className={months === option.months ? 'active' : ''}>{option.months} {option.months === 1 ? 'month' : 'months'}</button>)}</div>}
            </PlanCard>)}</div>
            {temporaryAccessEnabled ? <div className="pm-member-action"><p>Selected: <strong>{active?.name}</strong> · {months} {months === 1 ? 'month' : 'months'} · Standard price {taka(price?.amount_minor ?? 0)} · <strong>Due now: ৳0</strong></p>
                {errors && <p role="alert" className="pm-error">{errors}</p>}
                <button type="button" className="pm-dash-btn pm-dash-btn-primary" onClick={activate} disabled={processing || selected === currentPlan}>{processing ? 'Applying…' : selected === currentPlan ? 'Current plan' : `Activate ${active?.name} for testing`}</button>
            </div> : <div className="pm-member-action"><p>Paid memberships require verified checkout. Temporary access is unavailable outside local/testing.</p><Link href="/dashboard" className="pm-dash-btn pm-dash-btn-white">Return to dashboard</Link></div>}
        </div>
    </MemberDashboardLayout>;
}
