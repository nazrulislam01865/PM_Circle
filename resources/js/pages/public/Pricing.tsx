import { Head, Link, usePage } from '@inertiajs/react';
import { PricingComparisonContent, type PricingContent } from '@/components/billing/PricingComparisonContent';
import type { Plan } from '@/components/billing/PlanCard';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

export default function Pricing({ plans, content }: { plans: Plan[]; content: PricingContent }) {
    const { auth } = usePage<{ auth: { user: { onboarding_step: number; is_admin?: boolean } | null } }>().props;
    const signedIn = Boolean(auth?.user && !auth.user.is_admin);
    // Existing account/checkout routes: no client-side checkout is fabricated by this page.
    const chooseHref = auth?.user?.is_admin ? '/admin' : !signedIn ? '/register' : (auth.user?.onboarding_step ?? 0) < 3 ? '/join/step/3' : '/membership?view=plans';

    return <PublicLayout active="/pricing" pricingPrototype guideLayout banner={{title: content.banner.title, currentLabel: content.banner.currentLabel, description: content.banner.description}}>
        <Head title={content.banner.metaTitle} />
        <PricingComparisonContent plans={plans} content={content} renderAction={code => <Link
            className={`pm-button ${code === 'plus' ? '' : 'pm-button-outline'} pm-button-sm`}
            href={chooseHref}
        >{auth?.user?.is_admin ? content.actions.adminLabel : code === 'free' ? (signedIn ? content.actions.freeMember : content.actions.freeGuest) : code === 'plus' ? content.actions.plusLabel : content.actions.proLabel}</Link>} />
    </PublicLayout>;
}
