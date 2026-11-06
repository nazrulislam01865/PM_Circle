import { Link } from '@inertiajs/react';
import type { FeedScope } from '@/components/community/FeedScopeTabs';

const defaultTopics = ['All', 'Questions', 'I learned', 'From my project'];

export function TopicPills({ active = 'All', topics = defaultTopics, feedTab = 'all' }: { active?: string; topics?: readonly string[]; feedTab?: FeedScope }) {
    return (
        <div className="pm-topic-filters" role="group" aria-label="Discussion topics">
            {topics.map((topic) => {
                const isSelected = active === topic || (active === 'Ask the community' && topic === 'Questions');
                const params = new URLSearchParams({ ...(topic !== 'All' ? { topic } : {}), ...(feedTab !== 'all' ? { tab: feedTab } : {}) });
                const href = params.size ? `/community?${params}` : '/community';
                return (
                    <Link
                        key={topic}
                        href={href}
                        className={`pm-filter-pill ${isSelected ? 'active' : ''}`}
                    >
                        {topic}
                    </Link>
                );
            })}
        </div>
    );
}
