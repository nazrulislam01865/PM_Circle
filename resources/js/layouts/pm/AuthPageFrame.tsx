import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Brand } from '@/components/pm/Brand';

type AuthPageFrameProps = {
    children: ReactNode;
    headerPrompt: string;
    headerLinkHref: string;
    headerLinkLabel: string;
    className?: string;
};

/** Shared public authentication shell for login and all signup steps. */
export function AuthPageFrame({
    children,
    headerPrompt,
    headerLinkHref,
    headerLinkLabel,
    className = '',
}: AuthPageFrameProps) {
    return (
        <div className={`pm-app pm-auth-shell ${className}`.trim()}>
            <header className="pm-auth-header">
                <Brand />
                <p>{headerPrompt} <Link href={headerLinkHref}>{headerLinkLabel}</Link></p>
            </header>
            <main className="pm-auth-main">
                {children}
                <p className="pm-auth-bottom">Learn together. Practise daily. Grow your career.</p>
            </main>
        </div>
    );
}
