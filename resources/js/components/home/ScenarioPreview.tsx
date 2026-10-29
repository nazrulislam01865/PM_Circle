import { Link } from '@inertiajs/react';
import { Heart, MessageCircle, Reply, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/pm/Avatar';

export type ScenarioSummary = { slug: string; title: string; summary: string; topics: string[] };
type ScenarioResponse = { id: number; body: string; created_at: string; user: { name: string } };
export function ScenarioPreview({ scenario, responses, demo }: { scenario: ScenarioSummary | null; responses: ScenarioResponse[]; demo: boolean }) {
    const [copied, setCopied] = useState(false);
    return <section className="pm-panel pm-scenario-teaser">
        <div className="pm-scenario-eyebrow"><span className="pm-upper-label">Today's scenario</span><span className="pm-open-status">● Open for discussion</span></div>
        <h3>{scenario?.title ?? 'Sharpen your project management judgment.'}</h3>
        <p>{scenario?.summary ?? 'Practical scenarios are being prepared for the community.'}</p>
        <div className="pm-tags">{(scenario?.topics ?? []).map(topic => <span key={topic}>{topic}</span>)}</div>
        <div className="pm-scenario-cta">{scenario && <Link href={`/scenarios/${scenario.slug}`} className="pm-button">Read scenario &amp; join discussion</Link>}<small>Read freely. Sign in to respond.</small></div>
        {scenario && <div className="pm-scenario-social"><span><Heart size={17}/> {demo ? 42 : '—'}</span><button type="button" onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}/scenarios/${scenario.slug}`).then(() => setCopied(true)); }}><Share2 size={16}/> {copied ? 'Copied' : 'Share'}</button><Link href={`/scenarios/${scenario.slug}`}><MessageCircle size={17}/> {demo ? 128 : responses.length} responses</Link></div>}
        {responses.map((response, index) => <article className="pm-teaser-response" key={response.id}>
            <Avatar name={response.user.name} size={37}/><div className="pm-teaser-response-main"><div className="pm-post-author-meta"><strong>{response.user.name}</strong><small>{response.user.name === 'Priya Nair' ? 'Senior Project Manager' : 'Agile Coach'} · 2 days ago</small></div><p>{response.body}</p><div className="pm-teaser-reaction"><Link href={scenario ? `/scenarios/${scenario.slug}` : '/community'}><Heart size={14}/> {demo ? (index === 0 ? 18 : 12) : 'Respond'}</Link><Link href={scenario ? `/scenarios/${scenario.slug}` : '/community'}><Reply size={14}/> Reply</Link></div></div>
            {demo && <div className="pm-sample-score"><small>Sample AI reasoning score</small><strong>8/10</strong><Link href={scenario ? `/scenarios/${scenario.slug}` : '/community'}>Read assessment⌄</Link></div>}
        </article>)}
    </section>;
}
