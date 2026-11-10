import { Link, router } from '@inertiajs/react';
import { ArrowRight, BarChart3, BookOpen, BriefcaseBusiness, CalendarDays, Check, ChevronDown, CirclePlay, Clock3, Code2, Factory, HardHat, HeartPulse, Landmark, Laptop, Layers3, Lightbulb, Mic2, MoreHorizontal, Play, Sparkles, Target, UsersRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { InterviewCard, InterviewHeading, InterviewPage } from '@/components/interview/InterviewShared';
import { dateLabel, interviewBase, practiceUrl, type InterviewHistory, type InterviewShell, type QuestionType } from '@/components/interview/types';

type Props = {
    shell: InterviewShell; industries: Record<string, string>; roles: string[]; experience: Record<string, string>;
    recent: InterviewHistory[]; stats: { sessions: number; answered: number; last: string | null }; minutesPerQuestion: number;
};
const industryIcons = [Laptop, HardHat, Layers3, Factory, Landmark, HeartPulse, MoreHorizontal];
const typeNames: QuestionType[] = ['General', 'Behavioral', 'Technical', 'Situational'];

export default function Index({ shell, industries, roles, experience, recent, stats, minutesPerQuestion }: Props) {
    const [industry, setIndustry] = useState('software');
    const [role, setRole] = useState('Project Manager');
    const [level, setLevel] = useState('mid');
    const [types, setTypes] = useState<QuestionType[]>(['General', 'Behavioral', 'Technical']);
    const [count, setCount] = useState(10);
    const [mode, setMode] = useState<'type' | 'speak' | 'both'>('both');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const toggle = (type: QuestionType) => setTypes(previous => previous.includes(type) ? previous.length > 1 ? previous.filter(item => item !== type) : previous : [...previous, type]);
    const start = (event: FormEvent) => {
        event.preventDefault(); setError(''); setSubmitting(true);
        router.post(`${interviewBase}/start`, { industry, role, experience: level, types, count, mode }, {
            preserveScroll: true,
            onError: errors => { setError(Object.values(errors)[0] ?? 'Please review your selections.'); setSubmitting(false); },
            onFinish: () => setSubmitting(false),
        });
    };
    return <InterviewPage shell={shell}><InterviewHeading subtitle="Project management interview practice by industry, role, and experience level."/>
        <div className="pm-interview-home-grid"><div className="pm-interview-home-main">
            <div className="pm-interview-hero"><div><h2>Industry-Focused<br/>PM Interview Practice</h2><ul><li><Check size={17}/>Realistic PM interview questions by industry</li><li><Check size={17}/>Answer by typing or speaking</li><li><Check size={17}/>Review your answers and track practice progress</li></ul></div><div className="pm-interview-hero-image" aria-hidden="true"/></div>
            <InterviewCard title="Start Your Interview Practice" icon={<CirclePlay size={23} fill="currentColor"/>} className="pm-interview-setup">
                <form onSubmit={start}>
                    <fieldset className="pm-interview-fieldset"><legend><span className="pm-interview-step">1</span><Layers3 size={18}/>Select Industry <b>*</b></legend>
                        <div className="pm-interview-industry-grid">{Object.entries(industries).map(([key, label], i) => { const Icon = industryIcons[i]; return <button type="button" key={key} className={`pm-interview-choice ${industry === key ? 'is-selected' : ''}`} aria-pressed={industry === key} onClick={() => setIndustry(key)}>{industry === key && <Check className="pm-interview-selected-mark" size={14}/>}<Icon size={22}/><span>{label}</span></button>; })}</div>
                    </fieldset>
                    <fieldset className="pm-interview-fieldset"><legend><span className="pm-interview-step">2</span><UsersRound size={18}/>Select PM Role <b>*</b></legend>
                        <div className="pm-interview-role-grid">{roles.map(item => <button key={item} type="button" className={`pm-interview-choice ${role === item ? 'is-selected' : ''}`} aria-pressed={role === item} onClick={() => setRole(item)}>{role === item && <Check size={15}/>}<span>{item}</span></button>)}</div>
                    </fieldset>
                    <div className="pm-interview-options-grid"><fieldset className="pm-interview-fieldset"><legend><span className="pm-interview-step">3</span><BarChart3 size={18}/>Experience Level <b>*</b></legend>
                        <div className="pm-interview-experience-grid">{Object.entries(experience).map(([key, value]) => <button type="button" key={key} className={`pm-interview-choice ${level === key ? 'is-selected' : ''}`} aria-pressed={level === key} onClick={() => setLevel(key)}>{level === key && <Check size={14}/>}<span>{value.split(' (')[0]}<small>({value.split(' (')[1]}</small></span></button>)}</div>
                    </fieldset><fieldset className="pm-interview-fieldset"><legend><span className="pm-interview-step">4</span><Layers3 size={18}/>Interview Type <b>*</b></legend>
                        <div className="pm-interview-types-grid">{typeNames.map(item => <label className={`pm-interview-type ${types.includes(item) ? 'is-selected' : ''}`} key={item}><input type="checkbox" checked={types.includes(item)} onChange={() => toggle(item)}/><span>{item}</span></label>)}</div>
                    </fieldset></div>
                    <div className="pm-interview-setup-footer"><div><label htmlFor="pm-interview-count"><BookOpen size={18}/>Number of Questions</label><div className="pm-interview-select-wrap"><select id="pm-interview-count" className="pm-input" value={count} onChange={e => setCount(Number(e.target.value))}><option value={5}>5 Questions</option><option value={10}>10 Questions</option></select><ChevronDown size={16}/></div></div>
                        <div><span className="pm-interview-label"><Clock3 size={18}/>Estimated Duration</span><p className="pm-interview-duration">≈ {count * minutesPerQuestion} minutes</p></div>
                        <div><span className="pm-interview-label"><Mic2 size={18}/>Answer Mode</span><div className="pm-interview-radio-row">{([['type', 'Type Answer'], ['speak', 'Speak Answer'], ['both', 'Both']] as const).map(([value, text]) => <label key={value}><input type="radio" name="answer-mode" value={value} checked={mode === value} onChange={() => setMode(value)}/>{text}</label>)}</div></div>
                    </div>
                    {error && <p role="alert" className="pm-interview-error">{error}</p>}
                    <button className="pm-button pm-interview-start" disabled={submitting} type="submit"><Play size={18} fill="currentColor"/>{submitting ? 'Starting interview…' : 'Start Interview Practice'}</button>
                </form>
            </InterviewCard>
        </div><aside className="pm-interview-home-side">
            <InterviewCard title="Your Previous Practice" icon={<BarChart3 size={21}/>} action={<Link href={`${interviewBase}/results`}>View All</Link>}>
                {stats.sessions > 0 ? <><div className="pm-interview-mini-performance"><div className="pm-interview-donut pm-interview-practice-donut"><div><strong>{stats.sessions}</strong><small>sessions</small></div></div><div><strong>Practice History</strong><span className="pm-interview-status is-good"><Check size={16}/>Sessions Completed</span><small>Review your answers in My Results</small></div></div><div className="pm-interview-metrics"><div><CalendarDays size={19}/><strong>{stats.sessions}</strong><small>Practice Sessions</small></div><div><Target size={19}/><strong>{stats.answered}</strong><small>Questions Answered</small></div><div><BarChart3 size={19}/><strong>{dateLabel(stats.last)}</strong><small>Last Practice</small></div></div></>
                    : <div className="pm-interview-side-empty"><BarChart3 size={35}/><strong>Your progress starts here</strong><p>Complete a practice interview to view your answers and history.</p></div>}
            </InterviewCard>
            <InterviewCard title="Popular Industry Practices" icon={<BarChart3 size={21}/>} action={<Link href="#start-practice" onClick={event => { event.preventDefault(); document.querySelector('.pm-interview-setup')?.scrollIntoView({ behavior: 'smooth' }); }}>View All</Link>}>
                <div className="pm-interview-popular">{Object.entries(industries).slice(0, 4).map(([key, label]) => <button type="button" key={key} onClick={() => { setIndustry(key); document.querySelector('.pm-interview-setup')?.scrollIntoView({ behavior: 'smooth' }); }}><BriefcaseBusiness size={18}/><span>{label} – Project Management</span><CirclePlay size={19}/></button>)}</div>
            </InterviewCard>
            <div className="pm-interview-why"><Sparkles size={24}/><h3>Why Industry-Based Practice?</h3><p>Get role-relevant and industry-specific questions, realistic scenarios, that match real interview expectations.</p></div>
            {recent.find(item => item.status === 'in_progress') && <InterviewCard title="Continue Practicing" icon={<Clock3 size={19}/>}><Link className="pm-button pm-button-outline" href={practiceUrl(recent.find(item => item.status === 'in_progress')!.id)}>Resume unfinished interview <ArrowRight size={17}/></Link></InterviewCard>}
        </aside></div>
    </InterviewPage>;
}
