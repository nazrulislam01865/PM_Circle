import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, Check, ClipboardList, Clock3, FileText, Info, Play, Users } from 'lucide-react';
import { LearningAchievement, LearningLayout, LearningPanel, LearningProgress, LearningPracticeIcon } from '@/components/learning/LearningShared';
import { LearningRoadmap } from '@/components/learning/LearningRoadmap';
import type { LearningPathData, LearningShell } from '@/types/learning';
import { learningActivityHref } from '@/types/learning';
export default function PathShow({ shell, path }: { shell: LearningShell; path: LearningPathData }) {
    const firstIncomplete = path.modules.flatMap(module => module.activities.filter(activity => !activity.completed).map(activity => [module.position,activity.position])).at(0) || [1,1];
    const currentUrl = learningActivityHref(path.slug,firstIncomplete[0],firstIncomplete[1]);
    const percent = path.moduleCount ? Math.round(path.completedModules/path.moduleCount*100) : 0;
    const save = () => router.visit(`/learning/${path.slug}/save`, { method: path.saved ? 'delete' : 'post', preserveScroll: true });
    return <LearningLayout shell={shell}><Head title={path.title} />
        <nav className="pm-learn-crumb"><Link href="/learning">‹ &nbsp;Learn & practice</Link><span>/</span>{path.level}</nav>
        <Link className="pm-learn-back" href="/learning"><ArrowLeft size={17}/>Back to learning paths</Link>
        <div className="pm-learn-columns pm-learn-path-detail"><div className="pm-learn-main-col"><span className="pm-learn-level-tag">{path.level}</span>
            <h1>{path.title}</h1><p className="pm-learn-lead">{path.introduction}</p>
            <div className="pm-learn-path-facts"><span><BookOpen size={19}/>{path.moduleCount} modules</span><span><ClipboardList size={19}/>{path.practiceCount} activities</span><span><Clock3 size={19}/>About {Math.max(1,Math.round(path.minutes/60))} hours</span><span><Users size={19}/>No experience needed</span></div>
            <LearningPanel title="What you’ll be able to do"><ul className="pm-learn-objectives">{path.objectives.map(item => <li key={item}><span><Check size={15}/></span>{item}</li>)}</ul></LearningPanel>
            <LearningPanel title="Your learning roadmap" className="pm-learn-roadmap"><p>Each module includes a short lesson and three practice activities.</p><LearningRoadmap slug={path.slug} modules={path.modules}/></LearningPanel>
            <LearningPanel title="Your final practice"><div className="pm-learn-final-practice"><span><ClipboardList size={27}/></span><div><strong>{path.slug === 'student-beginner' ? 'Plan a student event' : 'Apply your project skills'}</strong><p>Apply what you learned to a small event with a fixed date, limited budget and a volunteer team.</p></div><small>Included in Module 6</small></div></LearningPanel>
        </div><aside className="pm-learn-side-col">
            <LearningPanel title={path.completedModules === 0 ? 'Ready for your first step?' : 'Continue your learning'}><Link className="pm-dash-btn pm-dash-btn-primary pm-dash-full" href={currentUrl}><Play size={19} fill="currentColor"/> {path.completedModules === 0 ? 'Start path' : 'Continue path'}</Link>
                <p className="pm-learn-side-tip"><Info size={16}/>Progress is saved as you learn.</p><div className="pm-learn-progress-meta"><span>{path.completedModules}/{path.moduleCount} modules complete</span></div><LearningProgress percent={percent}/><div className="pm-learn-division"/><button className="pm-dash-btn pm-dash-btn-white pm-dash-full" type="button" onClick={save}><Bookmark size={21} fill={path.saved?'#d8eaff':'none'}/>{path.saved ? 'Saved path' : 'Save path'}</button></LearningPanel>
            <LearningPanel title="How you’ll practise"><div className="pm-learn-feature-list"><div><span><FileText/></span><p><strong>MCQ questions</strong><small>Check your understanding.</small></p></div><div><span><LearningPracticeIcon type="short_answer" size={23}/></span><p><strong>Short written answers</strong><small>Apply what you learn.</small></p></div><div><span><LearningPracticeIcon type="scenario" size={23}/></span><p><strong>Mini scenarios</strong><small>Make simple project decisions.</small></p></div></div><div className="pm-learn-division"/><p className="pm-learn-side-tip">Review explanations, retry and improve.</p></LearningPanel>
            <LearningPanel title="Achievement to work toward"><LearningAchievement/><div className="pm-learn-division"/><p className="pm-learn-muted-note">A PM Circle learning achievement.</p></LearningPanel>
            <LearningPanel title="Add to your learning story"><div className="pm-learn-story"><span>▥</span><p>Completed modules and practice can appear in your profile summary.</p></div><Link className="pm-learn-text-link" href="/settings/profile">Manage profile visibility <ArrowRight size={17}/></Link></LearningPanel>
        </aside></div></LearningLayout>;
}
