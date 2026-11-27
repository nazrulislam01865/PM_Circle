import { Link } from '@inertiajs/react';
import { LockKeyhole } from 'lucide-react';

export type FeedScope = 'all' | 'following' | 'mine' | 'saved' | 'hidden' | 'restricted';
export type FeedScopeCounts = { saved: number; hidden: number; restricted?: number };

const baseScopes: { value: FeedScope; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'following', label: 'Following' },
    { value: 'mine', label: 'My posts' },
];

/** Only add private tabs when the member has at least one visible item in that list. */
export function FeedScopeTabs({ active, hrefFor, counts = { saved: 0, hidden: 0 }, showRestricted = false, only }: {
    active: FeedScope;
    hrefFor: (scope: FeedScope) => string;
    counts?: FeedScopeCounts;
    showRestricted?: boolean;
    only?: string[];
}) {
    const scopes = [
        ...baseScopes,
        ...(counts.saved > 0 ? [{ value: 'saved' as const, label: 'Saved' }] : []),
        ...(counts.hidden > 0 ? [{ value: 'hidden' as const, label: 'Hidden' }] : []),
        ...(showRestricted && (counts.restricted ?? 0) > 0 ? [{ value: 'restricted' as const, label: `Restricted (${counts.restricted})` }] : []),
    ];
    return <nav className="pm-feed-scope-tabs" aria-label="Filter community posts">
        {scopes.map(scope => <Link
            key={scope.value}
            href={hrefFor(scope.value)}
            className={`pm-feed-scope-tab ${active === scope.value ? 'active' : ''} ${scope.value === 'restricted' ? 'pm-feed-scope-restricted' : ''}`}
            aria-current={active === scope.value ? 'page' : undefined}
            preserveScroll
            only={only}
        >{scope.value === 'restricted' && <LockKeyhole size={15} aria-hidden="true"/>}{scope.label}</Link>)}
    </nav>;
}
