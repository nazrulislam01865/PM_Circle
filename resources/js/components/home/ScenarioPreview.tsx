import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';
import { homeRelativeDate } from '@/lib/home-date';
import { EngagementActionBar } from '@/components/community/EngagementActionBar';
import { HomeCommentAction, HomeShareAction, ReactionPicker, type ReactionType, type RequestToJoin } from './HomeEngagement';
import type { HomeContent } from '@/types/home';

export type ScenarioSummary = {
    id: number; slug: string; title: string; summary: string; topics: string[];
    reactions_count?: number; viewer_reaction?: ReactionType | null;
};
export type ScenarioResponsePreview = {
    id: number; body: string; created_at: string;
    reactions_count?: number; viewer_reaction?: ReactionType | null;
    user: { name: string; profile?: { role?: string | null; avatar_path?: string | null } | null };
};

export function ScenarioPreview({ scenario, responses, content, canInteract, onJoin }: {
    scenario: ScenarioSummary | null;
    responses: ScenarioResponsePreview[];
    content?: HomeContent['scenario'];
    canInteract: boolean; onJoin: RequestToJoin;
}) {
    const url = scenario ? `/scenarios/${encodeURIComponent(scenario.slug)}` : '/daily-challenge';
    const readUrl = content?.read_url || url;
    const discussionUrl = content?.discussion_url || url;

    return <section className="pm-panel pm-home-scenario-card" aria-label={content?.heading ?? "Today's scenario"}>
        <div className="pm-home-scenario-highlight">
            <div className="pm-home-scenario-topline">
                <span className="pm-home-scenario-eyebrow">{content?.heading ?? "Today's scenario"}</span>
                <Link href={content?.view_all_url || '/daily-challenge'} className="pm-home-scenario-view-all">
                    {content?.view_all_label ?? 'View all'} <ArrowRight size={16} aria-hidden="true"/>
                </Link>
            </div>
            {scenario ? <>
                <h2>{scenario.title}</h2>
                {content?.status_label && <p className="pm-home-scenario-meta">{content.status_label}</p>}
                <p className="pm-home-scenario-summary">{scenario.summary}</p>
                <div className="pm-home-scenario-cta">
                    <Link href={readUrl} className="pm-button pm-button-sm">{content?.read_button_label ?? content?.button_label ?? 'Read full scenario'} <ArrowRight size={18} aria-hidden="true"/></Link>
                </div>
            </> : <p className="pm-empty">{content?.empty_message ?? 'Practical scenarios are being prepared for the community.'}</p>}
        </div>
        {scenario && <>
            <div className="pm-home-scenario-social">
                <EngagementActionBar>
                    <ReactionPicker endpoint={`/scenarios/${scenario.id}/reactions`} initial={scenario.viewer_reaction} total={scenario.reactions_count} canInteract={canInteract} onJoin={onJoin} label="scenario"/>
                    <HomeCommentAction label={responses.length === 1 ? 'response' : 'responses'} count={responses.length} href={url} canInteract={canInteract} onJoin={onJoin}/>
                    <HomeShareAction href={url} canInteract={canInteract} onJoin={onJoin}/>
                </EngagementActionBar>
            </div>
            <div className="pm-home-scenario-responses" aria-label={content?.responses_heading ?? 'Community responses'}>
                {responses.length === 0 && <p className="pm-empty">{content?.empty_responses_message ?? 'Be the first to share your approach.'}</p>}
                {responses.map(response => <article className="pm-home-response" key={response.id}>
                    <Avatar name={response.user.name} src={response.user.profile?.avatar_path} size={34}/>
                    <div className="pm-home-response-main">
                        <div className="pm-home-response-author"><strong>{response.user.name}</strong>
                            <small>{response.user.profile?.role || 'Community member'} · {homeRelativeDate(response.created_at)}</small></div>
                        <p>{response.body}</p>
                        <div className="pm-home-response-actions">
                            <EngagementActionBar>
                                <ReactionPicker endpoint={`/scenarios/${scenario.id}/responses/${response.id}/reactions`} initial={response.viewer_reaction} total={response.reactions_count} canInteract={canInteract} onJoin={onJoin} label="response"/>
                                <HomeCommentAction label="Reply" href={url} canInteract={canInteract} onJoin={onJoin}/>
                            </EngagementActionBar>
                        </div>
                    </div>
                </article>)}
                {responses.length > 0 && <Link href={url} className="pm-home-scenario-read-comments">Read all comments <ArrowRight size={16} aria-hidden="true"/></Link>}
            </div>
        </>}
    </section>;
}
