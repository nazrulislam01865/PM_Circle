import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, Check, CheckCircle2, ChevronDown, ChevronUp, Info, Lightbulb, XCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { ActivityStepper } from '@/components/learning/ActivityStepper';
import { ModuleChecklist } from '@/components/learning/ModuleChecklist';
import { LearningLayout, LearningPanel } from '@/components/learning/LearningShared';
import type { LearningActivityData, LearningActivityDetail, LearningQuestionData, LearningShell } from '@/types/learning';
import { learningActivityHref } from '@/types/learning';

type ActivityProps = { shell: LearningShell;
    path: { slug: string; level: string; moduleCount: number; completedModules: number };
    module: { position: number; title: string; activities: LearningActivityData[]; completed: number };
    activity: LearningActivityDetail; question: LearningQuestionData | null; answered: number;
};

function QuestionForm({ question, answered, url, idea }: { question: LearningQuestionData; answered: number; url: string; idea: string }) {
    const [selection, setSelection] = useState(question.selected ?? '');
    const [hintOpen, setHintOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    useEffect(() => setSelection(question.selected ?? ''), [question.position, question.selected]);
    const submit = (e: FormEvent) => { e.preventDefault(); if (!selection || busy) return;
        router.post(`${url}/check`, { choice: selection, question: question.position }, { preserveScroll: true,
            onStart: () => setBusy(true), onFinish: () => setBusy(false) }); };
    return <LearningPanel className="pm-learn-answer-panel"><div className="pm-learn-answer-heading"><h2>Check your understanding</h2><span>Question {question.position} of {question.total} <i/> Single answer</span></div>
        <button className="pm-learn-key-idea" type="button" aria-expanded={hintOpen} onClick={() => setHintOpen(v => !v)}><BookOpen size={23}/><span><strong>Key idea:</strong> {idea}</span>{hintOpen ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</button>
        {hintOpen && <div className="pm-learn-key-hint">Think about whether the work has a clear beginning, an end, and a unique outcome.</div>}
        <form onSubmit={submit}><fieldset disabled={busy}><legend>{question.prompt}</legend>
            <div className="pm-learn-choices">{Object.entries(question.choices).map(([key,value]) => <label key={key} className={`pm-learn-choice ${selection === key ? 'selected':''}`}><input type="radio" name={`question-${question.position}`} value={key} checked={selection===key} onChange={() => setSelection(key)}/><b>{key}.</b><span>{value}</span></label>)}</div>
            <p className="pm-learn-muted-note">Select one answer. You can review the explanation after checking.</p>
            {question.selected && <div role="status" className={`pm-learn-feedback ${question.isCorrect ? 'correct' : 'incorrect'}`}>
                <strong>{question.isCorrect ? <CheckCircle2 size={20}/> : <XCircle size={20}/>} {question.isCorrect ? 'Correct answer' : 'Review this answer'}</strong><p>{question.explanation}</p></div>}
            <div className="pm-learn-check-actions"><button type="submit" className="pm-dash-btn pm-dash-btn-primary" disabled={!selection || busy}>{busy ? 'Checking...' : question.selected ? 'Check again' : 'Check answer'}</button>
                {question.selected && question.position < question.total && <Link className="pm-dash-btn pm-dash-btn-white" href={`${url}?question=${question.position+1}`}>Next question <ArrowRight size={17}/></Link>}</div>
        </fieldset></form>
    </LearningPanel>;
}

function WrittenActivity({ activity, url }: { activity: LearningActivityDetail; url: string }) {
    const form = useForm({ response: activity.response || '' });
    const [choice, setChoice] = useState(activity.response || '');
    const submit = (e: FormEvent) => { e.preventDefault();
        if (activity.type === 'scenario') { router.post(`${url}/complete`, { response: choice }, { preserveScroll: true }); }
        else form.post(`${url}/complete`, { preserveScroll: true }); };
    return <LearningPanel className="pm-learn-answer-panel"><h2>{activity.type === 'lesson' ? 'Short lesson' : activity.type === 'short_answer' ? 'Apply what you learned' : 'Make a project decision'}</h2>
        {activity.type === 'lesson' ? <><div className="pm-learn-reading"><span className="pm-learn-reading-icon"><BookOpen size={32}/></span><p>{activity.content}</p></div><h3>What to remember</h3><ul className="pm-learn-learning-points"><li>Projects have a defined start and finish.</li><li>They create a unique result.</li><li>Repeated, ongoing work is usually operations.</li></ul></> : <><p className="pm-learn-written-prompt">{activity.content}</p>
            <form onSubmit={submit}>{activity.type === 'short_answer' ? <><label htmlFor="written-response">Your answer</label><textarea id="written-response" rows={6} minLength={20} maxLength={2000} value={form.data.response} onChange={e => form.setData('response',e.target.value)} placeholder="Explain your approach and why..." required/>{form.errors.response && <p className="pm-learn-error">{form.errors.response}</p>}</> : <fieldset><legend className="sr-only">Choose a response</legend><div className="pm-learn-choices">{activity.payload?.options.map((option,i) => <label className={`pm-learn-choice ${choice === String(i) ? 'selected':''}`} key={i}><input type="radio" name="scenario" checked={choice===String(i)} onChange={() => setChoice(String(i))}/><span>{option}</span></label>)}</div></fieldset>}
                {activity.completed && <p className="pm-learn-feedback correct">Response recorded. You can continue to the next activity.</p>}
                {!activity.completed && <button className="pm-dash-btn pm-dash-btn-primary" type="submit" disabled={activity.type === 'scenario' ? !choice : form.processing || form.data.response.trim().length < 20}>Save response <ArrowRight size={17}/></button>}</form></>}
        {activity.type === 'lesson' && <div className="pm-learn-check-actions"><button className="pm-dash-btn pm-dash-btn-primary" type="button" disabled={activity.completed} onClick={() => router.post(`${url}/complete`, {}, { preserveScroll: true })}>{activity.completed ? <><Check size={18}/> Lesson completed</> : <>Mark lesson complete <ArrowRight size={17}/></>}</button></div>}
    </LearningPanel>;
}

export default function Activity({ shell, path, module, activity, question, answered }: ActivityProps) {
    const url = learningActivityHref(path.slug,module.position,activity.position);
    const prev = activity.position > 1 ? learningActivityHref(path.slug,module.position,activity.position-1) : `/learning/${path.slug}`;
    const next = activity.position < module.activities.length ? learningActivityHref(path.slug,module.position,activity.position+1) : module.position < path.moduleCount ? learningActivityHref(path.slug,module.position+1,1) : `/learning/${path.slug}`;
    const canContinue = activity.completed || (activity.type === 'mcq' && !!question?.selected && question.position < question.total);
    const nextHref = activity.type === 'mcq' && question?.selected && question.position < question.total ? `${url}?question=${question.position+1}` : next;
    return <LearningLayout shell={shell}><Head title={`${module.title} · Learn & practice`}/>
        <nav className="pm-learn-crumb"><Link href="/learning">‹ &nbsp;Learn & practice</Link><span>/</span><Link href={`/learning/${path.slug}`}>{path.level}</Link><span>/</span>Module {module.position}</nav>
        <div className="pm-learn-activity-title"><div><h1>{module.title}</h1><p>Module {module.position} of {path.moduleCount} · {path.level} foundations</p></div><Link className="pm-learn-save-exit" href={`/learning/${path.slug}`}><Bookmark size={26}/>Save & exit</Link></div>
        <div className="pm-learn-columns pm-learn-activity-layout"><div className="pm-learn-main-col"><ActivityStepper slug={path.slug} module={module.position} activities={module.activities} active={activity.position}/>
            <div className="pm-learn-notice"><Info size={21}/>18 practice activities across this path; lessons are additional.</div>
            {activity.type === 'mcq' && question ? <QuestionForm question={question} answered={answered} url={url} idea={activity.content.replace(/^Key idea:\s*/, "")}/> : <WrittenActivity activity={activity} url={url}/>}
            <div className="pm-learn-reminder pm-learn-panel"><span><Lightbulb size={34}/></span><div><h3>Need a quick reminder?</h3><p>{path.slug === "student-beginner" ? "Projects have a defined start and finish and produce a unique outcome. Ongoing, repeated work is usually operations." : "Clear project goals, stakeholder involvement and thoughtful decisions help teams deliver outcomes."}</p></div><Link href={learningActivityHref(path.slug,module.position,1)}>View full lesson <ArrowRight size={18}/></Link></div>
            <div className="pm-learn-activity-nav"><Link className="pm-dash-btn pm-dash-btn-white" href={prev}><ArrowLeft size={19}/>Previous: {activity.position === 1 ? 'Learning path' : module.activities[activity.position-2]?.title}</Link>
                {canContinue ? <Link className="pm-dash-btn pm-dash-btn-primary" href={nextHref}>Next: {question?.selected && question.position < question.total ? 'Question' : activity.position < 4 ? module.activities[activity.position]?.title : 'Module'} <ArrowRight size={19}/></Link> : <button type="button" className="pm-dash-btn pm-dash-btn-disabled" disabled>Next: {activity.position < 4 ? module.activities[activity.position]?.title : 'Module'} <ArrowRight size={19}/></button>}</div>
        </div><ModuleChecklist slug={path.slug} module={module.position} activities={module.activities} current={activity.position} answered={answered} modules={path.moduleCount} completedModules={path.completedModules}/></div>
    </LearningLayout>;
}
