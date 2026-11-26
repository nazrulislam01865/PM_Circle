import { HomePhoto } from './HomePhoto';
import { HomeAction } from './HomeUi';
import type { HomepagePresentation } from '@/types/homepage-presentation';

/** Public homepage promotion for the existing Trends listing. */
export function HomeTrends({content}: {content: HomepagePresentation['trends']}) {
    return <section className="pm-v2-container pm-v2-trends-banner" aria-labelledby="pm-v2-trends-title">
        <HomePhoto photo={content.photo} source={content.image} alt="" className="pm-v2-trends-photo"/>
        <div className="pm-v2-trends-copy">
            <h2 id="pm-v2-trends-title">{content.heading}</h2>
            <p>{content.description}</p>
        </div>
        <HomeAction href={content.button_url}>{content.button_label}</HomeAction>
    </section>;
}
