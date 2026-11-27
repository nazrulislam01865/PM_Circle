import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { LegalSectionLinks } from './LegalSectionLinks';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LegalBody, type LegalContent, type LegalSection } from '@/components/pm/LegalContent';

type Props = {
    document: 'terms' | 'privacy';
    draft: LegalContent;
    revision: number;
    publishedVersion: string | null;
    history: { version: string; published_at: string }[];
};
type DraftForm = { revision: number; content: LegalContent };

export default function LegalPage(props: Props) {
    return <LegalEditor key={props.document} {...props}/>;
}

function LegalEditor({ document, draft, revision, publishedVersion, history }: Props) {
    const path = `/admin/legal/${document}`;
    const title = document === 'terms' ? 'Terms and Conditions' : 'Privacy Policy';
    const form = useForm<DraftForm>({ revision, content: draft });
    const { flash, errors } = usePage<{flash?: {status?: string}; errors: Record<string, string>}>().props;
    const [confirmed, setConfirmed] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [preview, setPreview] = useState(false);
    const stale = form.data.revision !== revision;
    const busy = form.processing || publishing;
    const fieldErrors = form.errors as Record<string, string | undefined>;
    const setContent = (content: LegalContent) => {
        if (busy) return;
        form.setData('content', content);
        setConfirmed(false);
    };
    const setSection = (index: number, values: Partial<LegalSection>) => setContent({
        ...form.data.content, sections: form.data.content.sections.map((section, i) => i === index ? {...section, ...values} : section),
    });
    const addSection = () => setContent({
        ...form.data.content, sections:[...form.data.content.sections,{id:`section-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`,title:'',body:''}],
    });
    const move = (index: number, delta: number) => {
        const sections = [...form.data.content.sections];
        const next = index + delta;
        if (next < 0 || next >= sections.length) return;
        [sections[index], sections[next]] = [sections[next], sections[index]];
        setContent({...form.data.content, sections});
    };
    const sync = (page: { props: unknown }) => {
        const latest = page.props as Props;
        const data = {revision: latest.revision, content: latest.draft};
        form.setData(data);
        form.setDefaults(data);
        form.clearErrors();
        setConfirmed(false);
    };
    const metadata: {key: 'title' | 'description' | 'meta_description' | 'toc_title'; label: string; max: number}[] = [
        {key:'title',label:'Page title',max:150},
        {key:'description',label:'Page description',max:500},
        {key:'meta_description',label:'Search description',max:320},
        {key:'toc_title',label:'Contents heading',max:100},
    ];
    return <AdminLayout active={path} title={title} subtitle="Manage the page heading, ordered legal sections and published versions.">
        <Head title={`${title} control | PM Circle Admin`}/>
        <div className="pm-course-admin-heading pm-course-admin-editor-head">
            <Link href="/admin/legal/terms" className="pm-admin-button" aria-current={document === 'terms' ? 'page' : undefined}>Terms and Conditions</Link>
            <Link href="/admin/legal/privacy" className="pm-admin-button" aria-current={document === 'privacy' ? 'page' : undefined}>Privacy Policy</Link>
            <a href={`/${document}`} target="_blank" rel="noopener noreferrer" className="pm-admin-button">View public page</a>
        </div>
        {flash?.status && <p className="pm-admin-notice pm-admin-notice-success" role="status">{flash.status}</p>}
        {(stale || errors?.revision) && <section className="pm-admin-panel pm-course-admin-section" role="alert">
            <p>{errors?.revision || 'A newer revision is available. Reload before saving.'}</p>
            {stale && <button type="button" className="pm-admin-button" onClick={() => {
                if (window.confirm('Discard local changes and load the latest saved draft?')) window.location.reload();
            }}>Reload latest draft</button>}
        </section>}
        <form className="pm-course-admin-editor" onSubmit={event => {
            event.preventDefault();
            form.put(path, {preserveScroll: true, onSuccess: sync});
        }}>
            <section className="pm-admin-panel pm-course-admin-section">
                <h2>Page information</h2>
                <p>Current public version: {publishedVersion ?? 'Not published — original draft preview only'}</p>
                {metadata.map(({key,label,max}) => <label key={key} className="pm-admin-field pm-course-admin-wide">
                    <span>{label}</span>
                    <input disabled={busy} required maxLength={max} value={form.data.content[key]} onChange={event => setContent({...form.data.content,[key]:event.target.value})}/>
                    {fieldErrors[`content.${key}`] && <small className="pm-admin-error" role="alert">{fieldErrors[`content.${key}`]}</small>}
                </label>)}
            </section>
            <section className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-heading pm-course-admin-editor-head">
                    <h2>Sections and order</h2>
                    <button type="button" className="pm-admin-button pm-admin-button-primary" disabled={busy || form.data.content.sections.length>=60} onClick={addSection}><Plus size={16}/> Add section</button>
                </div>
                <p>Add or delete sections here. The contents list follows the section order automatically; each contents link can be shown, hidden or renamed independently.</p>
                <p>Formatting: blank lines separate paragraphs, start a line with “- ” for bullets, use **bold** for emphasis. Manage clickable links using the controls below each section. Raw HTML is displayed as text.</p>
                {fieldErrors['content.sections'] && <p className="pm-admin-error" role="alert">{fieldErrors['content.sections']}</p>}
                <div className="pm-course-admin-editor">
                    {form.data.content.sections.map((section,index) => <section key={section.id} className="pm-admin-panel pm-course-admin-section">
                        <div className="pm-course-admin-heading pm-course-admin-editor-head">
                            <h3>{index+1}. {section.title || 'New section'}</h3>
                            <button type="button" className="pm-admin-button" disabled={busy || index===0} onClick={() => move(index,-1)}><ArrowUp size={16}/> Move up</button>
                            <button type="button" className="pm-admin-button" disabled={busy || index===form.data.content.sections.length-1} onClick={() => move(index,1)}><ArrowDown size={16}/> Move down</button>
                            <button type="button" className="pm-admin-button" disabled={busy || form.data.content.sections.length===1} onClick={() => {
                                if (window.confirm('Remove this section from the draft? Published versions will remain unchanged.')) setContent({...form.data.content, sections:form.data.content.sections.filter((_,i)=>i!==index)});
                            }}><Trash2 size={16}/> Delete section</button>
                        </div>
                        <label className="pm-admin-field pm-course-admin-wide"><span>Section heading</span>
                            <input disabled={busy} required maxLength={180} value={section.title} onChange={event=>setSection(index,{title:event.target.value})}/>
                        </label>
                        <label className="pm-admin-field pm-course-admin-wide"><span>Section content</span>
                            <textarea disabled={busy} required rows={8} maxLength={20000} value={section.body} onChange={event=>setSection(index,{body:event.target.value})}/>
                        </label>
                        <div className="pm-course-admin-repeat-card">
                            <h4>On this page link</h4>
                            <label className="pm-course-admin-publish"><input type="checkbox" checked={section.show_in_toc !== false} disabled={busy} onChange={event=>setSection(index,{show_in_toc:event.target.checked})}/> Show link in contents</label>
                            <label className="pm-admin-field"><span>Contents link label (optional)</span><input disabled={busy || section.show_in_toc === false} maxLength={180} value={section.toc_label ?? ''} placeholder={section.title || 'Same as section heading'} onChange={event=>setSection(index,{toc_label:event.target.value || null})}/></label>
                            <p>Destination: #{section.id} (automatically linked to this section)</p>
                        </div>
                        <LegalSectionLinks body={section.body} disabled={busy} onChange={body=>setSection(index,{body})}/>
                        {['id','title','body','toc_label','show_in_toc'].map(key => fieldErrors[`content.sections.${index}.${key}`] && <p key={key} className="pm-admin-error" role="alert">{fieldErrors[`content.sections.${index}.${key}`]}</p>)}
                    </section>)}
                </div>
                <button type="button" className="pm-admin-button" disabled={busy || form.data.content.sections.length>=60} onClick={addSection}><Plus size={16}/> Add section</button>
                <button type="button" className="pm-admin-button" onClick={()=>setPreview(value=>!value)}>{preview?'Hide preview':'Preview draft'}</button>
                {preview && <div className="pm-terms-page"><article className="pm-terms-article" aria-label="Draft preview">
                    <h2>{form.data.content.title}</h2><p>{form.data.content.description}</p>
                    {form.data.content.sections.some(section=>section.show_in_toc!==false) && <nav className="pm-terms-toc" aria-label={form.data.content.toc_title}><h3>{form.data.content.toc_title}</h3><ul>{form.data.content.sections.filter(section=>section.show_in_toc!==false).map(section=><li key={section.id}><a href={`#preview-${section.id}`}>{section.toc_label || section.title}</a></li>)}</ul></nav>}
                    {form.data.content.sections.map(section=><section className="pm-terms-section" key={section.id} id={`preview-${section.id}`}><h2>{section.title}</h2><LegalBody body={section.body}/></section>)}
                </article></div>}
            </section>
            <div className="pm-course-content-form-actions">
                <button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={busy || stale || !form.isDirty}><Save size={16}/>{form.processing?'Saving…':'Save draft'}</button>
            </div>
        </form>
        <section className="pm-admin-panel pm-course-admin-section">
            <h2>Publish saved draft</h2>
            <p>Publishing creates a permanent version and makes it public immediately. Both documents must have a published version before production registration is available. Review all wording and links before approval.</p>
            <label className="pm-course-admin-publish"><input type="checkbox" checked={confirmed} disabled={busy || stale || form.isDirty} onChange={event=>setConfirmed(event.target.checked)}/> I confirm the saved legal content is approved for publication.</label>
            {errors?.confirmed && <p className="pm-admin-error" role="alert">{errors.confirmed}</p>}
            <button type="button" className="pm-admin-button pm-admin-button-primary" disabled={busy || stale || form.isDirty || !confirmed} onClick={()=>{
                router.post(`${path}/publish`, {revision:form.data.revision,confirmed}, {preserveScroll:true,onStart:()=>setPublishing(true),onFinish:()=>setPublishing(false),onSuccess:sync});
            }}>{publishing?'Publishing…':'Publish new version'}</button>
        </section>
        <section className="pm-admin-panel pm-course-admin-section">
            <h2>Publication history</h2>
            <p>Latest 30 versions. Published content is immutable; older version links remain available.</p>
            {history.length===0?<p>No published versions yet.</p>:history.map(item=><p key={item.version}>
                <a href={`/${document}?version=${item.version}`} target="_blank" rel="noopener noreferrer">{item.version}</a> · {item.published_at}{item.version===publishedVersion?' · Current':''}
            </p>)}
        </section>
    </AdminLayout>;
}
