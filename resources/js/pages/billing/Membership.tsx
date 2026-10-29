import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
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
    const [processing, setProcessing] = useState<PricingPlanCode | null>(null);
    const [error, setError] = useState<string | null>(null);

    const activate = (plan: PricingPlanCode) => {
        if (!temporaryAccessEnabled || processing !== null || plan === currentPlan) return;
        setProcessing(plan);
        setError(null);
        // Server-side environment/permissions determine whether demo access is permitted.
        router.post('/membership/temporary', { plan }, {
            preserveScroll: true,
            onError: errors => setError(errors.plan || 'Unable to update membership.'),
            onFinish: () => setProcessing(null),
        });
    };

    return <MemberDashboardLayout dashboard={memberShell}>
        <Head title="Membership plans" />
        <div className="pm-membership-comparison">
            <PricingComparisonContent
                plans={plans}
                error={error}
                billingFineprint="AI limits are illustrative. Paid billing and renewals require an enabled checkout integration."
                notice={<div className="pm-membership-notice">
                    <p className="pm-membership-current"><Crown size={17} aria-hidden="true"/>Current membership: <strong>{currentPlan === 'free' ? 'Free' : currentPlan === 'plus' ? 'Plus' : 'Pro'}</strong></p>
                    <p className="pm-membership-access"><ShieldCheck size={17} aria-hidden="true"/>{temporaryAccessEnabled
                        ? 'Complimentary access is enabled. Switching plans creates no charge or paid subscription; pricing durations are informational.'
                        : 'Paid checkout is not yet available. Your current membership remains unchanged.'}</p>
                </div>}
                renderAction={code => <button
                    type="button"
                    className={`pm-button ${code === 'plus' ? '' : 'pm-button-outline'} pm-button-sm`}
                    disabled={processing !== null || code === currentPlan || !temporaryAccessEnabled}
                    onClick={() => activate(code)}
                    title={!temporaryAccessEnabled && code !== currentPlan ? 'Checkout is not available' : undefined}
                >{code === currentPlan ? 'Current plan' : processing === code ? 'Applying…' : code === 'free' ? 'Switch to Free' : code === 'plus' ? 'Get Plus' : 'Get Pro'}</button>}
            />
        </div>
    </MemberDashboardLayout>;
}
