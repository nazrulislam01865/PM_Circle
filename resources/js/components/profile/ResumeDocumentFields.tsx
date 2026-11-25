import { FormField } from '@/components/pm/FormField';
import { Plus, Trash2 } from 'lucide-react';

export const resumeSections = [
    { id: 'education', title: 'Education', fields: [['title','Institution'],['location','Location'],['subtitle','Degree or qualification'],['period','Study period'],['description','Highlights'],['courses','Courses']] },
    { id: 'experience', title: 'Work Experience', fields: [['title','Company'],['location','Location'],['subtitle','Job title'],['period','Employment period'],['description','Responsibilities and achievements'],['technical','Technical skills'],['soft','Soft skills']] },
    { id: 'research', title: 'Research Work', fields: [['title','Research title'],['location','Location'],['subtitle','Role / research team'],['period','Research period'],['description','Research details'],['technical','Technical skills'],['soft','Soft skills']] },
    { id: 'projects', title: 'Projects', fields: [['title','Project title'],['location','Location'],['subtitle','University / organisation'],['period','Project period'],['description','Project details'],['technical','Technical skills'],['soft','Soft skills'],['team','Team members']] },
    { id: 'skills', title: 'Skills', fields: [['title','Skill category'],['description','Skills']] },
    { id: 'achievements', title: 'Achievements', fields: [['period','Year'],['title','Achievement'],['subtitle','Awarding organisation']] },
    { id: 'interests', title: 'Interests', fields: [['title','Interest'],['description','Details']] },
    { id: 'languages', title: 'Languages', fields: [['title','Language'],['description','Proficiency']] },
    { id: 'certifications', title: 'Certifications', fields: [['title','Certification'],['subtitle','Issuer'],['period','Date / validity'],['description','Details']] },
] as const;
export type ResumeSectionId = typeof resumeSections[number]['id'];
export type ResumeEntry = Partial<Record<'title'|'location'|'subtitle'|'period'|'description'|'courses'|'technical'|'soft'|'team', string | null>>;
export type ResumeContactKey = 'headline'|'phone'|'portfolio'|'github'|'linkedin';
export type ResumeDocument = Record<ResumeContactKey,string|null> & Record<ResumeSectionId,ResumeEntry[]>;
export const contactFields = [['headline','Professional headline'],['phone','Phone'],['portfolio','Portfolio URL or label'],['github','GitHub username or URL'],['linkedin','LinkedIn username or URL']] as const;
export function emptyDocument(): ResumeDocument {
    return {headline:'',phone:'',portfolio:'',github:'',linkedin:'',education:[],experience:[],research:[],projects:[],skills:[],achievements:[],interests:[],languages:[],certifications:[]};
}
export function sampleDocument(): ResumeDocument {
    return {...emptyDocument(), headline:'Project Coordinator', education:[{title:'Example University',subtitle:'Bachelor of Business Administration',period:'2018 – 2022'}],experience:[{title:'Meghna Digital Services',subtitle:'Project Coordinator',location:'Dhaka, Bangladesh',period:'2023 – Present',description:'Maintain delivery schedules and issue logs.\nPrepare weekly status updates.'}],skills:[{title:'Professional skills',description:'Project coordination, reporting'}]};
}
export function ResumeRepeatableSection({ section, rows, onChange, errors, disabled }: {section: typeof resumeSections[number]; rows: ResumeEntry[]; onChange:(rows:ResumeEntry[])=>void; errors:Record<string,string>; disabled:boolean}) {
    return <>
        {rows.map((row,index)=><div key={index} className="pm-resume-entry-editor">
            <div className="pm-resume-builder-row"><strong>{section.title} {index+1}</strong><button type="button" className="pm-resume-suggest" disabled={disabled} onClick={()=>onChange(rows.filter((_,i)=>i!==index))} aria-label={`Remove ${section.title} entry ${index+1}`}><Trash2 aria-hidden="true"/> Remove</button></div>
            <div className="pm-resume-field-grid">{section.fields.map(([key,label])=>{
                const id=`resume-${section.id}-${index}-${key}`; const error=errors[`document.${section.id}.${index}.${key}`]; const multiline=key==='description'||key==='courses';
                const update=(value:string)=>onChange(rows.map((item,i)=>i===index?{...item,[key]:value}:item));
                return <div className={multiline?'pm-resume-field-wide':undefined} key={key}><FormField label={label} htmlFor={id} error={error}>{multiline?<textarea id={id} className="pm-textarea" rows={3} maxLength={4000} disabled={disabled} value={row[key]??''} aria-invalid={!!error} onChange={e=>update(e.target.value)}/>:<input id={id} className="pm-input" maxLength={255} disabled={disabled} value={row[key]??''} aria-invalid={!!error} onChange={e=>update(e.target.value)}/>}</FormField></div>;
            })}</div>
        </div>)}
        <button type="button" className="pm-button pm-button-outline pm-resume-add" disabled={disabled||rows.length>=20} onClick={()=>onChange([...rows,{}])}><Plus aria-hidden="true"/> Add {section.title === 'Work Experience' ? 'experience' : section.title.toLowerCase()} entry</button>
    </>;
}
