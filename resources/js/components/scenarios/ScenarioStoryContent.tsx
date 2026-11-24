import type { ReactNode } from 'react';
import { MessageCircle } from 'lucide-react';

type ScenarioStory = {
    title: string;
    situation: string;
    known_facts: string[];
    topics: string[];
    published_at: string;
    expires_at?: string | null;
    daily_slot?: string | null;
    status: 'published' | 'closed';
    ai_generated: boolean;
};

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka',
});

/** Shared, presentation-only scenario article. No fetching or interaction state. */
export function ScenarioStoryContent({ scenario, actions }: { scenario: ScenarioStory; actions?: ReactNode }) {
    const isToday = scenario.daily_slot === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const isClosed = scenario.status === 'closed' || Boolean(scenario.expires_at && new Date(scenario.expires_at).getTime() <= Date.now());

    return <>
        <div className="pm-scenario-story-heading"><p className="pm-scenario-detail-kicker">{isToday ? "TODAY'S SCENARIO" : 'DAILY CHALLENGE'}</p>{actions}</div>
        <h1 className="pm-scenario-detail-title">{scenario.title}</h1>
        <div className="pm-scenario-detail-meta">
            <span>PM Circle Editorial</span>
            <span aria-hidden="true">·</span>
            <time dateTime={scenario.published_at}>{formatDate(scenario.published_at)}</time>
            <span aria-hidden="true">·</span>
            <span>4 min read</span>
            {scenario.expires_at && <>
                <span aria-hidden="true">·</span>
                <span>{isClosed ? 'Discussion closed on' : 'Discussion closes on'} <time dateTime={scenario.expires_at}>{formatDate(scenario.expires_at)}</time></span>
            </>}
            {!scenario.expires_at && isClosed && <><span aria-hidden="true">·</span><span>Discussion closed</span></>}
            {scenario.ai_generated && <><span aria-hidden="true">·</span><span>AI-generated educational scenario</span></>}
        </div>

        {scenario.topics?.length > 0 && <p className="pm-scenario-detail-topics">{scenario.topics.join(' · ')}</p>}

        <section className="pm-scenario-detail-section" aria-labelledby="scenario-situation-heading">
            <h2 id="scenario-situation-heading">The situation</h2>
            {scenario.situation.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
            ))}
        </section>

        <section className="pm-scenario-detail-section pm-scenario-detail-facts" aria-labelledby="scenario-facts-heading">
            <h2 id="scenario-facts-heading">What you know</h2>
            <ul>{scenario.known_facts.map((fact, index) => <li key={index}>{fact}</li>)}</ul>
        </section>

        <section className="pm-scenario-detail-decision" aria-labelledby="scenario-decision-heading">
            <h2 id="scenario-decision-heading"><MessageCircle size={22} aria-hidden="true" />Your decision</h2>
            <p>What would you do first, who would you involve, and how would you explain the trade-off?</p>
            <p className="pm-scenario-detail-decision-note">Several approaches may be reasonable. Explain your assumptions.</p>
        </section>
    </>;
}
