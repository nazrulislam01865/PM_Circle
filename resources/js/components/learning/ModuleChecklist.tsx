import { Link } from '@inertiajs/react';
import { Check, Info, Brain } from 'lucide-react';
import { LearningAchievement, LearningPanel, LearningProgress } from './LearningShared';
import { learningActivityHref } from '@/types/learning';
import type { LearningActivityData } from '@/types/learning';

export function ModuleChecklist({ slug, module, activities, current, answered, modules, completedModules }: {
    slug: string; module: number; activities: LearningActivityData[]; current: number;
    answered: number; modules: number; completedModules: number;
}) {
    const complete = activities.filter(a => a.completed).length;
    return <aside className="pm-learn-side-col" aria-label="Module details">
        <LearningPanel title={`Module ${module} checklist`}><div className="pm-learn-checklist">{activities.map(item => <Link href={learningActivityHref(slug,module,item.position)} key={item.position} aria-current={item.position === current ? 'step' : undefined} className={item.position === current ? 'active' : ''}><span className={`pm-learn-check-number ${item.completed ? 'done' : ''}`}>{item.completed ? <Check size={18}/> : item.position}</span><span><strong>{item.title}</strong><small>{item.completed ? `Completed · ${item.minutes || 5} min` : item.position === current ? item.type === 'mcq' ? `In progress · ${answered}/3 answered` : 'In progress' : 'Not started'}</small></span></Link>)}</div>
            <div className="pm-learn-division"/><div className="pm-learn-progress-meta">Module progress <small>{complete} of {activities.length} steps complete</small></div><LearningProgress percent={Math.round(complete/Math.max(activities.length,1)*100)}/>
            <div className="pm-learn-progress-meta">Path progress <small>{completedModules} of {modules} modules complete</small></div><LearningProgress percent={Math.round(completedModules / Math.max(modules,1)*100)}/></LearningPanel>
        <LearningPanel title="Working toward"><LearningAchievement condensed/><div className="pm-learn-division"/><p className="pm-learn-side-tip"><Info size={16}/>Your learning is saved automatically.</p></LearningPanel>
        <LearningPanel title="AI help"><div className="pm-learn-ai-help"><Brain size={24}/><div><strong>Explain the concept</strong><p>Get a simple explanation of this topic without giving the answer.</p><small>AI assistance is not enabled in this demo.</small></div></div></LearningPanel>
    </aside>;
}
