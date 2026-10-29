import { Link } from '@inertiajs/react';
import { ChevronRight, MapPin, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';

type Related = { id: number; title?: string | null; body: string; comments_count: number };
export function PostSidebar({ name, role, relatedPosts, demo, loggedIn }: {
    name: string; role?: string | null; relatedPosts: Related[]; demo: boolean; loggedIn: boolean;
}) {
    return <aside className="pm-stack pm-post-sidebar">
        <section className="pm-panel pm-sidebar-detail"><h3>About the author</h3><div className="pm-author-card"><Avatar name={name} size={75}/><div><strong>{name}</strong><p>{role || 'Community member'}{demo && name === 'Nadia Rahman' ? ' · PMP®' : ''}</p>{demo && <p className="pm-author-location"><MapPin size={15}/>Dhaka, Bangladesh</p>}</div></div><div className="pm-sidebar-divider"/><p>View profile after joining.</p><Link href={loggedIn ? '/members' : '/register'} className="pm-button pm-block">{loggedIn ? 'View member directory' : 'Join to follow'}</Link></section>
        <section className="pm-panel pm-sidebar-detail"><h3>Keep the conversation useful</h3>{[
            { icon: MessageSquare, title: 'Share real experience', desc: "Practical insights, lessons and what worked (or didn't)." },
            { icon: Users, title: 'Respect different views', desc: 'Be constructive and keep it professional.' },
            { icon: ShieldCheck, title: 'Protect confidential details', desc: 'Avoid sharing sensitive client, company or personal information.' },
        ].map(rule => <div className="pm-guideline" key={rule.title}><div className="pm-guideline-icon"><rule.icon size={24}/></div><div><strong>{rule.title}</strong><p>{rule.desc}</p></div></div>)}</section>
        <section className="pm-panel pm-sidebar-detail"><h3>More from the community</h3>{relatedPosts.map((post, index) => <Link className="pm-related-post" key={post.id} href={`/posts/${post.id}`}><span>{post.title || post.body.slice(0, 85)}<small><MessageSquare size={15}/>{demo ? (index === 0 ? 28 : 16) : post.comments_count} comments</small></span><ChevronRight size={18}/></Link>)}
            {!relatedPosts.length && <p>New discussions will appear here.</p>}
        </section>
    </aside>;
}
