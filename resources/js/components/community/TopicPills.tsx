import { Link } from '@inertiajs/react';
const topics = ['All', 'I learned', 'From my project', 'Ask the community'];
export function TopicPills({ active = 'All' }: { active?: string }) {
    return <div className="pm-topic-pills" role="group" aria-label="Discussion filters">{topics.map(topic => <Link key={topic} href={topic === 'All' ? '/community' : `/community?topic=${encodeURIComponent(topic)}`} className={active === topic ? 'selected' : ''}>{topic}</Link>)}</div>;
}
