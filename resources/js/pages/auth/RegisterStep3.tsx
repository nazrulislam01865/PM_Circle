import { Head, Link, useForm } from '@inertiajs/react';
import { Info } from 'lucide-react';
import { PlanCard, type Plan } from '@/components/billing/PlanCard';
import { ActionButton } from '@/components/pm/ActionButton';
import { OnboardingLayout } from '@/layouts/pm/OnboardingLayout';
import { taka } from '@/lib/money';

type Props = { plans: Plan[]; temporaryAccessEnabled: boolean };

export default function RegisterStep3({ plans, temporaryAccessEnabled }: Props) {
    const defaultPlan = plans.find((plan) => plan.code === 'plus' && plan.prices.length > 0)
        ?? plans.find((plan) => plan.code === 'free' && plan.prices.length > 0)
        ?? plans[0];
    const form = useForm({
        plan: defaultPlan?.code ?? 'free',
        months: defaultPlan?.prices[0]?.months ?? 1,
    });
    const selected = plans.find((plan) => plan.code === form.data.plan);
    const hasPlans = plans.length > 0;
    const hasSelectedPrice = Boolean(
        selected?.prices.some((price) => price.months === form.data.months),
    );

    const choose = (plan: Plan) => {
        form.setData({ plan: plan.code, months: plan.prices[0]?.months ?? 1 });
        form.clearErrors('plan', 'months');
    };

    return (
        <OnboardingLayout
            title="Choose your starting point."
            subtitle="Start free. Upgrade whenever you're ready."
            step={3}
        >
            <Head title="Choose your membership" />
            <form onSubmit={(event) => {
                event.preventDefault();
                form.post('/join/step/3');
            }}>
                {!hasPlans && (
                    <p className="pm-error pm-catalog-unavailable" role="alert">
                        Membership plans are not configured. Please contact the administrator to restore the plan catalog.
                    </p>
                )}
                {plans.map((plan) => (
                    <PlanCard
                        key={plan.code}
                        plan={plan}
                        active={form.data.plan === plan.code}
                        onSelect={() => choose(plan)}
                    >
                        {form.data.plan === plan.code && plan.code !== 'free' && (
                            <div>
                                <h3 className="pm-duration-title">Choose your subscription duration</h3>
                                {plan.prices.length > 0 ? (
                                    <div className="pm-duration-grid">
                                        {plan.prices.map((option) => (
                                            <button
                                                key={option.months}
                                                type="button"
                                                className={`pm-duration ${form.data.months === option.months ? 'selected' : ''}`}
                                                aria-pressed={form.data.months === option.months}
                                                onClick={() => form.setData('months', option.months)}
                                            >
                                                <span className={`pm-radio ${form.data.months === option.months ? 'checked' : ''}`} />
                                                <span>
                                                    <strong>{option.months} {option.months === 1 ? 'month' : 'months'}</strong>
                                                    <b>{taka(option.amount_minor / option.months)} / month</b>
                                                    <small>{taka(option.amount_minor)} standard price for {option.months} {option.months === 1 ? 'month' : 'months'}</small>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="pm-error" role="status">
                                        Subscription durations have not been configured for this plan.
                                    </p>
                                )}
                                <p className="pm-auth-note">
                                    {temporaryAccessEnabled
                                        ? 'Complimentary access is enabled. No payment is collected; durations are displayed for comparison.'
                                        : 'Paid checkout is not available yet. Select Free to complete registration.'}
                                </p>
                            </div>
                        )}
                    </PlanCard>
                ))}

                {selected && (
                    <div className="pm-payment-summary">
                        <span>Selected: {selected.name}{selected.code === 'free' ? '' : ` · ${form.data.months} ${form.data.months === 1 ? 'month' : 'months'}`}</span>
                        <span>{form.data.plan === 'free' || temporaryAccessEnabled ? 'No payment required' : 'Checkout unavailable'}</span>
                    </div>
                )}
                {form.errors.plan && <p className="pm-error" role="alert">{form.errors.plan}</p>}
                {form.errors.months && <p className="pm-error" role="alert">{form.errors.months}</p>}

                <ActionButton
                    type="submit"
                    forward
                    disabled={form.processing || !hasPlans || !hasSelectedPrice || (form.data.plan !== 'free' && !temporaryAccessEnabled)}
                    className="pm-auth-submit"
                >
                    {form.data.plan === 'free'
                        ? 'Start with Free'
                        : temporaryAccessEnabled
                            ? `Continue with ${selected?.name ?? 'Plus'}`
                            : 'Paid plans coming soon'}
                </ActionButton>
                {form.data.plan !== 'free' && (
                    <button
                        className="pm-skip"
                        type="button"
                        onClick={() => {
                            const free = plans.find((plan) => plan.code === 'free');
                            if (free) choose(free);
                        }}
                    >
                        Start with Free instead
                    </button>
                )}
                <div className="pm-auth-note">
                    <Info size={15} />
                    {form.data.plan === 'free'
                        ? 'Your Free membership starts immediately.'
                        : temporaryAccessEnabled
                            ? 'Complimentary membership access. No payment is collected or subscription created.'
                            : 'To finish registration, select the Free plan. Paid checkout is not available.'}
                </div>
                <Link href="/join/step/2" className="pm-skip">Back</Link>
            </form>
        </OnboardingLayout>
    );
}
