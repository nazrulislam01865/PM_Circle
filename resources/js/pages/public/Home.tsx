import { Head, Link, usePage } from '@inertiajs/react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { CommunityOrbit } from '@/components/home/CommunityOrbit';
import { ScenarioPreview, type ScenarioResponsePreview, type ScenarioSummary } from '@/components/home/ScenarioPreview';
import { HomeMembers, SkillSidebar } from '@/components/home/HomeSidebar';
import { type HomePost } from '@/components/home/HomePostPreview';
import { HomeCommunitySection } from '@/components/home/HomeCommunitySection';
import { CareerHighlights } from '@/components/home/CareerHighlights';
import { HomePathway } from '@/components/home/HomePathway';
import type { HomeContent, HomeMember } from '@/types/home';
import { JoinCommunityDialog } from '@/components/home/HomeEngagement';
import { useState } from 'react';

type Props = {
    content: HomeContent;
    isDemo: boolean;
    scenario: ScenarioSummary | null;
    scenarioResponses: ScenarioResponsePreview[];
    posts: HomePost[];
    members: HomeMember[];
};

export default function Home({ content, isDemo, scenario, scenarioResponses, posts, members }: Props) {
    const { auth, emailVerificationRequired } = usePage<{ auth: { user: { onboarding_step: number; email_verified_at: string | null } | null }; emailVerificationRequired?: boolean }>().props;
    const [joinAction, setJoinAction] = useState<string | null>(null);
    const canInteract = Boolean(auth?.user && auth.user.onboarding_step >= 3 && (!emailVerificationRequired || auth.user.email_verified_at));
    const hero = content.hero;
    const people = hero?.people ?? [];

    return <PublicLayout><Head title="Learn together. Practise daily. Grow your career"/>
        <div className="pm-home">
            <section className="pm-hero"><div className="pm-container pm-hero-inner"><div className="pm-hero-copy">
                <p className="pm-kicker">{hero?.eyebrow}</p><h1>{hero?.title}</h1>
                <p>{hero?.description}</p>
                <div className="pm-hero-actions"><Link href={auth?.user ? '/dashboard' : '/register'} className="pm-button">{hero?.primary_label}</Link>
                    <Link href="/community" className="pm-button pm-button-outline">{hero?.secondary_label}</Link></div>
            </div><CommunityOrbit people={people}/></div></section>
            <HomePathway content={content.pathway}/>
            <div className="pm-container pm-home-showcases">
                <div className="pm-home-main">
                    <ScenarioPreview scenario={scenario} responses={scenarioResponses ?? []} content={content.scenario} canInteract={canInteract} onJoin={setJoinAction}/>
                    <HomeCommunitySection posts={posts} content={content.community} joinHref={auth?.user ? '/community' : '/register'} canInteract={canInteract} onJoin={setJoinAction}/>
                </div>
                <aside className="pm-home-sidebar" aria-label="More from PM Circle">
                    <HomeMembers members={members} content={content.members}/>
                    <SkillSidebar content={content.skills}/>
                </aside>
            </div>
            <CareerHighlights content={content.careers} people={people} demo={isDemo}/>
            <JoinCommunityDialog action={joinAction} onClose={() => setJoinAction(null)} hasAccount={Boolean(auth?.user)}/>
        </div>
    </PublicLayout>;
}
