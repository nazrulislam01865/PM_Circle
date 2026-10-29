import { Link } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { learningActivityHref } from '@/types/learning';
import type { LearningActivityData } from '@/types/learning';

export function ActivityStepper({ slug, module, activities, active }: { slug: string; module: number; activities: LearningActivityData[]; active: number }) {
    return <nav className="pm-learn-steps" aria-label="Module activities">{activities.map((item,index) =>
        <div className="pm-learn-step-block" key={item.position}>
            {index > 0 && <span className="pm-learn-step-line" />}
            <Link href={learningActivityHref(slug,module,item.position)} aria-current={active === item.position ? 'step' : undefined} className={`pm-learn-step ${active === item.position ? 'current' : ''} ${item.completed ? 'done' : ''}`}><span className="pm-learn-step-number">{item.completed ? <Check size={17}/> : item.position}</span><span className="pm-learn-step-title">{item.position}. {item.title === 'Short lesson' ? 'Learn' : item.title}</span></Link>
        </div>)}
    </nav>;
}
