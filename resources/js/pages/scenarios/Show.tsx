import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { BookOpen, ChartNoAxesColumnIncreasing, ChevronRight, Clock3, LockKeyhole, MessageCircle, Share2, Target, Users } from 'lucide-react';
import { useState } from 'react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { Avatar } from '@/components/pm/Avatar';

type Scenario = { id: number; slug: string; title: string; summary: string; situation: string; known_facts: string[]; topics: string[]; difficulty: string; focus: string; minutes: number; published_at: string; ai_generated: boolean };
type Response = { id: number; body: string; created_at: string; user: { name: string } };
type Props = { scenario: Scenario; responses: { data: Response[]; next_page_url: string | null }; related: { id: number; slug: string; title: string }[] };
export default function Show({ scenario, responses, related }: Props) {
    const { auth, emailVerificationRequired } = usePage<{ emailVerificationRequired: boolean; auth: { user: { email_verified_at: string | null; onboarding_step: number } | null } }>().props;
    const canRespond = Boolean(auth?.user && (!emailVerificationRequired || auth.user.email_verified_at) && auth.user.onboarding_step >= 3);
    const form = useForm({ body: '' });
    const [copied, setCopied] = useState(false);
    return <PublicLayout active="/community"><Head title={scenario.title}/><div className="pm-container pm-page"><div className="pm-crumbs">Home &nbsp;/&nbsp; Discussions &nbsp;/&nbsp; Today's scenario</div><Link href="/community" className="pm-back">← All discussions</Link>
        <div className="pm-two-column"><div className="pm-stack"><article className="pm-panel pm-content-panel"><span className="pm-upper-label">Today's scenario</span><span className="pm-open-label">Open for discussion</span><h1>{scenario.title}</h1>
            <div className="pm-meta">PM Circle Editorial &nbsp;·&nbsp; {new Date(scenario.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} &nbsp;·&nbsp; 4 min read</div>
            {scenario.ai_generated && <span className="pm-ai-disclosure">AI-generated scenario · reviewed before publication</span>}
            <div className="pm-tags">{scenario.topics.map(t => <span key={t}>{t}</span>)}</div><h2>The situation</h2>
            {scenario.situation.split('\n\n').map((p,i) => <p key={i}>{p}</p>)}<h2>What you know</h2><ul className="pm-bullet-list">{scenario.known_facts.map(f => <li key={f}>{f}</li>)}</ul>
            <div className="pm-question-box"><MessageCircle size={25}/><div><strong>Your decision</strong><p>What would you do first, who would you involve, and how would you explain the trade-off?</p><small>Several approaches may be reasonable. Explain your assumptions.</small></div></div>
            <div className="pm-action-row"><button onClick={() => { void navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true)); }}><Share2 size={16}/>{copied ? 'Link copied' : 'Share'}</button><Link className="pm-text-link" href="/register">Join the circle</Link></div>
        </article><section className="pm-panel pm-content-panel pm-response-form"><h3>What would you do?</h3><form onSubmit={e => { e.preventDefault(); form.post(`/scenarios/${scenario.id}/responses`, { onSuccess: () => form.reset() }); }}>
            <textarea value={form.data.body} onChange={e => form.setData('body', e.target.value)} minLength={30} maxLength={10000} placeholder="Share your approach and explain why..." aria-label="Your scenario response" disabled={!canRespond} required/>
            {form.errors.body && <p className="pm-error" role="alert">{form.errors.body}</p>}
            <small>{canRespond ? 'Educational discussion. AI scoring is not enabled for this beta.' : <><LockKeyhole size={12} className="inline"/> Sign in to submit your response and access eligible feedback.</>}</small>
            {canRespond ? <button className="pm-button pm-button-sm" disabled={form.processing}>Submit response</button> : <><Link className="pm-button pm-button-sm" href="/login">Log in to respond</Link> <Link className="pm-text-link ml-3" href="/register">New here? Join free</Link></>}
        </form></section>
        <div><h2 className="pm-comments-heading">Community responses</h2><p className="pm-meta">{responses.data.length} visible responses</p>
            {responses.data.length ? responses.data.map(r => <article key={r.id} className="pm-comment pm-panel"><div className="pm-post-author"><Avatar name={r.user.name} size={39}/><div><strong>{r.user.name}</strong><p>{new Date(r.created_at).toLocaleDateString()}</p></div></div><p>{r.body}</p></article>) : <section className="pm-panel pm-empty">No responses yet. Be the first to share a reasoned approach.</section>}
            {responses.next_page_url && <div className="pm-pager"><Link href={responses.next_page_url}>Load more responses</Link></div>}</div></div>
        <aside className="pm-stack"><section className="pm-panel pm-sidebar-detail"><h3>About this scenario</h3><div className="pm-info-row"><ChartNoAxesColumnIncreasing size={18}/>Difficulty <strong>{scenario.difficulty}</strong></div><div className="pm-info-row"><Target size={18}/>Focus <strong>{scenario.focus}</strong></div><div className="pm-info-row"><Clock3 size={18}/>Practice time <strong>{scenario.minutes} minutes</strong></div></section>
            <section className="pm-panel pm-sidebar-detail"><BookOpen size={26} color="var(--pm-primary)"/><h3>How AI feedback works</h3><p>When available, structured educational feedback considers reasoning, trade-offs, stakeholder involvement and practical next steps.</p><small>AI feedback can be imperfect. Use your judgment.</small></section>
            <section className="pm-panel pm-sidebar-detail pm-blue-aside"><Users size={28}/><h3>Your perspective belongs here.</h3><p>Respond, learn from feedback and track your progress.</p><Link className="pm-button pm-block" href="/register">Join the community — free</Link><small>Member photos and full profiles are visible after sign-in.</small></section>
            {related.length > 0 && <section className="pm-panel pm-sidebar-detail"><h3>Explore another situation</h3>{related.map(item => <Link key={item.id} className="pm-skill" href={`/scenarios/${item.slug}`}>{item.title}<ChevronRight size={17}/></Link>)}</section>}
        </aside></div></div></PublicLayout>;
}
