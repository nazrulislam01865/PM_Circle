import { Head, Link, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { Crown, ShieldCheck } from 'lucide-react';
import { PricingComparisonContent, type PricingPlanCode } from '@/components/billing/PricingComparisonContent';
import type { Plan } from '@/components/billing/PlanCard';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardShellData } from '@/types/dashboard';

export default function Membership({ plans, currentPlan, temporaryAccessEnabled }: {
    plans: Plan[];
    currentPlan: PricingPlanCode;
    temporaryAccessEnabled: boolean;
}) {
    const { memberShell } = usePage<{ memberShell: DashboardShellData }>().props;
    const submitting = useRef(false);
    const [processing, setProcessing] = useState<PricingPlanCode | null>(null);
    const [error, setError] = useState<string | null>(null);

    const activate = (plan: PricingPlanCode, months?: number) => {
        if (!temporaryAccessEnabled || submitting.current || processing !== null || plan === currentPlan || (plan !== 'free' && !months)) return;
        submitting.current = true;
        setProcessing(plan);
        setError(null);
        // Server-side environment/permissions determine whether demo access is permitted.
        router.post('/membership/temporary', { plan, months }, {
            // Reveal the existing inline alert even if the plan buttons are below the fold.
            preserveScroll: page => !page.props.errors?.plan && !page.props.errors?.months,
            onError: errors => setError(errors.plan || errors.months || 'Unable to update membership.'),
            onFinish: () => {
                submitting.current = false;
                setProcessing(null);
            },
        });
    };

    return <MemberDashboardLayout dashboard={memberShell}>
        <Head title="Membership plans" />
        <div className="pm-membership-comparison">
            <Link href="/membership" className="pm-account-back">← Plan &amp; usage</Link>
            <PricingComparisonContent
                plans={plans}
                error={error}
                billingFineprint={temporaryAccessEnabled
                    ? 'Demo access only. Selected durations determine access validity. Switching plans does not collect payment or schedule renewals.'
                    : 'AI limits are illustrative. Paid billing and renewals require an enabled checkout integration.'}
                notice={<div className="pm-membership-notice">
                    <p className="pm-membership-current"><Crown size={17} aria-hidden="true"/>Current membership: <strong>{currentPlan === 'free' ? 'Free' : currentPlan === 'plus' ? 'Plus' : 'Pro'}</strong></p>
                    <p className="pm-membership-access"><ShieldCheck size={17} aria-hidden="true"/>{temporaryAccessEnabled
                        ? 'Demo plan switching is enabled. Choose a plan and available duration to update your access; no payment or paid subscription is created.'
                        : 'Demo plan switching is disabled. Paid checkout is not yet available; your current membership remains unchanged.'}</p>
                </div>}
                renderAction={(code, months) => <button
                    type="button"
                    className={`pm-button ${code === 'plus' ? '' : 'pm-button-outline'} pm-button-sm`}
                    disabled={processing !== null || code === currentPlan || !temporaryAccessEnabled || (code !== 'free' && !months)}
                    onClick={() => activate(code, months)}
                    title={!temporaryAccessEnabled && code !== currentPlan ? 'Demo plan switching is disabled' : undefined}
                >{code === currentPlan ? 'Current plan' : processing === code ? 'Applying…' : code === 'free' ? 'Switch to Free' : code === 'plus' ? 'Switch to Plus' : 'Switch to Pro'}</button>}
            />
        </div>
    </MemberDashboardLayout>;
}
