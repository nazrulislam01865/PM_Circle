import { Link } from '@inertiajs/react';
import { ArrowRight, Bot, BriefcaseBusiness, ChartNoAxesColumnIncreasing, Crown, Eye, FileText, GraduationCap, Lightbulb, UserRound, VenetianMask } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';
import type { DashboardData } from '@/types/dashboard';

export function DashboardInsightsPanel({ dashboard }: { dashboard: DashboardData }) {
    const views = dashboard.isDemo ? 32 : 0;
    const thisWeek = dashboard.isDemo ? 8 : 0;
    if (dashboard.plan === 'free') return <section className="pm-dash-card pm-dash-upgrade-panel"><h2><Crown size={22} color="#f4b032" fill="#f4b032"/> Explore Pro</h2><p>Unlock your full learning experience</p>
        <ul><li><ChartNoAxesColumnIncreasing/> AI feedback on your answers</li><li><VenetianMask/> Ask anonymous questions</li><li><Lightbulb/> Deeper insights and analytics</li><li><GraduationCap/> More simulators and practice content</li></ul>
        <Link href="/pricing" className="pm-dash-btn pm-dash-btn-outline pm-dash-full">View plans <ArrowRight size={21}/></Link>
    </section>;
    if (dashboard.plan === 'premium') return <><section className="pm-dash-card pm-dash-insights-panel"><h2><ChartNoAxesColumnIncreasing size={23}/> Career & profile insights</h2>
        <div className="pm-dash-profile-views"><ChartNoAxesColumnIncreasing size={30}/><div><strong>{views} <span>profile views</span></strong><small>Last 30 days</small></div><Link href="/dashboard/features/insights" className="pm-dash-btn pm-dash-btn-outline">View insights <ArrowRight size={18}/></Link></div>
        {dashboard.isDemo ? <>
        <div className="pm-dash-viewer"><Avatar name="Nadia Rahman" size={42}/><span><strong>Nadia Rahman</strong><small>Recruiter</small></span><small>2h ago</small></div>
        <div className="pm-dash-viewer"><span className="pm-dash-anonymous-avatar"><UserRound size={29}/></span><span><strong>Anonymous viewer</strong><small>Private mode</small></span><small>Yesterday</small></div>
        <p className="pm-dash-disclaimer">Names shown when viewer privacy permits.</p>
        <div className="pm-dash-resume-line"><Eye size={23}/><span>Resume visibility<small>Visible to permitted recruiters</small></span><button disabled title="Resume access controls are not available yet" type="button" className="pm-dash-toggle is-on" aria-label="Resume visibility preview; not yet configurable"><span/></button></div>
        </> : <p className="pm-dash-disclaimer">Viewer identities and resume permissions will appear when these features are enabled.</p>}
        <div className="pm-dash-insights-actions"><Link href="/dashboard/features/resume" className="pm-dash-btn pm-dash-btn-outline"><FileText size={19}/> Edit resume</Link><Link href="/dashboard/features/interview" className="pm-dash-text-btn"><UserRound size={20}/> Interview practice</Link></div>
    </section><section className="pm-dash-card pm-dash-ai-mini"><Bot size={28}/><div><strong>AI feedback on your answers</strong><div className="pm-dash-ai-progress"><span>{dashboard.isDemo ? '18 / 50 used' : 'Not available yet'}</span><i><b style={{width: dashboard.isDemo ? '12%' : '0%'}}/></i></div></div></section></>;
    return <section className="pm-dash-card pm-dash-insights-panel pm-dash-pro-insights"><h2><ChartNoAxesColumnIncreasing size={23}/> Profile insights</h2>
        <div className="pm-dash-pro-views"><ChartNoAxesColumnIncreasing size={28}/><div><strong>{views} <span>profile views</span></strong><small>Last 30 days</small></div><div><strong>{thisWeek}</strong><small>This week</small></div></div>
        <Link href="/dashboard/features/insights" className="pm-dash-btn pm-dash-btn-outline pm-dash-full">View insights <ArrowRight size={20}/></Link>
        <div className="pm-dash-pro-ai"><Bot size={29}/><div><strong>AI feedback on your answers</strong><div className="pm-dash-ai-progress"><span>{dashboard.isDemo ? '18 / 150 used' : 'Not available yet'}</span><i><b style={{width: dashboard.isDemo ? '12%' : '0%'}}/></i></div></div></div>
        <Link href="/dashboard/features/career" className="pm-dash-premium-career"><BriefcaseBusiness size={24}/> Explore Premium career tools <ArrowRight size={20}/></Link>
    </section>;
}
