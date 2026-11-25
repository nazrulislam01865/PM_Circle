import { Head, Link, useForm } from '@inertiajs/react';
import { CalendarDays, Clock3, FileText, ShieldCheck, X } from 'lucide-react';
import { useRef } from 'react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { AdminChoice } from '@/components/admin/AdminChoice';
import { Actions, CheckField, ConnectionPanel, FixedChoice, Notices, Panel, Preview, PreviewRow, choices, type Connection } from '@/components/admin/ai/SettingsShared';

type Code = 'pmp_explain' | 'pmp_followup';
type Feature = { enabled: boolean; model: string; min_plan: string };
type Exam = { enabled: boolean; full_question_count: number; full_duration_minutes: number; focused_question_count: number; focused_duration_minutes: number; shuffle_questions: boolean; needs_improvement_below: number; target_below: number; above_target_from: number };
type Props = { features: Partial<Record<Code, Feature>>; exam: Exam; models: string[]; connection: Connection };

export default function PmpAiSettings({ features, exam, models, connection }: Props) {
    const form = useForm({features: {pmp_explain: {enabled: Boolean(features.pmp_explain?.enabled), model: features.pmp_explain?.model ?? ''}, pmp_followup: {enabled: Boolean(features.pmp_followup?.enabled), model: features.pmp_followup?.model ?? ''}}});
    const preview = useRef<HTMLDialogElement>(null);
    const ready = !!features.pmp_explain && !!features.pmp_followup;
    const update = (code: Code, values: Partial<{enabled: boolean; model: string}>) => form.setData(data => ({...data, features: {...data.features, [code]: {...data.features[code], ...values}}}));
    const errorFor = (code: Code) => Object.entries(form.errors).find(([key]) => key === `features.${code}.model`)?.[1];
    const modelChoice = (code: Code, label: string) => <AdminChoice id={code+'-model'} label={label} value={form.data.features[code].model} options={choices(models)} onChange={v=>update(code,{model:v})} disabled={!ready} error={errorFor(code)}/>;
    const bank = '/admin/exam-simulator/pmp/questions';
    return <AdminLayout title="PMP Exam Simulator AI settings" subtitle="Configure AI-powered explanations and follow-up tutoring for PMP preparation." active="/admin/ai/pmp-settings" headingAction={<Actions form="pmp-ai-settings" processing={form.processing} disabled={!ready}><button type="button" className="pm-admin-button pm-admin-button-quiet" onClick={()=>preview.current?.showModal()}>Preview exam</button></Actions>}>
        <Head title="PMP Exam Simulator AI settings | PM Circle"/>
        <form id="pmp-ai-settings" className="pm-career-settings pm-feature-settings" onSubmit={e=>{e.preventDefault();form.put('/admin/ai/pmp-settings',{preserveScroll:true});}}>
            <Notices saved={form.recentlySuccessful} errors={form.errors}/>
            {!ready && <p role="alert" className="pm-admin-notice pm-admin-notice-error">PMP AI feature records are missing. Initialize the existing AI feature catalog before editing.</p>}
            <div className="pm-career-settings-grid"><div className="pm-career-settings-column">
                <Panel title="Exam configuration" action={<Link href={bank}>Manage questions &amp; settings</Link>}>
                    <FixedChoice id="pmp-mode" label="Exam mode" value={`Full exam (${exam.full_question_count} questions)`}/>
                    <FixedChoice id="pmp-source" label="Question source" value="Approved question bank"/>
                    <FixedChoice id="pmp-domains" label="Domain coverage" value="People · Process · Business Environment"/>
                    <FixedChoice id="pmp-focused" label="Focused exam" value={`${exam.focused_question_count} questions`}/>
                    <FixedChoice id="pmp-order" label="Question order" value={exam.shuffle_questions?'Randomized':'Bank order'}/>
                </Panel>
                <Panel title="Exam rules & scoring">
                    <FixedChoice id="pmp-duration" label="Duration" value={`${exam.full_duration_minutes} minutes`}/>
                    <FixedChoice id="pmp-threshold" label="Performance thresholds" value={`${exam.needs_improvement_below}% / ${exam.target_below}% / ${exam.above_target_from}%`}/>
                    <CheckField checked={true}>Show score and domain-wise result</CheckField>
                    <CheckField checked={true}>Show reviewed question explanations</CheckField>
                    <CheckField checked={true}>Deterministic scoring (not AI-generated)</CheckField>
                    <p className="pm-admin-hint">Exam rules remain managed in the existing <Link href={bank}>PMP questions &amp; settings</Link> page.</p>
                </Panel>
            </div><div className="pm-career-settings-column">
                <ConnectionPanel feature="pmp" connection={connection} onRouteSaved={(code, model) => { if (code === 'pmp_explain' || code === 'pmp_followup') update(code, {model}); }}/>
                <Panel title="Question tutor & quality">
                    <CheckField checked={form.data.features.pmp_explain.enabled} onChange={ready?v=>form.setData(data=>({...data,features:{...data.features,pmp_explain:{...data.features.pmp_explain,enabled:v},pmp_followup:{...data.features.pmp_followup,enabled:v&&data.features.pmp_followup.enabled}}})):undefined}>Enable AI question explanations</CheckField>
                    {modelChoice('pmp_explain','Explanation model')}
                    <CheckField checked={form.data.features.pmp_followup.enabled} onChange={ready&&form.data.features.pmp_explain.enabled?v=>update('pmp_followup',{enabled:v}):undefined}>Enable follow-up tutoring</CheckField>
                    {modelChoice('pmp_followup','Follow-up model')}
                    <CheckField checked={true}>Use only the selected completed question</CheckField>
                    <CheckField checked={true}>Keep existing exam answers and scores unchanged</CheckField>
                    <Link href="/admin/ai/usage-management" className="pm-admin-hint">Manage existing Plus / Pro AI usage policies</Link>
                </Panel>
                <Panel title="Exam preview"><Preview><PreviewRow icon={<FileText/>} label="Total questions" value={exam.full_question_count}/><PreviewRow icon={<Clock3/>} label="Duration" value={`${exam.full_duration_minutes} minutes`}/><PreviewRow icon={<ShieldCheck/>} label="Scoring" value="Existing exam rules"/></Preview></Panel>
            </div></div>
        </form>
        <dialog ref={preview} className="pm-career-settings-dialog"><div className="pm-career-settings-dialog-head"><h2>Exam preview</h2><button type="button" className="pm-admin-button" aria-label="Close" onClick={()=>preview.current?.close()}><X size={16}/></button></div><Preview><PreviewRow icon={<FileText/>} label="Full exam" value={`${exam.full_question_count} questions`}/><PreviewRow icon={<Clock3/>} label="Duration" value={`${exam.full_duration_minutes} minutes`}/><PreviewRow icon={<CalendarDays/>} label="Focused exam" value={`${exam.focused_question_count} questions · ${exam.focused_duration_minutes} min`}/><PreviewRow icon={<ShieldCheck/>} label="AI tutor" value={form.data.features.pmp_explain.enabled?'Enabled (unsaved preview)':'Disabled (unsaved preview)'}/></Preview><Link href={bank} className="pm-admin-button">Open question bank</Link></dialog>
    </AdminLayout>;
}
