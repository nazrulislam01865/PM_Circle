import { Link } from '@inertiajs/react';

export type FeedScope = 'all' | 'following' | 'mine';

const scopes: { value: FeedScope; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'following', label: 'Following' },
    { value: 'mine', label: 'My posts' },
];

export function FeedScopeTabs({ active, hrefFor }: {
    active: FeedScope;
    hrefFor: (scope: FeedScope) => string;
}) {
    return <nav className="pm-feed-scope-tabs" aria-label="Filter community posts">
        {scopes.map(scope => <Link
            key={scope.value}
            href={hrefFor(scope.value)}
            className={`pm-feed-scope-tab ${active === scope.value ? 'active' : ''}`}
            aria-current={active === scope.value ? 'page' : undefined}
            preserveScroll
        >{scope.label}</Link>)}
    </nav>;
}
