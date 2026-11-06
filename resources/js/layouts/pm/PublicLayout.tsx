import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Brand } from '@/components/pm/Brand';
import { SiteHeader } from '@/components/pm/SiteHeader';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardShellData } from '@/types/dashboard';

type AuthProps = { auth: { user: { name: string; onboarding_step: number } | null }; memberShell: DashboardShellData | null };
export function PublicLayout({ children, active, joinLabel = 'Join the community', pricingPrototype = false }: { children: ReactNode; active?: string; joinLabel?: string; pricingPrototype?: boolean }) {
    const { auth, memberShell } = usePage<AuthProps>().props;
    // Signed-in members retain their existing sidebar, permissions and dashboard actions.
    if (auth?.user && memberShell && auth.user.onboarding_step >= 3) {
        return <MemberDashboardLayout dashboard={memberShell}><div className="pm-member-public-content">{children}</div></MemberDashboardLayout>;
    }
    return <div className={pricingPrototype ? 'pm-app pm-pricing-shell' : 'pm-app'}>
        <SiteHeader active={active} joinLabel={joinLabel}/>
        <main>{children}</main>
        <footer className="pm-footer"><div className="pm-container pm-footer-inner"><Brand small={!pricingPrototype} monogram={pricingPrototype} /><nav aria-label="Footer"><Link href="/about">About</Link>{!pricingPrototype && <Link href="/community">Community guidelines</Link>}<Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link>{pricingPrototype && <Link href="/about">Contact</Link>}</nav>{!pricingPrototype && <p>Building better project professionals together.</p>}</div></footer>
    </div>;
}
