import { Head, Link, usePage } from '@inertiajs/react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { CommunityOrbit } from '@/components/home/CommunityOrbit';
import { ScenarioPreview, type ScenarioResponsePreview, type ScenarioSummary } from '@/components/home/ScenarioPreview';
import { HomeMembers, SkillSidebar } from '@/components/home/HomeSidebar';
import { type HomePost } from '@/components/home/HomePostPreview';
import { HomeCommunitySection } from '@/components/home/HomeCommunitySection';
import { CareerHighlights } from '@/components/home/CareerHighlights';
import { HomePathway } from '@/components/home/HomePathway';
import type { HomeContent, HomeMember, HomeCareerJob } from '@/types/home';
import type { HomepageIconAssets } from '@/components/home/HomeContentIcon';
import { JoinCommunityDialog } from '@/components/home/HomeEngagement';
import { useState } from 'react';

type Props = {
    content: HomeContent;
    iconAssets?: HomepageIconAssets;
    isDemo: boolean;
    scenario: ScenarioSummary | null;
    scenarioResponses: ScenarioResponsePreview[];
    posts: HomePost[];
    members: HomeMember[];
    jobs: HomeCareerJob[];
};

export default function Home({ content, iconAssets, isDemo, scenario, scenarioResponses, posts, members, jobs }: Props) {
    const { auth, emailVerificationRequired } = usePage<{ auth: { user: { onboarding_step: number; email_verified_at: string | null; is_admin?: boolean } | null }; emailVerificationRequired?: boolean }>().props;
    const [joinAction, setJoinAction] = useState<string | null>(null);
    const canInteract = Boolean(auth?.user && !auth.user.is_admin && auth.user.onboarding_step >= 3 && (!emailVerificationRequired || auth.user.email_verified_at));
    const hero = content.hero;
    const people = hero?.people ?? [];
    const visible = (section: keyof NonNullable<HomeContent['sections']>) => content.sections?.[section] !== false;

    return <PublicLayout siteLayout><Head title="Learn together. Practise daily. Grow your career"/>
        <div className="pm-home">
            {visible('hero') && <section className="pm-hero"><div className="pm-container pm-hero-inner"><div className="pm-hero-copy">
                <p className="pm-kicker">{hero?.eyebrow}</p><h1>{hero?.title}</h1>
                <p>{hero?.description}</p>
                <div className="pm-hero-actions"><Link href={auth?.user && (!hero?.primary_url || hero.primary_url === '/register') ? (auth.user.is_admin ? '/admin' : '/dashboard') : (hero?.primary_url || '/register')} className="pm-button">{hero?.primary_label}</Link>
                    <Link href={hero?.secondary_url || '/community'} className="pm-button pm-button-outline">{hero?.secondary_label}</Link></div>
            </div><CommunityOrbit people={people} content={hero}/></div></section>}
            {visible('pathway') && <HomePathway content={content.pathway} iconAssets={iconAssets}/>}
            {(visible('scenario') || visible('community') || visible('members') || visible('skills')) && <div className={`pm-container pm-home-showcases ${!(visible('scenario') || visible('community')) || !(visible('members') || visible('skills')) ? 'pm-home-showcases-single' : ''}`}>
                <div className="pm-home-main">
                    {visible('scenario') && <ScenarioPreview scenario={scenario} responses={scenarioResponses ?? []} content={content.scenario} canInteract={canInteract} onJoin={setJoinAction}/>}
                    {visible('community') && <HomeCommunitySection posts={posts} content={content.community} joinHref={auth?.user?.is_admin ? '/admin' : (auth?.user ? '/community' : '/register')} canInteract={canInteract} onJoin={setJoinAction}/>}
                </div>
                <aside className="pm-home-sidebar" aria-label="More from PM Circle">
                    {visible('members') && <HomeMembers members={members} content={content.members}/>}
                    {visible('skills') && <SkillSidebar content={content.skills} iconAssets={iconAssets}/>}
                </aside>
            </div>}
            {(visible('careers') || (content.sections?.career_features ?? content.sections?.careers) !== false) && <CareerHighlights content={content.careers} people={people} demo={isDemo} iconAssets={iconAssets} jobs={jobs ?? []}
                showFeatures={(content.sections?.career_features ?? content.sections?.careers) !== false} showRest={visible('careers')}/>}
            <JoinCommunityDialog action={joinAction} onClose={() => setJoinAction(null)} hasAccount={Boolean(auth?.user && !auth.user.is_admin)}/>
        </div>
    </PublicLayout>;
}
