import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Shared horizontal section navigation; each editor owns its section IDs and data. */
export function ProfileSectionJump<T extends string>({ sections, targetPrefix, label, completion }: {
    sections: readonly { id: T; label: string }[];
    targetPrefix: string;
    label: string;
    completion?: number;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const panel = panelRef.current;
        const workspace = panel?.closest<HTMLElement>('.pm-profile-page');
        if (!panel || !workspace) return;
        const measure = () => {
            workspace.style.setProperty('--pm-profile-section-nav-height', `${panel.getBoundingClientRect().height}px`);
        };
        measure();
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        observer?.observe(panel);
        window.addEventListener('resize', measure);
        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', measure);
            workspace.style.removeProperty('--pm-profile-section-nav-height');
        };
    }, []);
    const [active, setActive] = useState<T | undefined>(sections[0]?.id);
    useEffect(() => {
        let frame: number | null = null;
        const updateActiveSection = () => {
            frame = null;
            let visible: T | undefined = sections[0]?.id;
            for (const item of sections) {
                const section = document.getElementById(`${targetPrefix}${item.id}`);
                if (!section) continue;
                const offset = Number.parseFloat(window.getComputedStyle(section).scrollMarginTop) || 0;
                if (section.getBoundingClientRect().top <= offset + 8) visible = item.id;
                else break;
            }
            if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 3) {
                visible = sections.at(-1)?.id;
            }
            setActive(current => current === visible ? current : visible);
        };
        const scheduleUpdate = () => {
            if (frame === null) frame = window.requestAnimationFrame(updateActiveSection);
        };
        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('resize', scheduleUpdate);
        scheduleUpdate();
        return () => {
            window.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('resize', scheduleUpdate);
            if (frame !== null) window.cancelAnimationFrame(frame);
        };
    }, [sections, targetPrefix]);
    useEffect(() => {
        const nav = panelRef.current?.querySelector<HTMLElement>('nav');
        const button = nav?.querySelector<HTMLElement>('[aria-current="location"]');
        if (!nav || !button || nav.scrollWidth <= nav.clientWidth) return;
        const bounds = nav.getBoundingClientRect();
        const item = button.getBoundingClientRect();
        if (item.left < bounds.left) nav.scrollLeft -= bounds.left - item.left;
        else if (item.right > bounds.right) nav.scrollLeft += item.right - bounds.right;
    }, [active]);
    const jump = (id: T) => {
        setActive(id);
        document.getElementById(`${targetPrefix}${id}`)?.scrollIntoView({
            block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
    };
    const score = Math.max(0, Math.min(100, completion ?? 0));
    return <div ref={panelRef} className="pm-profile-section-jump pm-member-tertiary-sticky">
        <nav className="pm-profile-section-jump-nav" aria-label={label}>
            {sections.map(item => <button key={item.id} type="button" className="pm-profile-section-jump-button"
                aria-current={active === item.id ? 'location' : undefined} onClick={() => jump(item.id)}>{item.label}</button>)}
        </nav>
        {completion !== undefined && <div className="pm-compact-progress">
            <span>Profile completion</span><progress aria-label="Profile completion" max={100} value={score}/><strong>{score}%</strong>
        </div>}
    </div>;
}
