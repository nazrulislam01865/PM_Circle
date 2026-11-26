import { FormField } from '@/components/pm/FormField';
import { Plus, Sparkles, Trash2 } from 'lucide-react';

import { resumeSections, resumeRewriteLabel, type ResumeLongField, type ResumeEntry, type ResumeDocument } from './resumeFieldSchema';
export { resumeSections, contactFields, resumeBasicFields, resumeIdentityFields, resumeSectionNavigation, type ResumeSectionId, type ResumeEntry, type ResumeDocument, type ResumeContactKey } from './resumeFieldSchema';
export function emptyDocument(): ResumeDocument {
    return {headline:'',phone:'',portfolio:'',github:'',linkedin:'',education:[],experience:[],research:[],projects:[],skills:[],achievements:[],interests:[],languages:[],certifications:[]};
}
export function sampleDocument(): ResumeDocument {
    return {...emptyDocument(), headline:'Project Coordinator', education:[{title:'Example University',subtitle:'Bachelor of Business Administration',period:'2018 – 2022'}],experience:[{title:'Meghna Digital Services',subtitle:'Project Coordinator',location:'Dhaka, Bangladesh',period:'2023 – Present',description:'Maintain delivery schedules and issue logs.\nPrepare weekly status updates.'}],skills:[{title:'Professional skills',description:'Project coordination, reporting'}]};
}
export function ResumeRepeatableSection({ section, rows, onChange, errors, disabled, onSuggest, suggestionsDisabled = false }: {section: typeof resumeSections[number]; rows: ResumeEntry[]; onChange:(rows:ResumeEntry[])=>void; errors:Record<string,string>; disabled:boolean; suggestionsDisabled?: boolean; onSuggest?: (index: number, field: ResumeLongField, label: string, text: string) => void}) {
    return <>
        {rows.map((row,index)=><div key={index} className="pm-resume-entry-editor">
            <div className="pm-resume-builder-row"><strong>{section.title} {index+1}</strong><button type="button" className="pm-resume-suggest" disabled={disabled} onClick={()=>onChange(rows.filter((_,i)=>i!==index))} aria-label={`Remove ${section.title} entry ${index+1}`}><Trash2 aria-hidden="true"/> Remove</button></div>
            <div className="pm-resume-field-grid">{section.fields.map(([key,label])=>{
                const id=`resume-${section.id}-${index}-${key}`; const error=errors[`document.${section.id}.${index}.${key}`]; const multiline=key==='description'||key==='courses';
                const rewriteLabel = multiline ? resumeRewriteLabel(section.id, key as ResumeLongField) : undefined;
                const update=(value:string)=>onChange(rows.map((item,i)=>i===index?{...item,[key]:value}:item));
                return <div className={multiline?'pm-resume-field-wide':undefined} key={key}><FormField label={label} htmlFor={id} error={error}>{multiline?<textarea id={id} className="pm-textarea" rows={3} maxLength={4000} disabled={disabled} value={row[key]??''} aria-invalid={!!error} onChange={e=>update(e.target.value)}/>:<input id={id} className="pm-input" maxLength={255} disabled={disabled} value={row[key]??''} aria-invalid={!!error} onChange={e=>update(e.target.value)}/>}</FormField>{multiline && rewriteLabel && onSuggest && <button type="button" className="pm-resume-suggest" aria-label={`Suggest with AI for ${label}, ${section.title} entry ${index+1}`} disabled={disabled || suggestionsDisabled || (row[key]??'').trim().length < 2} title={(row[key]??'').trim().length < 2 ? 'Enter your own details before requesting a suggestion.' : undefined} onClick={()=>onSuggest(index, key as ResumeLongField, rewriteLabel, row[key]??'')}><Sparkles aria-hidden="true"/> Suggest with AI</button>}</div>;
            })}</div>
        </div>)}
        <button type="button" className="pm-button pm-button-outline pm-resume-add" disabled={disabled||rows.length>=20} onClick={()=>onChange([...rows,{}])}><Plus aria-hidden="true"/> Add {section.title === 'Work Experience' ? 'experience' : section.title.toLowerCase()} entry</button>
    </>;
}
