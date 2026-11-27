import { Head, Link, router, usePage } from '@inertiajs/react';
import { useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { ArrowRight, FileText, Info, Sparkles, Upload, UserRound, LoaderCircle } from 'lucide-react';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import { FormField } from '@/components/pm/FormField';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResumeAiReview, type ResumeAiProps } from '@/components/profile/ResumeAiReview';
import { ResumeDraftPreview, ResumeQuality, sampleResume, type ResumeExtra, type ResumeFields } from '@/components/profile/ResumeDraftPreview';
import { exportResumeDraft, type ResumeExportFormat } from '@/components/profile/resumeExport';
import type { ResumeLongField, ResumeSectionId } from '@/components/profile/resumeFieldSchema';
import { ProfileSectionJump } from '@/components/profile/ProfileSectionJump';
import { ProfileWorkspaceHeader } from '@/components/profile/ProfileWorkspaceHeader';
import { contactFields, resumeIdentityFields, resumeSectionNavigation, resumeSections, ResumeRepeatableSection, sampleDocument, type ResumeDocument, type ResumeContactKey } from '@/components/profile/ResumeDocumentFields';
import type { DashboardShellData } from '@/types/dashboard';
import '../../../css/pm-resume-assistant.css';

const jumpSections = resumeSectionNavigation;
type Section = typeof jumpSections[number]['id'];
type SuggestionTarget = { label: string; text: string } & ({kind:'summary'} | {kind:'entry'; section:ResumeSectionId; index:number; field:ResumeLongField});
type Draft = Partial<ResumeFields> & { version: string; document?: ResumeDocument };
type Extracted = { fields: Partial<ResumeFields>; document: Partial<ResumeDocument>; warnings: string[]; source_text: string };
type Props = ResumeAiProps & { profile: { fields: ResumeFields; version: string; extra: ResumeExtra; document: ResumeDocument }; draft: Draft | null; aiExtractionEnabled?: boolean };
const labels: Record<keyof ResumeFields, string> = { ...Object.fromEntries(resumeIdentityFields) as Record<typeof resumeIdentityFields[number][0],string>, company:'Company',summary:'Summary',period:'Employment period',responsibilities:'Responsibilities',skills:'Skills',degree:'Degree',institution:'Institution',certification:'Certification' };
const limits: Record<keyof ResumeFields, number> = { name:255,email:255,role:80,company:150,location:241,summary:2000,period:110,responsibilities:4000,skills:5000,degree:180,institution:180,certification:100 };

function EditorSection({ id, icon, children }: { id: Section; icon: ReactNode; children: ReactNode }) {
    return <section className="pm-resume-editor-section" id={`resume-${id}`} aria-labelledby={`resume-${id}-title`}><h3 id={`resume-${id}-title`}>{icon}{jumpSections.find(section=>section.id===id)?.label}</h3>{children}</section>;
}

// Follow the shared measured section navigation and keep the preview rail inside its editor at the footer.
function bindResumeRail(builder: HTMLDivElement) {
    const tabs=builder.querySelector<HTMLElement>('.pm-profile-section-jump');
    const grid=builder.querySelector<HTMLElement>('.pm-resume-builder-grid');
    const aside=builder.querySelector<HTMLElement>('.pm-resume-builder-aside');
    if (!tabs || !grid || !aside) return;
    let frame=0;
    const sync=()=>{
        frame=0;
        const style=getComputedStyle(aside);
        if(style.position!=='sticky') return;
        const top=Number.parseFloat(style.top);
        if(!Number.isFinite(top)) return;
        const bottom=grid.getBoundingClientRect().bottom;
        const available=bottom<window.innerHeight?`${Math.max(0,bottom-top)}px`:'100dvh';
        if(builder.style.getPropertyValue('--pm-resume-grid-space')!==available) builder.style.setProperty('--pm-resume-grid-space',available);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null;
    observer?.observe(tabs);observer?.observe(grid);
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    sync();
    return ()=>{observer?.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);if(frame)cancelAnimationFrame(frame);builder.style.removeProperty('--pm-resume-grid-space');};
}

export default function ResumeAssistant({ profile, draft, resumes, features, aiExtractionEnabled = false }: Props) {
    const { memberShell, profileResumeImportsVisible } = usePage<{ memberShell: DashboardShellData; profileResumeImportsVisible?: boolean }>().props;
    const [data,setData] = useState<ResumeFields>(()=>Object.fromEntries(Object.entries(profile.fields).map(([key,value])=>[key, String(draft && key in draft ? draft[key as keyof ResumeFields] ?? '' : value ?? '')])) as ResumeFields);
    const [cv,setCv] = useState<ResumeDocument>(()=>draft?.document ?? profile.document);
    const [version,setVersion] = useState(draft?.version ?? profile.version);
    const [sample,setSample] = useState(false);
    const [previewOnly,setPreviewOnly] = useState(false);
    const editorScroll = useRef<number|null>(null);
    const builderRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(()=>{
        if (previewOnly || !builderRef.current) return;
        return bindResumeRail(builderRef.current);
    },[previewOnly]);
    useLayoutEffect(()=>{
        if (previewOnly) document.getElementById('resume-full-preview')?.scrollIntoView({block:'start'});
        else if (editorScroll.current!==null) {window.scrollTo({top:editorScroll.current});editorScroll.current=null;}
    },[previewOnly]);
    const [exportError,setExportError] = useState('');
    const [exporting,setExporting] = useState<ResumeExportFormat|null>(null);
    const exportInFlight = useRef(false);
    const [errors,setErrors] = useState<Record<string,string>>({});
    const [message,setMessage] = useState('');
    const [busy,setBusy] = useState(false);
    const [aiSection,setAiSection] = useState<SuggestionTarget|'analysis'|null>(null);
    const [uploadFile,setUploadFile] = useState<File|null>(null);
    const [extracted,setExtracted] = useState<Extracted|null>(null);
    const [uploadError,setUploadError] = useState('');
    const [useAiExtraction,setUseAiExtraction] = useState(false);
    const [submitConfirm,setSubmitConfirm] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    const inFlight = useRef(false);
    const realDraft = useRef<{fields:ResumeFields; document:ResumeDocument}|null>(null);
    const update = (key: keyof ResumeFields, value: string) => { setData(old=>({...old,[key]:value})); setErrors(old=>({...old,[key]:''})); setMessage(''); };
    const reset = () => { realDraft.current=null; setData(profile.fields); setCv(profile.document); setVersion(profile.version); setSample(false); setErrors({}); setMessage(''); };
    const save = (action: 'draft'|'submit') => {
        if (inFlight.current || sample) return;
        setSubmitConfirm(false);
        inFlight.current=true; setBusy(true); setErrors({}); setMessage('');
        router.post('/dashboard/resume-assistant', {...data,document:cv,version,action,sync_profile:action==='submit'}, { preserveScroll:true, preserveState: true, onError: messages=>setErrors(messages), onSuccess:page=>{if(action==='submit'){const updated=page.props.profile as Props['profile'];setData(updated.fields);setCv(updated.document);setVersion(updated.version);}setMessage(action==='draft'?'Draft saved for this session.':'Profile submitted.');}, onFinish:()=>{inFlight.current=false;setBusy(false);} });
    };
    const exportCurrent = async (format: ResumeExportFormat) => {
        if (sample || busy || exportInFlight.current) return;
        exportInFlight.current=true;setExporting(format);setExportError('');
        try { await exportResumeDraft(data,cv,format); }
        catch(error) {setExportError(error instanceof Error?error.message:'Unable to export the résumé.');}
        finally {exportInFlight.current=false;setExporting(null);}
    };
    const choose = (event: ChangeEvent<HTMLInputElement>) => {
        const file=event.target.files?.[0]; event.target.value=''; if (!file) return;
        if (!/\.(pdf|docx)$/i.test(file.name) || file.size>5*1024*1024 || file.size===0) {setErrors({upload:'Choose a non-empty PDF or DOCX file up to 5 MB.'});return;}
        setExtracted(null);setUploadError('');setUseAiExtraction(false);setUploadFile(file);
    };
    const upload = async () => {
        if (!uploadFile || inFlight.current) return;
        inFlight.current=true;setBusy(true);setUploadError('');
        const payload=new FormData();payload.append('resume',uploadFile);if(useAiExtraction){payload.append('use_ai','1');payload.append('ai_consent','1');}
        try {
            const response=await fetch('/dashboard/resume-assistant/extract', {method:'POST',headers:{Accept:'application/json','X-CSRF-TOKEN':document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content??''},body:payload,cache:'no-store',signal:AbortSignal.timeout(useAiExtraction?70000:45000)});
            if (response.status===429) {
                const seconds=Number(response.headers.get('Retry-After'));
                const detail=await response.json().catch(()=>null);throw new Error(detail?.code==='FEATURE_DAILY_LIMIT_REACHED'?'Daily AI extraction limit reached. Uncheck AI extraction to continue locally.':`Too many extraction requests. ${seconds>0?`Try again in ${Math.ceil(seconds)} seconds.`:'Please try again shortly.'}`);
            }
            if (response.status===419 || response.status===401) throw new Error('Your session has expired. Sign in again before retrying.');
            if (response.status===403) throw new Error('Your membership does not allow résumé extraction.');
            if (response.status===413) throw new Error('The file exceeds the server upload limit. Choose a smaller file.');
            if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The server could not process this document. Please try again.');
            const result=await response.json();
            if (!response.ok) throw new Error(response.status===422?(result.errors?.resume?.[0]??'Choose a valid PDF or DOCX.'):(result.message??'Extraction is temporarily unavailable. Please try again.'));
            if (!result.fields || !result.document || !Array.isArray(result.warnings) || typeof result.source_text!=='string') throw new Error('The extraction response was incomplete. Please try again.');
            setExtracted(result);
        } catch (error) {setUploadError(error instanceof Error&&error.name==='TimeoutError'?'Extraction timed out. Try a smaller document.':error instanceof Error?error.message:'Unable to extract this document.');}
        finally {inFlight.current=false;setBusy(false);}
    };
    const applyExtracted = () => {
        if (!extracted || busy) return;
        const fields={...extracted.fields};delete fields.email;
        const base=sample?(realDraft.current?.fields??profile.fields):data;
        const baseCv=sample?(realDraft.current?.document??profile.document):cv;
        setData({...base,...fields});setCv({...baseCv,...extracted.document});
        setSample(false);realDraft.current=null;setUploadFile(null);setExtracted(null);setUploadError('');setErrors({});
        setMessage('Extracted details added to your draft. Review all fields before saving or submitting.');
        document.getElementById('resume-basic')?.scrollIntoView({block:'start'});
    };
    const field = (key:keyof ResumeFields, multiline=false, hint?:string) => <FormField key={key} label={labels[key]} htmlFor={`resume-field-${key}`} error={errors[key]} hint={hint}>
        {multiline ? <textarea className="pm-textarea" id={`resume-field-${key}`} rows={3} maxLength={limits[key]} disabled={busy} value={data[key]} aria-invalid={!!errors[key]} aria-describedby={errors[key]?`resume-field-${key}-error`:hint?`resume-field-${key}-hint`:undefined} onChange={event=>update(key,event.target.value)}/> : <input className="pm-input" id={`resume-field-${key}`} type={key==='email'?'email':'text'} maxLength={limits[key]} disabled={busy} readOnly={key==='email'&&!sample} value={data[key]} aria-invalid={!!errors[key]} aria-describedby={errors[key]?`resume-field-${key}-error`:hint?`resume-field-${key}-hint`:undefined} onChange={event=>update(key,event.target.value)}/>}
    </FormField>;
    const suggestSummary = () => <button type="button" className="pm-resume-suggest" onClick={()=>setAiSection({kind:'summary',label:'Professional summary',text:data.summary})} disabled={busy||sample||data.summary.trim().length<2} title={data.summary.trim().length<2?'Enter your own details before requesting a suggestion.':undefined}><Sparkles aria-hidden="true"/> Suggest with AI</button>;
    const applySuggestion = (target: SuggestionTarget, text: string) => {
        if (target.kind === 'summary') update('summary',text.slice(0,limits.summary));
        else {
            setCv(old=>({...old,[target.section]:old[target.section].map((row,i)=>i===target.index ? {...row,[target.field]:text.slice(0,4000)} : row)}));
            setErrors(old=>({...old,[`document.${target.section}.${target.index}.${target.field}`]:''}));
            setMessage('');
        }
        setAiSection(null);
    };
    const stale=version!==profile.version;
    const updateContact=(key:ResumeContactKey,value:string)=>{setCv(old=>({...old,[key]:value}));setMessage('');setErrors(old=>({...old,[`document.${key}`]:''}));};
    return <MemberDashboardLayout dashboard={memberShell}><Head title="AI Resume Assistant — PM Circle"/>
        <div className="pm-profile-page">
            <ProfileWorkspaceHeader tab="assistant" memberId={memberShell.member.id} canUseAssistant onTab={tab=>router.visit(`/settings/profile?tab=${tab}`,{preserveScroll:false,replace:true})}/>
            <div className="pm-resume-builder" ref={builderRef}>
            {!previewOnly && <ProfileSectionJump sections={jumpSections} targetPrefix="resume-" label="Résumé sections"/>}
            <div className="pm-resume-builder-notice" role="status"><Info aria-hidden="true"/>{sample?'Demo workspace · Fictional sample data. Changes stay in this browser.':'Private workspace · Review your draft before submitting.'}</div>
            {stale && !sample && <div className="pm-resume-builder-notice" role="alert">Your saved draft predates a profile update. <button type="button" className="pm-button pm-button-outline" onClick={reset}>Reload profile details</button></div>}
            {previewOnly ? <div className="pm-resume-preview-only" id="resume-full-preview"><button type="button" className="pm-button pm-button-outline" onClick={()=>setPreviewOnly(false)}>Back to editor</button>{!sample&&<div className="pm-resume-builder-actions"><button type="button" className="pm-button pm-button-outline" disabled={busy||!!exporting} onClick={()=>exportCurrent('pdf')}>{exporting==='pdf'?'Preparing…':'Print / Save as PDF'}</button><button type="button" className="pm-button pm-button-outline" disabled={busy||!!exporting} onClick={()=>exportCurrent('word')}>{exporting==='word'?'Preparing…':'Download Word résumé'}</button></div>}{exportError&&<p className="pm-error" role="alert">{exportError}</p>}<ResumeDraftPreview data={data} document={cv}/>{profileResumeImportsVisible && <Link href="/settings/profile?tab=imports" className="pm-button pm-button-outline">Manage uploaded résumé</Link>}</div> : <>
                <div className="pm-resume-builder-grid">
                <div className="pm-resume-builder-card pm-resume-editor">
                    <section className="pm-resume-editor-section pm-resume-import-head"><h3><Upload aria-hidden="true"/> Import your résumé</h3><p className="pm-resume-builder-meta">Use a sample CV to test the import and review workflow, or enter your details manually.</p><div className="pm-resume-import-actions"><div className="pm-resume-builder-actions"><input ref={input} type="file" accept=".pdf,.docx" hidden onChange={choose}/><button type="button" className="pm-button pm-button-outline" disabled={busy} onClick={()=>input.current?.click()}><Upload aria-hidden="true"/> Choose PDF or DOCX</button><button type="button" className="pm-button" disabled={busy} onClick={()=>{if(!sample)realDraft.current={fields:data,document:cv};setSample(true);setData({...sampleResume});setCv(sampleDocument());setErrors({});setMessage('');}}>Use sample CV</button><button type="button" className="pm-resume-suggest" disabled={busy} onClick={()=>{if(sample){setData(realDraft.current?.fields??profile.fields);setCv(realDraft.current?.document??profile.document);realDraft.current=null;setSample(false);setErrors({});setMessage('');}document.getElementById('resume-field-name')?.focus();}}>Enter manually <ArrowRight aria-hidden="true"/></button></div><p className="pm-resume-builder-meta">Sample CV data is fictional. Extraction fills your draft without changing your saved profile.</p></div>{errors.upload && <p className="pm-error" role="alert">{errors.upload}</p>}{message.startsWith('Extracted details')&&<p role="status" className="pm-resume-builder-meta">{message}</p>}</section>
                    <EditorSection id="basic" icon={<UserRound aria-hidden="true"/>}><div className="pm-resume-field-grid">{resumeIdentityFields.map(([key])=>field(key,false,key==='email'?'Change your account email in Edit profile.':key==='location'?'City, Country':undefined))}{contactFields.map(([key,label])=><FormField key={key} label={label} htmlFor={`resume-contact-${key}`} error={errors[`document.${key}`]}><input id={`resume-contact-${key}`} className="pm-input" maxLength={255} disabled={busy} value={cv[key]??''} onChange={e=>updateContact(key,e.target.value)}/></FormField>)}</div></EditorSection>
                    <EditorSection id="summary" icon={<FileText aria-hidden="true"/>}>{field('summary',true)}{suggestSummary()}</EditorSection>
                    {resumeSections.map(section=><EditorSection key={section.id} id={section.id} icon={<FileText aria-hidden="true"/>}><ResumeRepeatableSection section={section} rows={cv[section.id]} errors={errors} disabled={busy} suggestionsDisabled={sample} onSuggest={(index,field,label,text)=>setAiSection({kind:'entry',section:section.id,index,field,label,text})} onChange={rows=>{setCv(old=>({...old,[section.id]:rows}));setErrors(old=>Object.fromEntries(Object.entries(old).filter(([key])=>!key.startsWith(`document.${section.id}.`))));setMessage('');}}/></EditorSection>)}
                    <section className="pm-resume-editor-footer pm-profile-editor-actions" aria-label="Résumé draft actions"><div><p className="pm-resume-builder-meta">{sample?'Sample data cannot be submitted.':'Review your draft before submitting.'}</p>{message&&<p role="status" className="pm-resume-builder-meta">{message}</p>}{Object.entries(errors).filter(([key,value])=>value&&key!=='upload').length>0&&<p role="alert" className="pm-error">{Object.values(errors).find(Boolean)}</p>}</div><div className="pm-resume-builder-actions"><button type="button" className="pm-button pm-button-outline" disabled={busy} onClick={()=>router.visit('/settings/profile?tab=overview')}>Cancel</button><button type="button" className="pm-button pm-button-outline" disabled={busy||sample} onClick={()=>save('draft')}>Save draft</button><button type="button" className="pm-button" disabled={busy||sample||stale} onClick={()=>setSubmitConfirm(true)}>{busy?'Saving…':'Submit profile'}</button></div></section>
                </div>
                <aside className="pm-resume-builder-aside" aria-label="Résumé quality and preview" tabIndex={0}>
                    <ResumeQuality data={data} document={cv}/>{features.some(feature=>feature.code==='resume_analyze')&&<button type="button" className="pm-button pm-button-outline" disabled={busy||sample} onClick={()=>setAiSection('analysis')}><Sparkles aria-hidden="true"/> Review résumé with AI</button>}<button type="button" className="pm-button pm-button-outline" onClick={()=>{editorScroll.current=window.scrollY;setExportError('');setPreviewOnly(true);}}>View full résumé</button><ResumeDraftPreview data={data} document={cv}/>
                </aside>
            </div></>}
            </div>
        </div>
        <Dialog open={submitConfirm} onOpenChange={setSubmitConfirm}><DialogContent className="pm-resume-builder-dialog"><DialogHeader><DialogTitle>Submit profile</DialogTitle><DialogDescription>Apply the reviewed résumé to your profile Overview and Edit profile, and save the complete CV privately. Matching entries are updated and new entries added; existing records and verified credentials are preserved. Your existing profile visibility settings apply to the imported fields.</DialogDescription></DialogHeader><div className="pm-resume-builder-actions"><button type="button" className="pm-button pm-button-outline" onClick={()=>setSubmitConfirm(false)}>Cancel</button><button type="button" className="pm-button" disabled={busy||sample||stale} onClick={()=>save('submit')}>Submit profile</button></div></DialogContent></Dialog>
        <Dialog open={!!uploadFile} onOpenChange={open=>{if(!open&&!busy){setUploadFile(null);setExtracted(null);}}}>
            <DialogContent className="pm-resume-builder-dialog pm-resume-upload-dialog" showCloseButton={!busy} onEscapeKeyDown={event=>{if(busy)event.preventDefault();}} onInteractOutside={event=>{if(busy)event.preventDefault();}}>
                <DialogHeader><DialogTitle>{extracted?'Review extracted résumé':'Import your résumé'}</DialogTitle><DialogDescription>{extracted?'Review the information before adding it to your editable draft.':'Extract text from your document directly into the AI Resume Assistant.'}</DialogDescription></DialogHeader>
                <div className="pm-resume-upload-file"><FileText aria-hidden="true"/><div><strong>{uploadFile?.name}</strong><p className="pm-resume-builder-meta">{Math.max(1,Math.ceil((uploadFile?.size??0)/1024))} KB · {uploadFile?.name.split('.').pop()?.toUpperCase()}</p></div></div>
                {busy&&<div className="pm-resume-upload-status" role="status"><LoaderCircle className="animate-spin" aria-hidden="true"/> {useAiExtraction?'Extracting résumé with AI…':'Extracting résumé details…'}</div>}
                {uploadError&&<p role="alert" className="pm-error pm-resume-upload-error">{uploadError}</p>}
                {extracted?<div className="pm-resume-extract-review">
                    <p className="pm-resume-builder-meta">Detected {Object.keys(extracted.fields).length} basic fields and {resumeSections.reduce((total,section)=>total+(extracted.document[section.id]?.length??0),0)} section entries. Existing entries in detected sections will be replaced; other sections are kept.</p>
                    <dl className="pm-resume-extract-summary">{Object.entries(extracted.fields).map(([key,value])=><div key={key}><dt>{labels[key as keyof ResumeFields]??key}</dt><dd>{value}</dd></div>)}{resumeSections.filter(section=>extracted.document[section.id]?.length).map(section=><div key={section.id}><dt>{section.title}</dt><dd>{extracted.document[section.id]?.length} entries</dd></div>)}</dl>
                    {extracted.warnings.map((warning,i)=><p className="pm-resume-builder-meta" key={i}>{warning}</p>)}
                    <details><summary>View extracted source text</summary><pre>{extracted.source_text}</pre></details>
                </div>:<><p className="pm-resume-builder-meta">PDF or DOCX, up to 5 MB. The source file is processed temporarily; your existing saved résumé and profile are unchanged.</p>{aiExtractionEnabled&&<label className="pm-account-check"><input type="checkbox" checked={useAiExtraction} disabled={busy} onChange={e=>{setUseAiExtraction(e.target.checked);setUploadError('');}}/> I consent to sending the extracted résumé text to the configured AI provider for structured extraction.</label>}<p className="pm-resume-builder-meta">{useAiExtraction?'AI extraction uses the configured daily allowance. Review all returned information.':'Local extraction: no AI provider is contacted.'}</p></>}
                <div className="pm-resume-builder-actions pm-resume-dialog-footer"><button type="button" className="pm-button pm-button-outline" disabled={busy} onClick={()=>{setUploadFile(null);setExtracted(null);}}>Cancel</button><button type="button" className="pm-button" disabled={busy} onClick={extracted?applyExtracted:upload}>{busy?'Extracting…':extracted?'Use extracted details':useAiExtraction?'Extract with AI':'Extract résumé'}</button></div>
            </DialogContent>
        </Dialog>
        <Dialog open={aiSection!==null} onOpenChange={open=>{if(!open)setAiSection(null);}}>
            <DialogContent className="pm-resume-builder-dialog">
                <DialogHeader><DialogTitle>{aiSection==='analysis'?'Review résumé with AI':'Suggest with AI'}</DialogTitle><DialogDescription>{aiSection==='analysis'?'Choose your current editable draft or a saved uploaded résumé. Verify the review against your original CV.':`Improve ${aiSection?.label??'this field'}. Review the suggestion before applying it to this field only.`}</DialogDescription></DialogHeader>
                {sample?<p>Return to your own résumé before requesting AI assistance.</p>:aiSection==='analysis'?<ResumeAiReview key="analysis" resumes={resumes} features={features} currentDraft={JSON.stringify({role:data.role,company:data.company,summary:data.summary,experience:cv.experience,education:cv.education,projects:cv.projects,research:cv.research,skills:cv.skills,certifications:cv.certifications,achievements:cv.achievements,languages:cv.languages,interests:cv.interests})}/>:aiSection&&<ResumeAiReview key={aiSection.kind==='summary'?'summary':`${aiSection.section}-${aiSection.index}-${aiSection.field}`} resumes={[]} features={features} draftOnly currentDraft={aiSection.text} initialSection={aiSection.label} onSuggestion={text=>applySuggestion(aiSection,text)}/>}
            </DialogContent>
        </Dialog>
    </MemberDashboardLayout>;
}
