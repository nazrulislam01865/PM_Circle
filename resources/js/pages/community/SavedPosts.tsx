import { Link } from '@inertiajs/react';
import { Bookmark } from 'lucide-react';
import { ContentPage, FeatureEmpty } from '@/components/pm/ContentPage';
import { PostCard, type PostPreview } from '@/components/community/PostCard';
export default function SavedPosts({ posts }: { posts: { data: PostPreview[]; prev_page_url: string | null; next_page_url: string | null } }) {
    return <ContentPage title="Saved posts" subtitle="Discussions you saved to revisit later.">
        {posts.data.length ? <section className="pm-panel pm-community-panel">{posts.data.map(post => <PostCard key={post.id} post={post}/>)}</section> : <FeatureEmpty title="Nothing saved yet" description="Bookmark a discussion using the Save action on a post. It will appear here for your account only." href="/community" linkLabel="Explore discussions"/>}
        <nav className="pm-pager" aria-label="Saved post pages">{posts.prev_page_url && <Link href={posts.prev_page_url}>Previous</Link>}{posts.next_page_url && <Link href={posts.next_page_url}>Load more saved posts</Link>}</nav>
        <p className="pm-feature-privacy"><Bookmark size={16}/> Saved posts are visible only to you.</p>
    </ContentPage>;
}
