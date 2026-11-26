import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Save } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { ContentField, FeaturedSelector, HomepageImageUploader, RepeatableItems, type EditorField, type EditorOptions } from '@/components/admin/HomepageFields';
import { homepageSections, type HomepageSection, type HomepageSectionVisibility } from '@/components/admin/homepage-sections';
import type { HomepagePresentation } from '@/types/homepage-presentation';
import { referencePhotos } from '@/components/home/v2/reference';

type Props = { configured: boolean; content: HomepagePresentation; defaults: HomepagePresentation; version: number; selectedSection: HomepageSection; options: { scenarios: EditorOptions; members: EditorOptions } };
const labels: Record<string, string> = { heading: 'Section heading', href: 'Destination', image: 'Custom image', photo: 'Default photo', primary: 'Primary button label', secondary: 'Secondary button label', primary_url: 'Primary button destination', secondary_url: 'Secondary button destination', button_url: 'Button destination', read_url: 'Read destination (optional)', featured_id: 'Featured scenario', featured_ids: 'Featured members', limit: 'Maximum items displayed', card_button: 'Card button label', flow_heading: 'Workflow heading', note: 'Offer / supporting note', tab: 'Slide tab label', button: 'Card button label', label: 'Label', read_label: 'Read button label' };
const label = (key: string) => labels[key] || key.charAt(0).toUpperCase() + key.slice(1).replaceAll('_', ' ');
const photos = Object.keys(referencePhotos).map(value => ({value, label: label(value.replaceAll('-', ' '))}));
const destinations = ['/', '/learning', '/exam-simulator/pmp', '/simulators/scrum', '/simulators/project', '/simulators/business-analysis', '/simulators/capm', '/simulators/pmi-acp', '/daily-challenge', '/community', '/members', '/pricing', '/ai-resume-assistant', '/pm-trends', '/events', '/register', '/interview-preparation'].map(value => ({value, label:value}));
const isRoute = (field: string) => field === 'href' || field.endsWith('_url');
const iconChoices = (section: HomepageSection) => (section === 'resume' ? ['upload','edit','report','save'] : ['practice','scrum','learn']).map(value => ({value,label:label(value)}));
function fieldKind(field: string): EditorField['kind'] {
    if (field === 'image') return 'image';
    if (field === 'icon' || field === 'photo') return 'select';
    if (isRoute(field)) return 'route';
    if (['description','empty_message','note'].includes(field)) return 'textarea';
    return undefined;
}
function editorField(field: string, section: HomepageSection): EditorField {
    return {key:field,label:label(field),kind:fieldKind(field),imageVariant:section==='skills'?'icon':'portrait',choices:field === 'photo' ? photos : field === 'icon' ? iconChoices(section) : isRoute(field) ? destinations : undefined};
}
const owners: Partial<Record<HomepageSection, {text:string; href:string}>> = {
    courses:{text:'Course titles, images, levels and publication are managed in Courses.',href:'/admin/learning/courses'},
    events:{text:'Event details, dates and publication are managed in Events.',href:'/admin/events'},
    scenario:{text:'Daily Challenge publishing takes priority over the optional featured scenario.',href:'/admin/ai/daily-challenge'},
};
export default function Homepage({ configured, content, defaults, version, options, selectedSection }: Props) {
    const [selected, setSelected] = useState(selectedSection);
    const activeSection = useRef(selectedSection);
    const [draft, setDraft] = useState<Record<string, unknown>>(() => structuredClone(content[selectedSection]));
    const [dirty, setDirty] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { activeSection.current = selectedSection; setSelected(selectedSection); setDraft(structuredClone(content[selectedSection])); setDirty(false); }, [version, selectedSection]);
    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => {event.preventDefault(); event.returnValue = '';};
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);
    function update(key: string, value: unknown) { if (activeSection.current !== selected) return; setDraft(previous => ({...previous,[key]:value})); setDirty(true); setSaved(false); }
    function select(next: HomepageSection) {
        if (processing || uploading || next === selected || (dirty && !window.confirm('Discard unsaved changes in this section?'))) return;
        activeSection.current = next; setSelected(next); setDraft(structuredClone(content[next])); setErrors({}); setDirty(false); setSaved(false);
    }
    function save() {
        if (!dirty || processing || uploading) return;
        setProcessing(true); setErrors({});
        router.put(`/admin/homepage?section=${selected}`, {section:selected,content:draft as HomepagePresentation[HomepageSection],version}, {
            preserveScroll:true, onSuccess:()=>{setSaved(true);setDirty(false);}, onError:invalid=>{setErrors(invalid);setSaved(false);}, onFinish:()=>setProcessing(false),
        });
    }
    const index = homepageSections.findIndex(section=>section.key===selected);
    const current = homepageSections[index];
    const visibility = Object.fromEntries(homepageSections.map(section=>[section.key, section.key===selected ? draft.enabled : content[section.key].enabled])) as HomepageSectionVisibility;
    const shape = defaults[selected] as Record<string, unknown>;
    const fields = Object.entries(shape).filter(([key])=>key!=='enabled');
    const owner = owners[selected];
    return <AdminLayout title="Homepage control" subtitle="Manage the current public homepage, section by section. Each save updates only the selected section." active="/admin/homepage" selectedHomeSection={selected} homepageVisibility={visibility} onSelectHomeSection={select}>
        {!configured ? <div className="pm-admin-panel pm-admin-alert-panel"><AlertCircle size={22}/><div><h2>Homepage content has not been initialized</h2><p>Run <code>php artisan db:seed --class=HomePageContentSeeder</code> once, then reload.</p></div></div> : <>
            <div className="pm-admin-editor-toolbar pm-admin-panel"><div><span className="pm-admin-kicker">PUBLIC WEBSITE · SECTION {index+1} OF {homepageSections.length}</span><strong>{current.name}</strong><small>{dirty ? 'Unsaved changes' : current.detail}</small></div><div className="pm-admin-editor-actions"><Link href="/" target="_blank" className="pm-admin-button pm-admin-button-quiet">View homepage <ExternalLink size={16}/></Link><button type="button" className="pm-admin-button pm-admin-button-primary" onClick={save} disabled={processing || uploading || !dirty}><Save size={17}/>{processing?'Saving…':uploading?'Uploading…':'Save changes'}</button></div></div>
            {saved && <div className="pm-admin-notice pm-admin-notice-success" role="status"><CheckCircle2 size={18}/> Section saved. Changes are live on the homepage.</div>}
            {Object.keys(errors).length>0 && <div className="pm-admin-notice pm-admin-notice-error" role="alert"><AlertCircle size={18}/>{Object.values(errors)[0]}</div>}
            <div className="pm-admin-notice"><span>Shared controls: <Link href="/admin/navigation">Navigation</Link> · <Link href="/admin/footer">Footer control</Link> · <Link href="/admin/profile-rewards">Profile reward offer</Link></span></div>
            <section className="pm-admin-panel pm-admin-editor-main pm-admin-home-editor" aria-label={`${current.name} editor`}>
                <div className="pm-admin-visibility"><div><strong>Show this section on the homepage</strong><small>Hide without deleting its content.</small></div><label className="pm-admin-switch"><input type="checkbox" checked={Boolean(draft.enabled)} disabled={processing || uploading} onChange={event=>update('enabled',event.target.checked)}/><span>{draft.enabled?'Visible':'Hidden'}</span></label></div>
                <div className="pm-admin-editor-section"><div className="pm-admin-section-heading"><h2>{current.name}</h2><p>{current.detail}</p>{owner && <p>{owner.text} <Link href={owner.href}>Open management</Link></p>}{selected==='community' && <p>Only published public posts appear, newest first. Manage posts in the community module.</p>}{selected==='members' && <p>Only eligible public member profiles appear. Select up to two or leave blank for the latest members.</p>}{selected==='community_intro' && <p>Controls the heading above the community panels. Panels have their own visibility settings.</p>}{selected==='events' && <p>Hiding this section does not disable the Events module or navigation.</p>}</div>
                <fieldset className="pm-admin-form-content pm-admin-homepage-fields" disabled={processing || uploading}>{fields.map(([key, defaultValue])=>{
                    const value=draft[key]; const error=errors[`content.${key}`];
                    if(key==='featured_id' || key==='featured_ids') return <FeaturedSelector key={key} label={label(key)} hint={key==='featured_id'?'Choose one published scenario, or leave blank for the latest.':'Select up to two public members.'} options={key==='featured_id'?options.scenarios:options.members} selected={key==='featured_id'?(value?[Number(value)]:[]):(value as number[])} max={key==='featured_id'?1:2} onChange={ids=>update(key,key==='featured_id'?ids[0]??null:ids)} error={error}/>;
                    if(Array.isArray(defaultValue)) return <RepeatableItems key={`${selected}-${key}`} title={label(key)} path={`content.${key}`} rows={(value ?? []) as Record<string,unknown>[]} fields={Object.keys(defaultValue[0]).map(field=>editorField(field,selected))} min={1} max={key==='slides'?6:12} collapsible onUploadBusy={setUploading} errors={errors} onChange={items=>update(key,items)}/>;
                    if(key==='image') return <div key={key} className="pm-admin-field"><span className="pm-admin-field-label">Custom image (optional)</span><HomepageImageUploader onBusyChange={setUploading} value={String(value??'')} onChange={next=>update(key,next)} fallbackImage={draft.photo?`/images/home/prototype/${referencePhotos[draft.photo as keyof typeof referencePhotos]}`:undefined}/>{error && <span className="pm-admin-error">{error}</span>}</div>;
                    if(typeof defaultValue==='number') return <ContentField key={key} label={label(key)} id={`homepage-${key}`} type="select" choices={Array.from({length:selected==='courses'?12:6},(_,i)=>({value:String(i+1),label:String(i+1)}))} value={String(value)} onChange={next=>update(key,Number(next))} error={error}/>;
                    const f=editorField(key,selected); return <ContentField key={key} id={`homepage-${key}`} label={f.label} type={f.kind==='select'?'select':f.kind==='route'?'route':f.kind==='textarea'?'textarea':'text'} choices={f.choices} value={String(value??'')} onChange={next=>update(key,next)} error={error}/>;
                })}</fieldset></div>
            </section>
            <div className="pm-admin-editor-bottom"><div className="pm-admin-section-navigation"><button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={index===0 || processing || uploading} onClick={()=>select(homepageSections[index-1].key)}><ChevronLeft size={16}/> Previous</button><span>{index+1} / {homepageSections.length}</span><button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={index===homepageSections.length-1 || processing || uploading} onClick={()=>select(homepageSections[index+1].key)}>Next section <ChevronRight size={16}/></button></div><button type="button" className="pm-admin-button pm-admin-button-primary" disabled={!dirty || processing || uploading} onClick={save}><Save size={16}/> Save changes</button></div>
        </>}
    </AdminLayout>;
}
