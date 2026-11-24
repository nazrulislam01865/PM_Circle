import { HomePhoto } from './HomePhoto';
import { HomeAction } from './HomeUi';

/** Public homepage promotion for the existing Trends listing. */
export function HomeTrends() {
    return <section className="pm-v2-container pm-v2-trends-banner" aria-labelledby="pm-v2-trends-title">
        <HomePhoto photo="leader" alt="" className="pm-v2-trends-photo"/>
        <div className="pm-v2-trends-copy">
            <h2 id="pm-v2-trends-title">Trends</h2>
            <p>Weekly updates on project management, business analysis, technology, AI and more.</p>
        </div>
        <HomeAction href="/pm-trends">Explore Trends</HomeAction>
    </section>;
}
