import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/pm/SiteHeader';

type AuthPageFrameProps = {
    children: ReactNode;
    headerPrompt: string;
    headerLinkHref: string;
    headerLinkLabel: string;
    className?: string;
};

/** Login and signup use the same site navigation as the homepage. */
export function AuthPageFrame({ children, className = '' }: AuthPageFrameProps) {
    return <div className={`pm-app pm-auth-shell ${className}`.trim()}>
        <SiteHeader joinLabel="Join free" />
        <main className="pm-auth-main">
            {children}
            <p className="pm-auth-bottom">Learn together. Practise daily. Grow your career.</p>
        </main>
    </div>;
}
