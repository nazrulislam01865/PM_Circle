import { Link } from '@inertiajs/react';

const defaultTopics = ['All', 'Questions', 'I learned', 'From my project'];

export function TopicPills({ active = 'All', topics = defaultTopics }: { active?: string; topics?: readonly string[] }) {
    return (
        <div className="pm-topic-filters" role="group" aria-label="Discussion topics">
            {topics.map((topic) => {
                const isSelected = active === topic || (active === 'Ask the community' && topic === 'Questions');
                const href = topic === 'All' ? '/community' : `/community?topic=${encodeURIComponent(topic)}`;
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
