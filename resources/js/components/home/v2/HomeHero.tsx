import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import type { HomeContent } from '@/types/home';
import { HomePhoto } from './HomePhoto';
import { HomeAction } from './HomeUi';
import { referenceText } from './reference';
import { useRewardOfferDialog } from '@/components/rewards/RewardOfferDialog';

const slides = [
    { tab: 'Exam Simulator', eyebrow: 'PMP & CSM Exam Simulator', title: 'Build your project management career.',
        description: 'Start with a practice exam. Work through realistic questions, review explanations, and see which topics need more attention.',
        primary: 'Try exam practice', primaryHref: '/exam-simulator/pmp', secondary: 'Explore learning', secondaryHref: '/learning', photo: 'exam' },
    { tab: 'Learning', eyebrow: 'Learn & Practice', title: 'Learn at your level.',
        description: 'Start with the fundamentals or build the skills you need for your next project management role.',
        primary: 'Explore courses', primaryHref: '/learning', secondary: 'Find my starting point', secondaryHref: '/learning', photo: 'scrum' },
    { tab: 'Community', eyebrow: 'Daily Challenge & Community', title: 'Work through real project decisions.',
        description: 'Read today’s scenario and compare how other project professionals would handle it.',
        primary: 'Read today’s challenge', primaryHref: '/daily-challenge', secondary: 'Explore community', secondaryHref: '/community', photo: 'hero-community' },
] as const;

export function HomeOfferBar({ discountLabel }: { discountLabel?: string }) {
    const [visible, setVisible] = useState(true);
    const openOffer = useRewardOfferDialog();
    if (!visible || !discountLabel) return null;
    return <div className="pm-v2-offer-bar"><strong>Exam Simulator offer</strong><span>· Complete your profile to get {discountLabel} off</span>
        <span><button type="button" className="pm-v2-offer-link" onClick={() => openOffer?.()}>View offer</button></span>
        <button type="button" aria-label="Dismiss promotional offer" onClick={() => setVisible(false)}><X aria-hidden="true"/></button></div>;
}

export function HomeHero({ hero, eventsVisible = true }: { hero?: HomeContent['hero']; eventsVisible?: boolean }) {
    const [index, setIndex] = useState(0);
    const slide = slides[index];
    const move = (step: number) => setIndex(current => (current + step + slides.length) % slides.length);
    return <>
        <section className="pm-v2-hero" data-home-slide={index === 0 ? 'exam' : index === 1 ? 'learning' : 'community'} aria-label="Welcome to PM Circle">
            <HomePhoto key={slide.photo} photo={slide.photo} alt="" className="pm-v2-hero-image" eager/>
            <div className="pm-v2-hero-overlay"/>
            <div className="pm-v2-container pm-v2-hero-inner"><div className="pm-v2-hero-copy">
                <p className="pm-v2-kicker">{index === 0 ? referenceText(hero?.eyebrow, 'The 360° community for project managers', slide.eyebrow) : slide.eyebrow}</p>
                <h1>{index === 0 ? referenceText(hero?.title, 'Your next chapter in project management starts here.', slide.title) : slide.title}</h1>
                <p>{index === 0 ? referenceText(hero?.description, 'Learn by doing. Share what works. Meet your people. Build your career.', slide.description) : slide.description}</p>
                <div className="pm-v2-hero-actions"><HomeAction primary href={index === 0 && hero?.primary_url && hero.primary_url !== '/register' ? hero.primary_url : slide.primaryHref}>
                    {index === 0 ? referenceText(hero?.primary_label, 'Join the community — free', slide.primary) : slide.primary}</HomeAction>
                    <HomeAction href={index === 0 && hero?.secondary_url && hero.secondary_url !== '/community' ? hero.secondary_url : slide.secondaryHref}>
                        {index === 0 ? referenceText(hero?.secondary_label, "Explore today's discussion", slide.secondary) : slide.secondary}</HomeAction></div>
            </div></div>
        </section>
        <div className="pm-v2-hero-tabs"><div className="pm-v2-hero-tabs-inner">
            <button type="button" aria-label="Previous homepage slide" onClick={() => move(-1)}><ChevronLeft aria-hidden="true"/></button>
            {slides.map((item, i) => <button type="button" key={item.tab} className={index === i ? 'is-active' : ''}
                aria-current={index === i ? 'true' : undefined} onClick={() => setIndex(i)}>{item.tab}</button>)}
            <button type="button" aria-label="Next homepage slide" onClick={() => move(1)}><ChevronRight aria-hidden="true"/></button>
        </div></div>
        <nav className="pm-v2-quick-links" aria-label="Homepage quick links"><div className="pm-v2-container">
            <Link href="/learning">Courses by experience level</Link><Link href="/exam-simulator/pmp">Certification practice</Link>
            <Link href="/community">Peer discussions</Link>{eventsVisible && <Link href="/events">Community events</Link>}
        </div></nav>
    </>;
}
