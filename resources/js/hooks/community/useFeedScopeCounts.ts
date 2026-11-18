import { useEffect, useState } from 'react';
import type { FeedScopeCounts } from '@/components/community/FeedScopeTabs';

/** Server-verified starting counts; update them only after successful mutations. */
export function useFeedScopeCounts(initial: FeedScopeCounts) {
    const [counts, setCounts] = useState(initial);
    useEffect(() => setCounts(initial), [initial.saved, initial.hidden, initial.restricted]);

    const updateSaved = (previous: boolean, next: boolean, isHidden: boolean) => {
        if (previous === next || isHidden) return;
        setCounts(current => ({ ...current, saved: Math.max(0, current.saved + (next ? 1 : -1)) }));
    };
    const updateHidden = (previous: boolean, next: boolean, isSaved: boolean) => {
        if (previous === next) return;
        setCounts(current => ({
            saved: Math.max(0, current.saved + (isSaved ? (next ? -1 : 1) : 0)),
            hidden: Math.max(0, current.hidden + (next ? 1 : -1)),
            restricted: current.restricted,
        }));
    };
    return { counts, updateSaved, updateHidden };
}
