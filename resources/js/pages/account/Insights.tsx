import { Bookmark, BookOpen, Eye, MessageCircle, MessagesSquare } from 'lucide-react';
import { ContentPage } from '@/components/pm/ContentPage';

export default function Insights({ publicPosts, savedPosts, completedActivities, profileViews, replies, scenarioResponses }: {
    publicPosts: number;
    savedPosts: number;
    replies: number;
    scenarioResponses: number;
    completedActivities: number;
    profileViews: { last30: number; thisWeek: number };
}) {
    const items = [
        { label: 'Public posts', value: publicPosts, icon: MessageCircle },
        { label: 'Saved posts', value: savedPosts, icon: Bookmark },
        { label: 'Replies', value: replies, icon: MessagesSquare },
        { label: 'Scenario responses', value: scenarioResponses, icon: MessageCircle },
        { label: 'Completed practice activities', value: completedActivities, icon: BookOpen },
    ];
    return <ContentPage title="Profile insights" subtitle="Your recorded community and learning activity.">
        <div className="pm-feature-progress-grid">{items.map(item => <div className="pm-panel pm-feature-progress-card" key={item.label}><item.icon size={24}/><strong>{item.value}</strong><small>{item.label}</small></div>)}</div>
        <section className="pm-panel pm-feature-section"><h2><Eye size={21} className="inline-block"/> Profile views</h2>
            <div className="pm-member-overview-metrics is-two"><div><strong>{profileViews.last30}</strong><span>Views in 30 days</span></div><div><strong>{profileViews.thisWeek}</strong><span>Views this week</span></div></div>
            <p className="small muted">Counts are unique daily visits by signed-in members. Guest and self visits are not recorded. Tracking begins after this feature is deployed; older visits are unavailable.</p>
        </section>
    </ContentPage>;
}
