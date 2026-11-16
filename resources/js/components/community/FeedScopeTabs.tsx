import { Link } from '@inertiajs/react';

export type FeedScope = 'all' | 'following' | 'mine' | 'saved' | 'hidden';
export type FeedScopeCounts = { saved: number; hidden: number };

const baseScopes: { value: FeedScope; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'following', label: 'Following' },
    { value: 'mine', label: 'My posts' },
];

/** Only add private tabs when the member has at least one visible item in that list. */
export function FeedScopeTabs({ active, hrefFor, counts = { saved: 0, hidden: 0 } }: {
    active: FeedScope;
    hrefFor: (scope: FeedScope) => string;
    counts?: FeedScopeCounts;
}) {
    const scopes = [
        ...baseScopes,
        ...(counts.saved > 0 ? [{ value: 'saved' as const, label: 'Saved' }] : []),
        ...(counts.hidden > 0 ? [{ value: 'hidden' as const, label: 'Hidden' }] : []),
    ];
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
