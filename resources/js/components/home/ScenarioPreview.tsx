import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';
import { homeRelativeDate } from '@/lib/home-date';
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

    return <section className="pm-panel pm-home-scenario-card" aria-label={content?.heading}>
        <div className="pm-home-scenario-highlight">
            <div className="pm-home-scenario-topline">
                <span className="pm-home-scenario-eyebrow">{content?.heading}</span>
                <div className="pm-home-scenario-top-actions">
                    {scenario && <span className="pm-home-scenario-status"><span className="pm-home-status-dot" aria-hidden="true"/>{content?.status_label}</span>}
                    <Link href="/daily-challenge" className="pm-button pm-button-outline pm-button-sm pm-home-scenario-view-all">{content?.view_all_label ?? 'View all'} <ArrowRight size={16} aria-hidden="true"/></Link>
                </div>
            </div>
            {scenario ? <>
                <h2>{scenario.title}</h2>
                <p>{scenario.summary}</p>
                <div className="pm-home-scenario-cta">
                    <Link href={url} className="pm-button">{content?.read_button_label ?? content?.button_label}<ArrowRight size={18} aria-hidden="true"/></Link>
                    <HomeCommentAction label={content?.discussion_button_label ?? 'Join discussion'} href={url} canInteract={canInteract} onJoin={onJoin}/>
                    <span className="pm-home-scenario-hint">{content?.hint}</span>
                </div>
            </> : <p className="pm-empty">{content?.empty_message ?? 'Practical scenarios are being prepared for the community.'}</p>}
        </div>
        {scenario && <>
            <div className="pm-home-scenario-social">
                <ReactionPicker endpoint={`/scenarios/${scenario.id}/reactions`} initial={scenario.viewer_reaction} total={scenario.reactions_count} canInteract={canInteract} onJoin={onJoin} label="scenario"/>
                <HomeShareAction href={url} canInteract={canInteract} onJoin={onJoin}/>
                <HomeCommentAction label={responses.length === 1 ? 'response' : 'responses'} count={responses.length} href={url} canInteract={canInteract} onJoin={onJoin}/>
            </div>
            <div className="pm-home-responses-heading">{content?.responses_heading ?? 'Community responses'}</div>
            {responses.length === 0 && <p className="pm-empty">{content?.empty_responses_message ?? 'Be the first to share your approach.'}</p>}
            {responses.map(response => <article className="pm-home-response" key={response.id}>
                <Avatar name={response.user.name} src={response.user.profile?.avatar_path} size={34}/>
                <div className="pm-home-response-main">
                    <div className="pm-home-response-author"><strong>{response.user.name}</strong>
                        <small>{response.user.profile?.role || 'Community member'} · {homeRelativeDate(response.created_at)}</small></div>
                    <p>{response.body}</p>
                    <div className="pm-home-response-actions">
                        <ReactionPicker endpoint={`/scenarios/${scenario.id}/responses/${response.id}/reactions`} initial={response.viewer_reaction} total={response.reactions_count} canInteract={canInteract} onJoin={onJoin} label="response"/>
                        <HomeCommentAction label="Reply" href={url} canInteract={canInteract} onJoin={onJoin}/>
                    </div>
                </div>
            </article>)}
        </>}
    </section>;
}
