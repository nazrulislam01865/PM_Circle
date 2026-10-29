import { Link } from '@inertiajs/react';
import { ArrowRight, ChartNoAxesColumnIncreasing, ClipboardList, Clock3 } from 'lucide-react';
import type { DashboardData } from '@/types/dashboard';

export function DashboardLearningPanel({ dashboard }: { dashboard: DashboardData }) {
    const { plan, learning } = dashboard;
    return <section className={`pm-dash-card pm-dash-learning-panel is-${plan}`}><h2>Your learning</h2>
        <div className="pm-dash-learning-stat"><Clock3 size={32}/><div><strong>{learning.time}</strong><span>Total learning time</span></div></div>
        <div className="pm-dash-learning-stat"><ClipboardList size={32}/><div><strong>{learning.scenarios} scenarios</strong><span>Completed</span></div></div>
        <div className="pm-dash-learning-stat"><ChartNoAxesColumnIncreasing size={32}/><div><strong>Level {learning.level}</strong><div className="pm-dash-stars" role="img" aria-label={`${learning.level} out of 5 stars`}>{[1,2,3,4,5].map(n => <span key={n} className={n <= learning.level ? 'filled' : ''}>★</span>)}</div></div></div>
        <div className="pm-dash-learning-action"><Link href="/learning" className="pm-dash-btn pm-dash-btn-primary">{plan === 'free' ? 'Continue foundations' : 'Continue learning'}<ArrowRight size={22}/></Link><small>{learning.lessonProgress}</small></div>
        {plan === 'premium' && <p className="pm-dash-learning-topic">Stakeholder communication</p>}
    </section>;
}
