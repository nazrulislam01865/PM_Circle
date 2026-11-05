import { Head, Link, useForm } from '@inertiajs/react';
import { LockKeyhole } from 'lucide-react';
import { SignupButton } from '@/components/onboarding/SignupControls';
import { formatAmount, SignupDurationTable, SignupPlanCard, type Plan } from '@/components/onboarding/SignupPlanCard';
import { OnboardingLayout } from '@/layouts/pm/OnboardingLayout';

type Props = { plans: Plan[]; temporaryAccessEnabled: boolean };

export default function RegisterStep3({ plans }: Props) {
    const available = plans.filter((plan) => plan.prices.length > 0);
    const initialPlan = available.find((plan) => plan.code === 'plus') ?? available[0];
    const initialMonths = initialPlan?.prices.find((price) => price.months === 1)?.months ?? initialPlan?.prices[0]?.months ?? 1;
    const form = useForm({ plan: initialPlan?.code ?? '', months: initialMonths });
    const currentPlan = available.find((plan) => plan.code === form.data.plan);
    const currentPrice = currentPlan?.prices.find((price) => price.months === form.data.months);

    const selectPlan = (plan: Plan) => {
        const months = plan.prices.find((price) => price.months === 1)?.months ?? plan.prices[0].months;
        form.setData({ plan: plan.code, months });
    };
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (form.processing || !currentPrice) return;
        form.post('/join/step/3');
    };

    return (
        <OnboardingLayout step={3} title="Choose your plan." subtitle="Start free. Upgrade anytime.">
            <Head title="Choose your plan" />
            <form className="signup-form" onSubmit={submit}>
                {available.length ? available.map((plan) => (
                    <SignupPlanCard key={plan.code} plan={plan} selected={form.data.plan === plan.code} onSelect={() => selectPlan(plan)}>
                        {plan.code === 'plus' && plan.prices.length > 1 && (
                            <>
                                <SignupDurationTable prices={[...plan.prices].sort((a, b) => a.months - b.months)}
                                    selectedMonths={form.data.months} onChange={(months) => form.setData('months', months)} />
                                <p className="signup-duration-note">Longer plans are paid upfront. Cancel renewal at any time.</p>
                            </>
                        )}
                    </SignupPlanCard>
                )) : <p role="alert" className="signup-error">Membership plans are currently unavailable. Please try again later.</p>}
                <div style={{ textAlign: 'center' }}><Link href="/pricing" className="signup-link" target="_blank" rel="noreferrer">Compare all features</Link></div>
                {currentPlan && currentPrice && (
                    <div className="signup-plan-summary">
                        <span>{currentPlan.name}{form.data.plan !== 'free' && ` · ${form.data.months} ${form.data.months === 1 ? 'month' : 'months'}`}</span>
                        <span>Due today: {formatAmount(currentPrice.amount_minor, currentPrice.currency)}</span>
                    </div>
                )}
                {form.errors.plan && <p className="signup-error" role="alert">{form.errors.plan}</p>}
                {form.errors.months && <p className="signup-error" role="alert">{form.errors.months}</p>}
                <div className="signup-plan-footer">
                    <SignupButton type="submit" forward disabled={!currentPrice || form.processing}>
                        {form.processing ? 'Processing...' : form.data.plan === 'free' ? 'Start with Free' : 'Continue to payment'}
                    </SignupButton>
                    {form.data.plan !== 'free' && available.some((plan) => plan.code === 'free') && (
                        <SignupButton type="button" variant="link" onClick={() => selectPlan(available.find((plan) => plan.code === 'free')!)}>Start with Free instead</SignupButton>
                    )}
                    <Link className="signup-link" href="/join/step/2">Back</Link>
                    <p className="signup-payment-note"><LockKeyhole aria-hidden="true" />Review payment details before subscribing.</p>
                </div>
            </form>
        </OnboardingLayout>
    );
}
