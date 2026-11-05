import { Link } from '@inertiajs/react';
import { NotebookPen } from 'lucide-react';
import { TopicPills } from '@/components/community/TopicPills';
import { HomePostPreview, type HomePost } from '@/components/home/HomePostPreview';
import type { RequestToJoin } from '@/components/home/HomeEngagement';
import { SectionHead } from '@/components/pm/SectionHead';
import type { HomeContent } from '@/types/home';

export function HomeCommunitySection({ posts, content, joinHref, canInteract, onJoin }: {
    posts: HomePost[];
    content?: HomeContent['community'];
    joinHref: string; canInteract: boolean; onJoin: RequestToJoin;
}) {
    return <section className="pm-panel pm-community-panel pm-home-community-card">
        <SectionHead href="/community" linkText={content?.view_all_label}>{content?.heading}</SectionHead>
        <TopicPills active="All" topics={content?.topics ?? ['All', 'I learned', 'From my project', 'Ask the community']}/>
        <div className="pm-home-community-posts">
            {posts.length ? posts.map(post => <HomePostPreview key={post.id} post={post} canInteract={canInteract} onJoin={onJoin}/>)
                : <p className="pm-empty">The discussion is just getting started. Share your first lesson or question to help others grow.</p>}
        </div>
        <div className="pm-join-strip pm-home-join-strip">
            <NotebookPen size={34} strokeWidth={1.8} aria-hidden="true"/>
            <div><strong>{content?.prompt_title}</strong><small>{content?.prompt_description}</small></div>
            <Link href={joinHref} className="pm-button pm-button-sm">{content?.button_label}</Link>
        </div>
    </section>;
}
