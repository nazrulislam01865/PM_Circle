import { Link } from '@inertiajs/react';
import { ArrowRight, ClipboardList, MessageCircle } from 'lucide-react';
import type { DashboardData } from '@/types/dashboard';

export function DashboardPracticeCard({ dashboard }: { dashboard: DashboardData }) {
    const premium = dashboard.plan === 'premium';
    const scenarioUrl = dashboard.scenario ? `/scenarios/${dashboard.scenario.slug}` : '/community';
    return <section className={`pm-dash-card pm-dash-practice ${premium ? 'is-simulation' : ''}`} aria-label="Today's practice">
        <div className="pm-dash-practice-content"><div className="pm-dash-practice-title"><span className="pm-dash-practice-icon"><ClipboardList size={33}/></span>
            <div className="pm-dash-practice-text"><div className="pm-dash-practice-heading">{premium ? 'Continue your simulation' : "Today's practice"}</div>
                <h2>{premium ? 'ERP rollout: Stakeholder resistance' : (dashboard.scenario?.title.replace(/ What would you do\?$/, '') ?? 'A late change. A fixed deadline.')}</h2>
                <p>{premium ? 'Navigate stakeholder concerns, align communication, and choose the best strategy to keep the project on track.' : 'A real-world scenario to practise stakeholder communication, scope and risk management.'}</p>
            </div><span className="pm-dash-mini-tag">{dashboard.plan === 'free' ? 'Free sample' : premium ? 'Included with Premium' : 'Included with Pro'}</span>
        </div>
        {premium && <div className="pm-dash-practice-progress"><strong>4 of 7 decisions complete</strong><span><i /></span></div>}
        <div className="pm-dash-practice-actions"><Link href={premium ? '/dashboard/features/simulations' : scenarioUrl} className="pm-dash-btn pm-dash-btn-primary">{premium ? 'Resume simulation' : dashboard.plan === 'free' ? 'Try free scenario' : 'Start scenario'} <ArrowRight size={22}/></Link>
            <Link href={scenarioUrl} className="pm-dash-btn pm-dash-btn-white">{premium ? <ClipboardList size={22}/> : <MessageCircle size={22}/>} {premium ? "Today's scenario" : 'Join discussion'}</Link></div>
        </div>
        <img className="pm-dash-practice-image" src={premium ? '/images/dashboard/simulation-laptop.webp' : '/images/dashboard/practice-notebook.webp'} alt={premium ? 'Laptop showing an ERP simulation checklist' : 'Notebook showing the scope, time, cost and quality trade-offs'} loading="lazy"/>
    </section>;
}
