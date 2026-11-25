import { Head, usePage } from '@inertiajs/react';
import { SimulatorCatalog } from '@/components/exam/SimulatorCatalog';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { RewardPromotionData } from '@/types/reward';

export default function BrowseSimulators() {
    const { rewardPromotion } = usePage<{ rewardPromotion?: RewardPromotionData | null }>().props;
    const promotion = rewardPromotion ?? null;

    return <PublicLayout siteLayout homePrototype guideLayout homeOfferLabel={promotion?.discountLabel} banner={{title: 'Browse Exam Simulators', description: 'Find practice for your certification, see what each simulator covers, and choose how to get started.', titleId: 'pm-sim-page-title'}}>
        <Head title="Browse Exam Simulators | PM Circle">
            <meta name="description" content="Explore PMP, Scrum, CAPM and business analysis exam simulator practice with PM Circle."/>
        </Head>
        <SimulatorCatalog promotion={promotion}/>
    </PublicLayout>;
}
