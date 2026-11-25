import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { JoinCommunityDialog } from '@/components/home/HomeEngagement';
import { HomeHero } from '@/components/home/v2/HomeHero';
import { HomeCertification, HomeCourses } from '@/components/home/v2/HomeLearning';
import { HomeCommunity } from '@/components/home/v2/HomeCommunity';
import { HomeAiPractice, HomeResume } from '@/components/home/v2/HomeAiResume';
import { HomeTrends } from '@/components/home/v2/HomeTrends';
import { HomeEvents } from '@/components/home/v2/HomeEvents';
import type { ScenarioSummary } from '@/components/home/ScenarioPreview';
import type { HomePost } from '@/components/home/HomePostPreview';
import type { HomeContent, HomeMember } from '@/types/home';
import type { HomeCourseCard } from '@/components/home/v2/reference';
import type { EventPreview } from '@/components/events/eventTypes';
import type { RewardPromotionData } from '@/types/reward';

type Props = {
    content: HomeContent; rewardPromotion: RewardPromotionData | null;
    scenario: ScenarioSummary | null; posts: HomePost[]; members: HomeMember[];
    courses?: HomeCourseCard[]; events?: EventPreview[];
};

type User = { onboarding_step: number; email_verified_at: string | null; is_admin?: boolean };

/** Homepage V2 only. Admin sections, public data, auth checks and shared footer remain centralized. */
export default function Home({ content, scenario, posts, members, rewardPromotion, courses = [], events = [] }: Props) {
    const { auth, emailVerificationRequired } = usePage<{ auth: { user: User | null }; emailVerificationRequired?: boolean }>().props;
    const [joinAction, setJoinAction] = useState<string | null>(null);
    const user = auth?.user;
    const canInteract = Boolean(user && !user.is_admin && user.onboarding_step >= 3 && (!emailVerificationRequired || user.email_verified_at));
    const visible = (section: keyof NonNullable<HomeContent['sections']>) => content.sections?.[section] !== false;
    const showCommunity = ['scenario', 'community', 'members', 'skills'].some(section => visible(section as keyof NonNullable<HomeContent['sections']>));

    return <PublicLayout siteLayout homePrototype homeEventsVisible={visible('careers')} homeAiVisible={visible('ai_features')} homeOfferLabel={rewardPromotion?.discountLabel}>
        <Head title="Learn, practise and connect | PM Circle"/>
        <div className="pm-home-v2">
            {visible('hero') && <HomeHero hero={content.hero} eventsVisible={visible('careers')}/>}
            {visible('pathway') && <><HomeCertification content={content.pathway?.exams} promotion={rewardPromotion}/>
                <HomeCourses courses={courses}/></>}
            {showCommunity && <HomeCommunity scenario={scenario} posts={posts} members={members} content={content}
                canInteract={canInteract} onJoin={setJoinAction}
                visibility={{ scenario: visible('scenario'), community: visible('community'), members: visible('members'), skills: visible('skills') }}/>}
            {visible('ai_features') && <HomeAiPractice content={content.ai_features}/>}
            {visible('careers') && <HomeResume content={content.careers}/>}
            <HomeTrends/>
            {visible('careers') && <HomeEvents join={content.careers?.join} events={events}/>}
            <JoinCommunityDialog action={joinAction} onClose={() => setJoinAction(null)} hasAccount={Boolean(user && !user.is_admin)}/>
        </div>
    </PublicLayout>;
}
