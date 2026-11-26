import { Link, router } from '@inertiajs/react';
import { useId, useRef, useState } from 'react';
import { AdminChoice } from '@/components/admin/AdminChoice';
import { JobDescriptionUpload } from '@/components/interview/JobDescriptionUpload';
import { Brief, Difficulty, FlowPage, Intro, Wizard, professionFor, questionTopic } from '@/components/interview/InterviewFlow';
import { InterviewCard } from '@/components/interview/InterviewShared';
import { interviewApi, interviewBase, practiceUrl, type InterviewHistory, type InterviewShell, type QuestionType, type InterviewQuestion } from '@/components/interview/types';

type Props = {
    practiceDefaults?: Partial<Record<'industry' | 'role' | 'level' | 'count' | 'answerMode', string>>;
    shell: InterviewShell; industries: Record<string, string>; roles: Record<string, string>; experience: Record<string, string>;
    types: Record<string, string>; counts: Record<string, string>; modes: Record<string, string>;
    questionSets: { id: number; title: string; industry: string | null; role: string | null; experience: string | null }[];
    recent: InterviewHistory[]; minutesPerQuestion: number;
};
// Use an existing active catalog entry only; administrator changes always take precedence.
function preferredOption(options: Record<string, string>, preferred: string | undefined, fallback: string, alias?: string): string {
    return preferred && Object.prototype.hasOwnProperty.call(options, preferred) ? preferred
        : Object.entries(options).find(([, label]) => label === preferred)?.[0]
        ?? (alias && Object.prototype.hasOwnProperty.call(options, alias) ? alias : fallback);
}
const experienceKeys: Record<string, string> = { Entry: 'entry', Junior: 'junior', 'Mid-level': 'mid', Senior: 'senior', Leadership: 'leadership' };

const focusAreas: Record<string, string[]> = {
    'Project Management': ['delivery planning', 'risk and issue management', 'scope change', 'stakeholder communication', 'dependency management', 'project governance'],
    'Business Analysis': ['requirements elicitation', 'process mapping', 'requirements traceability', 'acceptance criteria', 'UAT coordination', 'requirements prioritisation'],
    'Scrum Master': ['team facilitation', 'impediment removal', 'Sprint Goals', 'retrospective improvement', 'team conflict', 'stakeholder collaboration'],
    'Product Management': ['customer discovery', 'roadmap prioritisation', 'product metrics', 'experiment design', 'product strategy', 'cross-functional alignment'],
    'Other': ['planning', 'communication', 'risk management', 'leadership', 'delivery', 'quality'],
};
function SelectField({ label, value, options, change, disabled }: { label: string; value: string; options: Record<string,string>; change: (v: string) => void; disabled: boolean }) {
    const id = useId();
    // Radix uses the empty string for the placeholder, never as an option value.
    const allValue = '__all_eligible_sets__';
    return <AdminChoice id={id} label={label} value={value || (Object.hasOwn(options, '') ? allValue : '')} options={Object.entries(options).map(([key, text]) => ({ value: key || allValue, label: text }))} disabled={disabled} onChange={next => change(next === allValue ? '' : next)}/>;
}
export default function Index({ shell, practiceDefaults = {}, industries, roles, experience, types: availableTypes, counts, modes, questionSets, recent, minutesPerQuestion }: Props) {
    const [industry, setIndustry] = useState(() => preferredOption(industries, practiceDefaults.industry, 'software' in industries ? 'software' : Object.keys(industries)[0] ?? ''));
    const [role, setRole] = useState(() => preferredOption(roles, practiceDefaults.role, 'Project Manager' in roles ? 'Project Manager' : Object.keys(roles)[0] ?? ''));
    const [level, setLevel] = useState(() => preferredOption(experience, practiceDefaults.level, 'mid' in experience ? 'mid' : Object.keys(experience)[0] ?? '', experienceKeys[practiceDefaults.level ?? '']));
    const profession = professionFor(roles[role] ?? role);
    const professions = Object.fromEntries([...new Set(Object.values(roles).map(professionFor))].map(name => [name, name]));
    const professionRoles = Object.fromEntries(Object.entries(roles).filter(([, label]) => professionFor(label) === profession));
    const typeNames = Object.keys(availableTypes);
    const [types, setTypes] = useState<QuestionType[]>(typeNames);
    const countOptions = Object.keys(counts).map(Number);
    const [count, setCount] = useState(() => countOptions.includes(Number(practiceDefaults.count)) ? Number(practiceDefaults.count) : countOptions.includes(5) ? 5 : countOptions[0] ?? 0);
    const [mode, setMode] = useState(() => preferredOption(modes, practiceDefaults.answerMode?.toLowerCase(), 'both' in modes ? 'both' : Object.keys(modes)[0] ?? 'type'));
    const [requestedExperience, setRequestedExperience] = useState('');
    const [jd, setJd] = useState(''); const [file, setFile] = useState('');
    const [step, setStep] = useState(0); const [mix, setMix] = useState('recommended'); const [focus, setFocus] = useState<string[]>([]);
    const [setId, setSetId] = useState<number | null>(null);
    const eligibleSets = questionSets.filter(item => (!item.industry || item.industry === industry) && (!item.role || item.role === role) && (!item.experience || item.experience === level));
    const [draft, setDraft] = useState<{ draft: string; questions: InterviewQuestion[] } | null>(null);
    const [busy, setBusy] = useState(false); const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false); const [uploadError, setUploadError] = useState('');
    const uploadLock = useRef(false);
    const invalidate = () => { setDraft(null); setError(''); };
    const payload = { industry, role, experience: level, types, count, mode, profession, requested_experience: requestedExperience || null, jd: jd || null, mix, focus: mix === 'focus' ? focus : [], question_set: eligibleSets.some(item => item.id === setId) ? setId : null };
    const unavailable = !industry || !role || !level || !types.length || !count || !mode || !eligibleSets.length;
    const generate = async () => { if (busy || unavailable) return; setBusy(true); setError(''); setDraft(null); try { setDraft(await interviewApi<{draft:string;questions:InterviewQuestion[]}>(`${interviewBase}/preview`, 'POST', payload)); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to build the question set.'); } finally { setBusy(false); } };
    const start = () => { if (!draft || busy) return; setBusy(true); setError(''); router.post(`${interviewBase}/start`, { ...payload, draft: draft.draft }, { onError: errors => { setError(Object.values(errors)[0] ?? 'Unable to start.'); setDraft(null); }, onFinish: () => setBusy(false) }); };
    const attach = async (chosen: File) => {
        if (busy || uploadLock.current) return;
        uploadLock.current = true; setUploading(true); setBusy(true); setUploadError(''); invalidate();
        try {
            const data = new FormData(); data.append('file', chosen);
            const response = await fetch(`${interviewBase}/jd-text`, { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '' }, body: data });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || typeof result.text !== 'string') throw new Error(result.errors?.file?.[0] ?? result.message ?? 'Unable to read attachment. Paste the job description instead.');
            setJd(result.text); setFile(chosen.name);
        } catch (e) { setUploadError(e instanceof Error ? e.message : 'Unable to read attachment.'); }
        finally { uploadLock.current = false; setUploading(false); setBusy(false); }
    };
    const reviewTarget = () => {
        const title = jd.match(/^\s*(?:job\s*title|position|role|title)\s*[:–]\s*(.+)$/im)?.[1] ?? jd.trim().split('\n')[0] ?? '';
        const foundRole = Object.entries(roles).sort((a,b) => b[1].length-a[1].length).find(([,label]) => title.toLowerCase().includes(label.toLowerCase()));
        if (foundRole) { setRole(foundRole[0]); setFocus([]); }
        const industryLine = jd.match(/^\s*industry\s*:\s*(.+)$/im)?.[1]?.trim();
        const foundIndustry = Object.entries(industries).find(([, label]) => label.toLowerCase() === industryLine?.toLowerCase());
        if (foundIndustry) setIndustry(foundIndustry[0]);
        const years = jd.match(/\b(\d{1,2})(?:\s*(?:[-–—]|to)\s*(\d{1,2})|\s*(\+))?\s*(?:years?|yrs?)\b/i);
        if (years) { const n = Number(years[1]); const key = n >= 10 ? 'leadership' : n >= 5 ? 'senior' : n >= 3 ? 'mid' : n >= 1 ? 'junior' : 'entry'; if (key in experience) setLevel(key); setRequestedExperience(`${years[1]}${years[2] ? '–'+years[2] : years[3] || ''} years`); }
        setStep(1); invalidate();
    };
    const majority = Math.round(count * .6), small = Math.round(count * .2);
    const buckets: [string, number][] = mix === 'common' ? [['Common questions', count]] : mix === 'focus' ? [['Focus-area questions', majority], ['Common questions', small], ['Role & industry scenarios', count - majority - small]] : [['Common questions', majority], ['Role & industry scenarios', count - majority]];
    const rows: [string, string | number][] = [['Profession', profession], ['Role', roles[role] ?? role], ['Industry', industries[industry] ?? industry], ['Level', experience[level] ?? level], ['JD experience', requestedExperience || 'Unspecified']];
    if (step === 1) rows.push(['Questions', count], ['Estimated time', `≈ ${count * minutesPerQuestion} min`]);
    const unfinished = recent.find(item => item.status === 'in_progress');
    return <FlowPage shell={shell} hero rail={<Brief rows={rows} previous={recent.find(item => item.status === 'completed')} resume={unfinished && <InterviewCard title="Continue practice"><Link className="pm-button pm-button-outline" href={practiceUrl(unfinished.id)}>Resume unfinished interview</Link></InterviewCard>}/> }>
        <Wizard step={step} left={step === 1 && <button className="pm-button pm-button-outline" type="button" disabled={busy} onClick={() => { setStep(0); invalidate(); }}>Back</button>} right={step === 0 ? <button className="pm-button" disabled={busy || !industry || !role || !level} type="button" onClick={reviewTarget}>Continue to question setup</button> : <><button className={`pm-button ${draft ? 'pm-button-outline' : ''}`} disabled={busy || unavailable || (mix === 'focus' && !focus.length)} type="button" onClick={() => void generate()}>{busy ? 'Please wait…' : draft ? 'Rebuild set' : 'Generate question set'}</button>{draft && <button className="pm-button" disabled={busy} onClick={start}>Start practice</button>}</>}>
            <fieldset className="pm-if-fieldset" disabled={busy}>
            {step === 0 ? <><Intro title="Set your interview target" description="Choose the role you are preparing for. Add a job description if you have one."/><div className="pm-if-fields">
                <SelectField disabled={busy} label="Industry" value={industry} options={industries} change={v => { setIndustry(v); invalidate(); }}/><SelectField disabled={busy} label="Profession" value={profession} options={professions} change={v => { setRole(Object.entries(roles).find(([, label]) => professionFor(label) === v)?.[0] ?? ''); setFocus([]); invalidate(); }}/><SelectField disabled={busy} label="Target role" value={role} options={professionRoles} change={v => { setRole(v); invalidate(); }}/><SelectField disabled={busy} label="Experience level" value={level} options={experience} change={v => { setLevel(v); invalidate(); }}/><label className="pm-if-field"><span>Experience requested <small>Optional</small></span><input className="pm-input" value={requestedExperience} maxLength={120} placeholder="e.g. 4–6 years" onChange={e => { setRequestedExperience(e.target.value); invalidate(); }}/></label></div>
                <section className="pm-if-box"><h3>Job description <small>Optional</small></h3><label className="pm-if-field">Paste job description<textarea rows={5} className="pm-input pm-if-jd" value={jd} maxLength={12000} placeholder="Paste the job title, responsibilities and requirements…" onChange={e => { setJd(e.target.value); invalidate(); }}/></label><JobDescriptionUpload fileName={file} busy={uploading} disabled={busy} onSelect={chosen => void attach(chosen)} onInvalid={setUploadError} onRemove={() => { setFile(''); setUploadError(''); invalidate(); }}/>{uploadError && <p role="alert" className="pm-interview-error">{uploadError}</p>}<p className="pm-if-note">Text is extracted for question selection. Uploaded files are not retained. Scanned PDFs may require pasting text manually.</p></section></> : <><Intro title="Build your question set" description="Choose the mix, session length and how you want to answer."/><SelectField disabled={busy} label="Question mix" value={mix} options={{recommended:'Recommended Mix', common:'Common Interview Questions', focus:'Focus Areas'}} change={v => { setMix(v); invalidate(); }}/>{mix === 'focus' && <><p className="pm-if-note">Choose up to three focus areas.</p><div className="pm-if-picks">{(focusAreas[profession] ?? focusAreas.Other).map(item => <label key={item}><input type="checkbox" checked={focus.includes(item)} disabled={!focus.includes(item) && focus.length >= 3} onChange={() => { setFocus(old => old.includes(item) ? old.filter(v => v !== item) : [...old,item]); invalidate(); }}/>{item}</label>)}</div></>}
                <div className="pm-if-box"><h3>Question mix preview</h3><dl className="pm-if-summary">{(draft ? [...new Set(draft.questions.map(q => q.bucket ?? 'Questions'))].map(bucket => [bucket, draft.questions.filter(q => (q.bucket ?? 'Questions') === bucket).length] as [string,number]) : buckets).map(([label, n]) => <div key={label}><dt>{label}</dt><dd>{n}</dd></div>)}</dl><p className="pm-if-note">{draft ? 'Actual catalog selection.' : 'Requested mix; availability depends on the active question catalog.'}</p></div>
                <h3>Interview question types</h3><div className="pm-if-picks">{typeNames.map(item => <label key={item}><input type="checkbox" checked={types.includes(item)} onChange={() => { setTypes(old => old.includes(item) ? old.filter(v => v !== item) : [...old,item]); invalidate(); }}/>{availableTypes[item]}</label>)}</div><div className="pm-if-fields"><SelectField disabled={busy} label="Number of questions" value={String(count)} options={counts} change={v => { setCount(Number(v)); invalidate(); }}/><SelectField disabled={busy} label="Answer mode" value={mode} options={modes} change={v => { setMode(v); invalidate(); }}/></div>
                {eligibleSets.length > 1 && <SelectField disabled={busy} label="Question set" value={String(eligibleSets.some(item => item.id === setId) ? setId : '')} options={{'':'All eligible sets', ...Object.fromEntries(eligibleSets.map(item => [String(item.id),item.title]))}} change={v => { setSetId(v ? Number(v) : null); invalidate(); }}/>}
                {draft && <div className="pm-if-box"><div className="pm-if-between"><h3>Your question set</h3><span className="pm-if-tag">{draft.questions.length} questions · ≈ {draft.questions.length * minutesPerQuestion} min</span></div>{draft.questions.map((q,i) => <div className="pm-if-item" key={q.id}><strong>{i+1}. {questionTopic(q)}</strong> <span className="pm-if-note">· {q.type}</span> <Difficulty question={q}/></div>)}</div>}{unavailable && <p role="alert" className="pm-interview-error">Choose available options and at least one question type.</p>}</>}
            </fieldset>{error && <p role="alert" className="pm-interview-error">{error}</p>}
        </Wizard></FlowPage>;
}
