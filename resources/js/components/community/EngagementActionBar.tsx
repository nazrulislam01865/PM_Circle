import type { ReactNode } from 'react';

/** Shared post, scenario and response action-row layout. Interaction ownership stays with each action. */
export function EngagementActionBar({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`pm-engagement-actions ${className}`.trim()}>{children}</div>;
}
