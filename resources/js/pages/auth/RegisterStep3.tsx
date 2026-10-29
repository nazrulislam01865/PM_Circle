import { Head, Link, useForm } from '@inertiajs/react';
import { CalendarCheck2, LockKeyhole } from 'lucide-react';
import { OnboardingLayout } from '@/layouts/pm/OnboardingLayout';
import { PlanCard, type Plan } from '@/components/billing/PlanCard';
import { ActionButton } from '@/components/pm/ActionButton';
import { taka } from '@/lib/money';

type Props = { plans: Plan[]; temporaryAccessEnabled: boolean };
export default function RegisterStep3({ plans, temporaryAccessEnabled }: Props) {
    const form = useForm({ plan: 'plus', months: 1 });
    const selected = plans.find(p => p.code === form.data.plan);
    const price = selected?.prices.find(p => p.months === form.data.months);
    const amount = price?.amount_minor ?? 0;
    const choose = (plan: Plan) => form.setData({ plan: plan.code, months: 1 });
    return <OnboardingLayout title="Choose your starting point." subtitle="Start free. Upgrade whenever you're ready." step={3}><Head title="Choose your membership"/>
        <form onSubmit={e => { e.preventDefault(); form.post('/join/step/3'); }}>
            {plans.map(plan => <PlanCard key={plan.code} plan={plan} active={form.data.plan === plan.code} onSelect={() => choose(plan)}>
                {form.data.plan === plan.code && plan.prices.length > 1 && <div><h3 className="pm-duration-title">Choose your subscription duration</h3><div className="pm-duration-grid">{plan.prices.map(option => <button type="button" key={option.months} className={`pm-duration ${form.data.months === option.months ? 'selected' : ''}`} aria-pressed={form.data.months === option.months} onClick={() => form.setData('months', option.months)}><span className={`pm-radio ${form.data.months === option.months ? 'checked' : ''}`}/><span><strong>{option.months} {option.months === 1 ? 'month' : 'months'}</strong><b>{taka(option.amount_minor / option.months)} / month</b><small>{taka(option.amount_minor)} billed {option.months === 1 ? 'monthly' : `every ${option.months} months`}</small></span></button>)}</div>
                    <p className="pm-auth-note">Longer plans are paid upfront for the selected term.</p><p className="pm-duration-info"><CalendarCheck2 size={26}/>Cancel renewal anytime. Access continues until your paid term ends.</p></div>}
            </PlanCard>)}
            <div className="pm-payment-summary"><span>Selected: {selected?.name || 'Plus'} · {form.data.months} {form.data.months === 1 ? 'month' : 'months'}</span><span>Due today: <strong>{temporaryAccessEnabled ? taka(0) : taka(amount)}</strong></span></div>
            {form.errors.plan && <p className="pm-error" role="alert">{form.errors.plan}</p>}{form.errors.months && <p className="pm-error" role="alert">{form.errors.months}</p>}
            <ActionButton type="submit" forward disabled={form.processing} className="pm-auth-submit">{form.data.plan === 'free' ? 'Start with Free' : `Continue with ${selected?.name || 'Plus'}`}</ActionButton>
            {form.data.plan !== 'free' && <button className="pm-skip" type="button" onClick={() => { form.setData({ plan: 'free', months: 1 }); form.clearErrors(); }}>Start with Free instead</button>}
            <div className="pm-auth-note"><LockKeyhole size={15}/>{form.data.plan === 'free' ? 'No payment required.' : temporaryAccessEnabled ? 'Temporary local access. No payment will be charged.' : 'Paid checkout is not yet available. Choose Free to get started.'}</div>
            <Link href="/join/step/2" className="pm-skip">Back</Link>
        </form>
    </OnboardingLayout>;
}
