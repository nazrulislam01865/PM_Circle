import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import type { HomepagePresentation } from '@/types/homepage-presentation';
import { HomePhoto } from './HomePhoto';
import { HomeAction } from './HomeUi';
import { useRewardOfferDialog } from '@/components/rewards/RewardOfferDialog';

export function HomeOfferBar({ discountLabel }: { discountLabel?: string }) {
    const [visible, setVisible] = useState(true);
    const openOffer = useRewardOfferDialog();
    if (!visible || !discountLabel) return null;
    return <div className="pm-v2-offer-bar"><span className="pm-v2-offer-copy"><strong>Exam Simulator offer</strong> · Complete your profile to get {discountLabel.replace(/\s+off$/i, '')} off</span>
        <span><button type="button" className="pm-v2-offer-link" onClick={() => openOffer?.()}>View offer</button></span>
        <button type="button" aria-label="Dismiss promotional offer" onClick={() => setVisible(false)}><X aria-hidden="true"/></button></div>;
}

export function HomeHero({ hero }: { hero: HomepagePresentation['hero'] }) {
    const [index, setIndex] = useState(0);
    const slides = hero.slides;
    const activeIndex = Math.min(index, slides.length - 1);
    const slide = slides[activeIndex];
    const move = (step: number) => setIndex((activeIndex + step + slides.length) % slides.length);
    if (!slide) return null;
    return <>
        <section className="pm-v2-hero" data-home-slide={slide.photo === 'scrum' ? 'learning' : slide.photo === 'hero-community' ? 'community' : slide.photo} aria-label="Welcome to PM Circle">
            <HomePhoto key={slide.photo} photo={slide.photo} source={slide.image} alt="" className="pm-v2-hero-image" eager/>
            <div className="pm-v2-hero-overlay"/>
            <div className="pm-v2-container pm-v2-hero-inner"><div className="pm-v2-hero-copy">
                <p className="pm-v2-kicker">{slide.eyebrow}</p><h1>{slide.title}</h1><p>{slide.description}</p>
                <div className="pm-v2-hero-actions"><HomeAction primary href={slide.primary_url}>{slide.primary}</HomeAction>
                    <HomeAction href={slide.secondary_url}>{slide.secondary}</HomeAction></div>
            </div></div>
        </section>
        {slides.length > 1 && <div className="pm-v2-hero-tabs"><div className={`pm-v2-hero-tabs-inner${slides.length !== 3 ? ' pm-v2-hero-tabs-variable' : ''}`}>
            <button type="button" aria-label="Previous homepage slide" onClick={() => move(-1)}><ChevronLeft aria-hidden="true"/></button>
            {slides.map((item, i) => <button type="button" key={i} className={activeIndex === i ? 'is-active' : ''} aria-current={activeIndex === i ? 'true' : undefined} onClick={() => setIndex(i)}>{item.tab}</button>)}
            <button type="button" aria-label="Next homepage slide" onClick={() => move(1)}><ChevronRight aria-hidden="true"/></button>
        </div></div>}
    </>;
}

export function HomeQuickLinks({ content }: { content: HomepagePresentation['quick_links'] }) {
    return <nav className={`pm-v2-quick-links${content.items.length !== 4 ? ' pm-v2-quick-links-variable' : ''}`} aria-label="Homepage quick links"><div className="pm-v2-container">
        {content.items.map((item,i)=><Link key={i} href={item.href}>{item.label}</Link>)}
    </div></nav>;
}
