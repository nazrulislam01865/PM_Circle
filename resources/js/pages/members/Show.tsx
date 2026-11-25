import { usePublicPageBanner } from '@/components/pm/PublicPageBanner';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Briefcase, MapPin, UserRoundCheck } from 'lucide-react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { ProfileHeroPhoto } from '@/components/profile/ProfileHeroPhoto';
import { ProfileOverviewSections } from '@/components/profile/ProfileOverviewSections';
import type { ProfileData } from '@/components/profile/ProfileEditorPrototype';
import { PostCard, type PostPreview } from '@/components/community/PostCard';
import { AdjacentPagination } from '@/components/pm/Pagination';
import { FeatureEmpty } from '@/components/pm/ContentPage';

type Props = {
    member: { id: number; name: string };
    overview: { profile: Omit<ProfileData, 'email' | 'phone'>; visibleFields: string[]; featuredProjectId?: number | null };
    posts: { data: PostPreview[]; next_cursor: string | null; previous_cursor: string | null; has_more: boolean };
    activeTab: 'overview' | 'posts';
    following: boolean;
    isOwnProfile: boolean;
    canFollow: boolean;
    canInteract: boolean;
};

export default function Show({ member, overview, posts, activeTab, following, isOwnProfile, canFollow, canInteract }: Props) {
    const profile = { ...overview.profile, email: '', phone: '' };
    const href = `/members/${member.id}`;
    const postsHref = (cursor?: string | null) => `${href}?tab=posts${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const location = [profile.city, profile.country].filter(Boolean).join(', ');
    const refreshPosts = () => router.reload({ only: ['posts'] });
    const follow = () => !canInteract ? router.visit('/login') : router.visit(`${href}/follow`, { method: following ? 'delete' : 'post', preserveScroll: true });
    return <PublicLayout active="/members" banner={{title: 'Member profile', currentLabel: member.name, parents: [{label: 'Members', href: '/members'}]}}>
        <Head title={`${member.name} - PM Circle`} />
        <div className="pm-container pm-page"><div className="pm-profile-page">
            <header className="pm-profile-top-bar">
                <div className="pm-profile-top-actions ml-auto flex-wrap">
                    <Link href="/members" className="pm-btn pm-btn-secondary"><ArrowLeft size={16}/> All members</Link>
                    {isOwnProfile ? <Link href="/settings/profile" className="pm-btn pm-btn-primary">Edit profile</Link>
                        : canFollow && <button type="button" className={`pm-btn ${following ? 'pm-btn-secondary' : 'pm-btn-primary'}`} onClick={follow}><UserRoundCheck size={17}/>{following ? 'Following' : canInteract ? 'Follow member' : 'Log in to follow'}</button>}
                </div>
            </header>
            <nav className="pm-profile-nav-tabs pm-member-tertiary-sticky" aria-label="Member profile tabs">
                <Link href={href} className={`pm-profile-tab-item ${activeTab === 'overview' ? 'is-active' : ''}`} aria-current={activeTab === 'overview' ? 'page' : undefined}>Overview</Link>
                <Link href={postsHref()} className={`pm-profile-tab-item ${activeTab === 'posts' ? 'is-active' : ''}`} aria-current={activeTab === 'posts' ? 'page' : undefined}>Posts</Link>
            </nav>
            <div className="pm-profile-main-col min-w-0 w-full">
                <div className="pm-hero-card">
                    <div className="pm-hero-cover" style={profile.cover_photo_path ? { backgroundImage: `url(${profile.cover_photo_path})` } : undefined}/>
                    <div className="pm-hero-body">
                        <div className="pm-hero-avatar-wrap"><ProfileHeroPhoto name={profile.name} src={profile.avatar_path}/></div>
                        <div className="pm-hero-name-row"><MemberProfileName name={profile.name}/></div>
                        {(profile.headline || profile.role) && <p className="pm-hero-headline">{profile.headline || profile.role}</p>}
                        <div className="pm-hero-meta">
                            {location && <span className="pm-hero-location"><MapPin size={20}/><span>{location}</span></span>}
                            {profile.open_to_opportunities && <span className="pm-status-pill"><Briefcase size={13}/> Open to opportunities</span>}
                        </div>
                    </div>
                </div>
                {activeTab === 'overview' ? <ProfileOverviewSections profile={profile} visibleFields={overview.visibleFields} featuredProjectId={overview.featuredProjectId ?? undefined}/>
                    : <section className="pm-profile-main-col" aria-label="Member posts">
                        <h2 className="pm-card-title">Posts</h2>
                        {posts.data.length ? posts.data.map(post => <PostCard key={post.id} post={post} isGuest={!canInteract}
                            onJoin={() => router.visit('/login')} onHiddenChange={refreshPosts} onRemoved={refreshPosts} onUpdated={refreshPosts}/>)
                            : <FeatureEmpty title="No posts yet" description="There are no published posts available to you on this page."/>}
                        <AdjacentPagination previous={posts.previous_cursor ? postsHref(posts.previous_cursor) : null} next={posts.next_cursor ? postsHref(posts.next_cursor) : null} label="Member post pages" nextLabel="Older posts"/>
                    </section>}
            </div>
        </div></div>
    </PublicLayout>;
}

function MemberProfileName({ name }: { name: string }) {
    const Heading = usePublicPageBanner() ? 'h2' : 'h1';
    return <Heading className="pm-hero-name">{name}</Heading>;
}
