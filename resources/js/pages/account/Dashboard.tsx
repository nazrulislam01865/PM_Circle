import { Head } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { Crown } from 'lucide-react';
import { DashboardComposer } from '@/components/dashboard/DashboardComposer';
import { DashboardFeed } from '@/components/dashboard/DashboardFeed';
import { DashboardInsightsPanel } from '@/components/dashboard/DashboardInsightsPanel';
import { DashboardLearningPanel } from '@/components/dashboard/DashboardLearningPanel';
import { DashboardPracticeCard } from '@/components/dashboard/DashboardPracticeCard';
import { DashboardProfilePanel } from '@/components/dashboard/DashboardProfilePanel';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardData } from '@/types/dashboard';

export default function Dashboard({ dashboard }: { dashboard: DashboardData }) {
    const firstName = dashboard.member.name.split(' ')[0];
    const badge = dashboard.plan === 'free' ? 'Free member' : dashboard.plan === 'premium' ? 'Premium member' : 'Pro member';
    const overviewRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const overview = overviewRef.current;
        if (!overview) return;

        const header = document.querySelector<HTMLElement>('.pm-site-header');
        const cards = Array.from(overview.children).filter((node): node is HTMLElement => node instanceof HTMLElement);
        let previousScrollY = window.scrollY;
        let stickyTop = 0;
        let upperBound = 0;
        let lowerBound = 0;
        let overflowing = false;
        let frame: number | null = null;

        const updateStickyLayout = () => {
            const headerHeight = header?.getBoundingClientRect().height ?? 67;
            const gap = parseFloat(getComputedStyle(overview).rowGap) || 0;
            const contentHeight = cards.reduce((height, card) => height + card.getBoundingClientRect().height, 0)
                + Math.max(0, cards.length - 1) * gap;
            const onDesktop = window.innerWidth > 830;
            const wasOverflowing = overflowing;
            upperBound = Math.ceil(headerHeight + 16);
            lowerBound = Math.min(upperBound, Math.floor(window.innerHeight - contentHeight - 16));
            overflowing = onDesktop && contentHeight > window.innerHeight - upperBound - 16;

            // Stick the whole overview, not just the profile. On shorter screens,
            // the group follows the main page scroll until its lower cards are
            // reachable, then holds position. There is no nested scroll container.
            if (!onDesktop || !overflowing || !wasOverflowing) stickyTop = upperBound;
            else stickyTop = Math.max(lowerBound, Math.min(upperBound, stickyTop));
            overview.style.setProperty('--pm-dash-right-sticky-top', `${stickyTop}px`);
            previousScrollY = window.scrollY;
        };

        const onScroll = () => {
            const scrollY = window.scrollY;
            const movement = scrollY - previousScrollY;
            previousScrollY = scrollY;
            if (!overflowing || movement === 0) return;

            const nextTop = Math.max(lowerBound, Math.min(upperBound, stickyTop - movement));
            if (nextTop === stickyTop) return;
            stickyTop = nextTop;
            if (frame !== null) return;
            frame = window.requestAnimationFrame(() => {
                overview.style.setProperty('--pm-dash-right-sticky-top', `${stickyTop}px`);
                frame = null;
            });
        };

        const observer = new ResizeObserver(updateStickyLayout);
        cards.forEach(card => observer.observe(card));
        if (header) observer.observe(header);
        window.addEventListener('resize', updateStickyLayout);
        window.addEventListener('scroll', onScroll, { passive: true });
        updateStickyLayout();

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateStickyLayout);
            window.removeEventListener('scroll', onScroll);
            if (frame !== null) window.cancelAnimationFrame(frame);
        };
    }, []);

    return <MemberDashboardLayout dashboard={dashboard}><Head title="Dashboard" />
        <div className="pm-dash-columns"><div className="pm-dash-center">
            <div className="pm-dash-welcome"><h1>Good morning, {firstName}. <span className={`pm-dash-member-badge ${dashboard.plan === 'free' ? 'is-free' : ''}`}>{dashboard.plan !== 'free' && <Crown size={17} fill="currentColor"/>}{badge}</span></h1>
                <p>Keep learning, stay curious, and grow your project management skills.</p>
            </div>
            <DashboardComposer name={dashboard.member.name} plan={dashboard.isPreview ? 'free' : dashboard.plan} demo={dashboard.isDemo} />
            <DashboardPracticeCard dashboard={dashboard} />
            <DashboardFeed dashboard={dashboard} />
        </div><aside ref={overviewRef} className="pm-dash-right" aria-label="Member overview">
            <DashboardProfilePanel dashboard={dashboard}/>
            <DashboardLearningPanel dashboard={dashboard}/>
            <DashboardInsightsPanel dashboard={dashboard}/>
        </aside></div>
    </MemberDashboardLayout>;
}
