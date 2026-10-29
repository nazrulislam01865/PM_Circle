import { Bookmark, BookOpen, MessageCircle, Eye } from 'lucide-react';
import { ContentPage } from '@/components/pm/ContentPage';
export default function Insights({ publicPosts, savedPosts, completedActivities }: { publicPosts: number; savedPosts: number; completedActivities: number }) {
    const items = [{ label: 'Public posts', value: publicPosts, icon: MessageCircle }, { label: 'Saved posts', value: savedPosts, icon: Bookmark }, { label: 'Completed practice activities', value: completedActivities, icon: BookOpen }];
    return <ContentPage title="Profile insights" subtitle="Your activity summary. No visitor identities are collected or inferred.">
        <div className="pm-feature-progress-grid">{items.map(item => <div className="pm-panel pm-feature-progress-card" key={item.label}><item.icon size={24}/><strong>{item.value}</strong><small>{item.label}</small></div>)}</div>
        <section className="pm-panel pm-feature-section"><h2><Eye size={21} className="inline-block"/> Profile views</h2><p>Visitor tracking and profile-view counts are not enabled yet. This screen does not display invented statistics or viewer names.</p></section>
    </ContentPage>;
}
