import { Link } from '@inertiajs/react';
import { ChevronDown, ChevronUp, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { LearningPracticeIcon } from './LearningShared';
import type { LearningModuleData } from '@/types/learning';
import { learningActivityHref } from '@/types/learning';
export function LearningRoadmap({ modules, slug }: { modules: LearningModuleData[]; slug: string }) {
    const [expanded, setExpanded] = useState<number | null>(modules.find(m => !m.done)?.position || 1);
    return <div className="pm-learn-module-list">{modules.map(module => {
        const open = expanded === module.position;
        return <section className="pm-learn-module" key={module.position}>
            <button type="button" className={`pm-learn-module-toggle ${open ? 'open' : ''}`} aria-expanded={open} onClick={() => setExpanded(open ? null : module.position)}><span className="pm-learn-module-number">{module.done ? <CheckCircle2 size={19}/> : module.position}</span><strong>{module.title}</strong><small>{module.position === 1 ? module.activities.length : Math.max(0,module.activities.length-1)} activities · {module.minutes} min</small>{!open && <span className="pm-learn-module-state">{module.completed ? `${module.completed}/${module.activities.length}` : 'Not started'}</span>}{open ? <ChevronUp size={19}/> : <ChevronDown size={19}/>}</button>
            {open && <div className="pm-learn-module-inside"><p>{module.summary}</p><div className="pm-learn-module-steps">{module.activities.map(item => <Link key={item.position} href={learningActivityHref(slug,module.position,item.position)}><LearningPracticeIcon type={item.type} size={18}/><span>{item.title} · {item.type === 'mcq' ? '3 questions' : item.type === 'short_answer' ? 'Explain an example' : item.type === 'scenario' ? 'Choose an approach' : `${item.minutes} min`}</span>{item.completed && <CheckCircle2 size={16} color="#0a72d8"/>}</Link>)}</div><Link className="pm-learn-text-link" href={learningActivityHref(slug,module.position,1)}>Preview first lesson <ArrowRight size={17}/></Link></div>}
        </section>;
    })}</div>;
}
