import { memo, useLayoutEffect, useRef, useState, useMemo, type ReactNode } from 'react';
import { FileText, Sparkles, Phone, Mail, House, Github, Linkedin } from 'lucide-react';
import { resumeSections, type ResumeDocument } from './ResumeDocumentFields';
import { qualityChecks } from './resumeQuality';
import { ProgressBar } from '@/components/pm/ProgressBar';

export type ResumeFields = Record<'name' | 'email' | 'role' | 'company' | 'location' | 'summary' | 'period' | 'responsibilities' | 'skills' | 'degree' | 'institution' | 'certification', string>;
export type ResumeExtra = { primaryExperience?: { role: string; company: string } | null; primaryEducationYear?: string | null; experiences: { role: string; company: string; period: string; responsibilities: string | null }[]; educations: { degree: string; institution: string; year?: string | null }[]; certifications: string[] };
export const emptyExtra: ResumeExtra = { experiences: [], educations: [], certifications: [] };
export const sampleResume: ResumeFields = { name: 'Samira Rahman', email: 'samira.rahman@example.com', role: 'Project Coordinator', company: 'Meghna Digital Services', location: 'Dhaka, Bangladesh', summary: 'Project coordinator supporting project planning, reporting and stakeholder communication.', period: '2023-01 – Present', responsibilities: 'Maintain delivery schedules and issue logs. Prepare weekly project status updates and coordinate stakeholder meetings.', skills: 'Project coordination\nStakeholder communication\nReporting', degree: 'Bachelor of Business Administration', institution: 'Example University', certification: 'Project management fundamentals' };

export const ResumeQuality = memo(function ResumeQuality({ data, document }: { data: ResumeFields; document: ResumeDocument }) {
    const checks = qualityChecks(data, document);
    const score = checks.reduce((total, check) => total + check.points, 0);
    return <section className="pm-resume-builder-card pm-resume-quality" aria-labelledby="resume-quality-title">
        <div className="pm-resume-builder-row"><h3 id="resume-quality-title"><Sparkles aria-hidden="true"/> Résumé quality</h3><strong className="pm-resume-quality-score">{score}/10</strong></div>
        <ProgressBar value={score} max={10} label="Résumé completeness"/>
        <p className="pm-resume-builder-meta">{checks.find(check => !check.points)?.tip ?? 'All ten template completeness checks are satisfied.'}</p>
        <details><summary>How the score is calculated</summary><p className="pm-resume-builder-meta">Each satisfied check earns one point. Optional sections do not reduce the score when omitted. This is a template completeness assessment, not an AI or ATS score.</p><ul>{checks.map(check => <li key={check.label}>{check.label}: {check.points}</li>)}</ul></details>
    </section>;
});

type PaperBlock = { content: ReactNode; keepNext?: boolean };
function buildBlocks(data: ResumeFields, document: ResumeDocument): PaperBlock[] {
    const blocks: PaperBlock[] = [{content:<header className="pm-resume-paper-header"><h2>{data.name || 'Your name'}</h2>{(document.headline || data.role) && <strong>{document.headline || data.role}</strong>}{data.location && <p>{data.location}</p>}<div className="pm-cv-contact">{([[Phone,document.phone],[Mail,data.email],[House,document.portfolio],[Github,document.github],[Linkedin,document.linkedin]] as const).map(([ContactIcon,value],i)=>value?<span key={i}><ContactIcon aria-hidden="true"/>{String(value)}</span>:null)}</div></header>}];
    const heading=(title:string)=>blocks.push({content:<h3>{title}</h3>,keepNext:true});
    const text=(value:string|null|undefined,label?:string,bullet=false)=>{if(value?.trim()) for(const line of value.split(/\n/).map(v=>v.trim()).filter(Boolean)) blocks.push({content:bullet?<p className="pm-cv-bullet">{label&&<b>{label}: </b>}{line.replace(/^[•\-]\s*/, '')}</p>:<p>{label&&<b>{label}: </b>}{line}</p>});};
    if(data.summary.trim()){heading('Personal Profile');text(data.summary);}
    for(const section of resumeSections){
        const rows=document[section.id].filter(row=>Object.values(row).some(v=>v?.trim()));
        if(!rows.length)continue;
        heading(section.title);
        for(const row of rows){
            if(['skills','interests','languages'].includes(section.id)){
                blocks.push({content:<div className="pm-cv-label-row"><strong>{row.title}</strong><p>{row.description}</p></div>});continue;
            }
            if(section.id==='achievements'){
                blocks.push({content:<div className="pm-cv-achievement"><span>{row.period}</span><p>{row.title}</p><span>{row.subtitle}</span></div>});continue;
            }
            const hasDetails=Boolean([row.description,row.courses,row.technical,row.soft,row.team].some(value=>value?.trim()));
            blocks.push({content:<div className="pm-resume-paper-entry"><strong>{row.title}</strong>{row.location&&<em>{row.location}</em>}{row.subtitle&&<p>{row.subtitle}</p>}{row.period&&<em>{row.period}</em>}</div>,keepNext:hasDetails});
            text(row.description,undefined,true);text(row.courses,'Courses',true);text(row.technical,'Technical Skills',true);text(row.soft,'Soft Skills',true);text(row.team,'Team Members',true);
        }
    }
    return blocks;
}

export const ResumeDraftPreview = memo(function ResumeDraftPreview({ data, document }: { data: ResumeFields; document: ResumeDocument }) {
    const measure = useRef<HTMLDivElement>(null);
    const [pages,setPages]=useState<number[][]>([]);
    const blocks=useMemo(()=>buildBlocks(data,document),[data,document]);
    useLayoutEffect(()=>{
        const node=measure.current;if(!node)return;
        const layout=()=>{
            const children=Array.from(node.children) as HTMLElement[];
            const width=node.getBoundingClientRect().width;
            if(!width)return;
            // A4 ratio minus top/bottom paper margins and footer space.
            const available=width*(297/210-.12)/.89;
            const heights=children.map(child=>child.getBoundingClientRect().height);
            const result:number[][]=[[]];let used=0;
            heights.forEach((height,i)=>{
                let next=height;let j=i;while(blocks[j]?.keepNext&&j+1<heights.length)next+=heights[++j];
                if(result[result.length-1].length&&used+next>available){result.push([]);used=0;}
                result[result.length-1].push(i);used+=height;
            });
            setPages(old=>JSON.stringify(old)===JSON.stringify(result)?old:result);
        };
        layout();const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(layout):null;observer?.observe(node);
        let active=true;window.document.fonts?.ready.then(()=>{if(active)layout();});
        return()=>{active=false;observer?.disconnect();};
    },[blocks]);
    const visiblePages=pages.length&&pages.flat().length===blocks.length?pages:[blocks.map((_,i)=>i)];
    return <section className="pm-resume-builder-card pm-resume-preview-card" aria-labelledby="resume-preview-title">
        <header className="pm-resume-builder-row"><h3 id="resume-preview-title"><FileText aria-hidden="true"/> Live A4 preview</h3><span className="pm-resume-builder-meta">{visiblePages.length} {visiblePages.length===1?'page':'pages'}</span></header>
        <div className="pm-resume-paper-frame"><div className="pm-cv-measure pm-resume-paper" aria-hidden="true"><div ref={measure}>{blocks.map((block,i)=><div className="pm-cv-block" key={i}>{block.content}</div>)}</div></div>
        {visiblePages.map((page,index)=><article className="pm-resume-paper" key={index} aria-label={`Résumé page ${index+1}`}><div className="pm-cv-page-content">{page.map(i=><div className="pm-cv-block" key={i}>{blocks[i]?.content}</div>)}</div><footer className="pm-cv-footer"><span>{new Intl.DateTimeFormat('en',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date()).toUpperCase()}</span><span>{index+1}</span></footer></article>)}
        </div>
    </section>;
});
