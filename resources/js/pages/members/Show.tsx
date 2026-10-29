import { Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, BookOpen, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';
import { ContentPage, FeatureEmpty } from '@/components/pm/ContentPage';

type Member = { id: number; name: string; profile: { role?: string | null; headline?: string | null; bio?: string | null } };
type Post = { id: number; title: string | null; body: string; topic: string; comments_count: number };
export default function Show({ member, posts, following, isOwnProfile }: { member: Member; posts: Post[]; following: boolean; isOwnProfile: boolean }) {
    const viewer = usePage<{ auth: { user: unknown | null } }>().props.auth?.user;
    const follow = () => !viewer ? router.visit('/login') : router.visit(`/members/${member.id}/follow`, { method: following ? 'delete' : 'post', preserveScroll: true });
    return <ContentPage title="Member profile" action={<Link href="/members" className="pm-text-link"><ArrowLeft size={16}/> All members</Link>}>
        <div className="pm-feature-profile pm-panel"><Avatar name={member.name} size={80}/><div><h2>{member.name}</h2><p>{member.profile.role || 'PM Circle member'}</p>{member.profile.headline && <p>{member.profile.headline}</p>}</div>
            {isOwnProfile ? <Link href="/settings/profile" className="pm-button pm-button-outline pm-button-sm">Edit profile</Link> : <button type="button" className={`pm-button pm-button-sm ${following ? 'pm-button-outline' : ''}`} onClick={follow}><UserRoundCheck size={17}/>{following ? 'Following' : viewer ? 'Follow member' : 'Log in to follow'}</button>}
        </div>
        {member.profile.bio && <section className="pm-panel pm-feature-section"><h2>About</h2><p>{member.profile.bio}</p></section>}
        <section className="pm-panel pm-feature-section"><h2>Public discussions</h2>{posts.length ? posts.map(post => <Link href={`/posts/${post.id}`} className="pm-feature-post" key={post.id}><BookOpen size={18}/><div><strong>{post.title || post.topic}</strong><p>{post.body.slice(0, 200)}{post.body.length > 200 ? '…' : ''}</p><small>{post.comments_count} comments</small></div></Link>) : <FeatureEmpty title="No public posts yet" description="This member has not published any public posts."/>}</section>
        <p className="pm-feature-privacy"><ShieldCheck size={17}/> This profile displays public information only.</p>
    </ContentPage>;
}
