import { Head, Link, usePage } from '@inertiajs/react';
import { PricingComparisonContent } from '@/components/billing/PricingComparisonContent';
import type { Plan } from '@/components/billing/PlanCard';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

export default function Pricing({ plans }: { plans: Plan[] }) {
    const { auth } = usePage<{ auth: { user: { onboarding_step: number; is_admin?: boolean } | null } }>().props;
    const signedIn = Boolean(auth?.user && !auth.user.is_admin);
    // Existing account/checkout routes: no client-side checkout is fabricated by this page.
    const chooseHref = auth?.user?.is_admin ? '/admin' : !signedIn ? '/register' : (auth.user?.onboarding_step ?? 0) < 3 ? '/join/step/3' : '/membership';

    return <PublicLayout active="/pricing" pricingPrototype>
        <Head title="Compare Free, Plus and Pro" />
        <PricingComparisonContent plans={plans} renderAction={code => <Link
            className={`pm-button ${code === 'plus' ? '' : 'pm-button-outline'} pm-button-sm`}
            href={chooseHref}
        >{auth?.user?.is_admin ? 'Administration' : code === 'free' ? (signedIn ? 'Manage Free' : 'Register free') : code === 'plus' ? 'Get Plus' : 'Get Pro'}</Link>} />
    </PublicLayout>;
}
