import { Link, router } from '@inertiajs/react';
import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, ExternalLink, Save, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { ContentField, FeaturedSelector, HomepageImageUploader, RepeatableItems, EditableStringList, type EditorField, type EditorOptions } from '@/components/admin/HomepageFields';
import type { HomeContent } from '@/types/home';
import { homepageSections, type HomepageSection as Section } from '@/components/admin/homepage-sections';

type EditorContent = HomeContent & { sections: Record<Section, boolean> };
type SelectOption = { value: string; label: string };
type Props = { configured: boolean; content: EditorContent | null; version: number; selectedSection?: Section; masterOptions: Record<string, SelectOption[]>; options: {
    scenarios: EditorOptions; posts: EditorOptions; members: EditorOptions;
} };
function getValue(obj: object, path: string): unknown {
    return path.split('.').reduce<unknown>((value, name) => value && typeof value === 'object' ? (value as Record<string, unknown>)[name] : undefined, obj);
}

export default function Homepage({ configured, content, version, options, masterOptions, selectedSection = 'hero' }: Props) {
    const [data, setData] = useState<EditorContent | null>(content);
    const [selected, setSelected] = useState<Section>(selectedSection);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => { setData(content); setDirty(false); }, [version, content]);
    useEffect(() => {
        if (!dirty) return;
        const warnOnExit = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warnOnExit);
        return () => window.removeEventListener('beforeunload', warnOnExit);
    }, [dirty]);
    function update(path: string, value: unknown) {
        setSaved(false); setDirty(true);
        setData(previous => {
            if (!previous) return previous;
            const next = structuredClone(previous);
            const segments = path.split('.');
            let obj: Record<string, unknown> = next as unknown as Record<string, unknown>;
            for (const segment of segments.slice(0, -1)) {
                if (!obj[segment] || typeof obj[segment] !== 'object') obj[segment] = {};
                obj = obj[segment] as Record<string, unknown>;
            }
            obj[segments[segments.length - 1]] = value;
            return next;
        });
    }
    const choices = (category: string): SelectOption[] => masterOptions[category] ?? [];
    const requiredCategories = ['hero_primary_url', 'hero_secondary_url', 'pathway_step_icon', 'pathway_exam_icon', 'skills_url', 'skills_icon', 'careers_feature_url', 'careers_feature_icon', 'careers_opportunity_icon', 'careers_location', 'careers_type'];
    const missingMasterData = requiredCategories.some(category => choices(category).length === 0);
    function text(path: string, label: string, kind: 'text' | 'textarea' | 'select' = 'text', choices?: { value: string; label: string }[], hint?: string) {
        return <ContentField key={path} id={`content-${path.replace(/[^a-zA-Z0-9]/g, '-')}`} label={label} value={String(data ? getValue(data, path) ?? '' : '')} type={kind}
            onChange={value => update(path, value)} choices={choices} hint={hint} error={errors[`content.${path}`]}/>;
    }
    function list(path: string, title: string, fields: EditorField[], max = 10) {
        const raw = data ? getValue(data, path) : undefined;
        return <RepeatableItems title={title} path={`content.${path}`} rows={Array.isArray(raw) ? raw : []} fields={fields}
            max={max} errors={errors} onChange={items => update(path, items)}/>;
    }
    function save() {
        if (!data || processing || missingMasterData) return;
        setProcessing(true); setErrors({});
        router.put(`/admin/homepage?section=${selected}`, { content: data, version }, {
            preserveScroll: true,
            onSuccess: () => { setSaved(true); setDirty(false); },
            onError: (invalid) => { setErrors(invalid); setSaved(false); },
            onFinish: () => setProcessing(false),
        });
    }
    const frame = (heading: string, detail: string, children: ReactNode) => <div className="pm-admin-editor-section">
        <div className="pm-admin-section-heading"><h2>{heading}</h2><p>{detail}</p></div>
        <div className="pm-admin-form-content">{children}</div>
    </div>;
    return <AdminLayout title="Homepage control" subtitle="Edit each section independently. Only saved changes are visible on the public homepage." active="/admin/homepage" selectedHomeSection={selected} homepageVisibility={data?.sections} onSelectHomeSection={setSelected}>
        {!configured || !data ? <div className="pm-admin-panel pm-admin-alert-panel"><AlertCircle size={22}/><div><h2>Homepage content has not been initialized</h2>
            <p>Run <code>php artisan db:seed --class=HomePageContentSeeder</code> once, then reload this page. No public content has been modified.</p></div></div> : <>
            <div className="pm-admin-editor-toolbar pm-admin-panel">
                <div><span className="pm-admin-kicker">PUBLIC WEBSITE</span><strong>Homepage sections</strong>
                    <small>{dirty ? 'Unsaved changes' : 'All current edits saved'}</small></div>
                <div className="pm-admin-editor-actions"><Link href="/" target="_blank" className="pm-admin-button pm-admin-button-quiet">View homepage <ExternalLink size={16}/></Link>
                    <button type="button" className="pm-admin-button pm-admin-button-primary" onClick={save} disabled={processing || !dirty || missingMasterData}><Save size={17}/>{processing ? 'Saving…' : 'Save changes'}</button></div>
            </div>
            {missingMasterData && <div className="pm-admin-notice pm-admin-notice-error" role="alert"><AlertCircle size={18}/><span>Homepage editor choices are incomplete. Run the <code>HomepageMasterDataSeeder</code> and check <Link href="/admin/master-data">Master data</Link> and <Link href="/admin/navigation">Navigation control</Link> before saving.</span></div>}
            {saved && <div className="pm-admin-notice pm-admin-notice-success" role="status"><CheckCircle2 size={18}/> Homepage saved. Changes are live on the public page.</div>}
            {errors.version && <div className="pm-admin-notice pm-admin-notice-error" role="alert"><AlertCircle size={18}/>{errors.version}</div>}
            {Object.keys(errors).length > 0 && !errors.version && <div className="pm-admin-notice pm-admin-notice-error" role="alert"><AlertCircle size={18}/> Please review the highlighted fields. {Object.values(errors)[0]}</div>}
            <section className="pm-admin-panel pm-admin-editor-main" aria-label={`${homepageSections.find(section => section.key === selected)?.name ?? 'Homepage'} editor`}>
                <div className="pm-admin-visibility"><div><strong>Show this section on the homepage</strong><small>Hide without deleting any text or cards.</small></div>
                    <label className="pm-admin-switch"><input type="checkbox" checked={data.sections[selected]} onChange={event => update(`sections.${selected}`, event.target.checked)}/><span>{data.sections[selected] ? 'Visible' : 'Hidden'}</span></label>
                </div>
                {selected === 'hero' && frame('Hero & portraits', 'Control the main welcome message, actions and portrait images.', <>
                    <div className="pm-admin-field-grid">{text('hero.eyebrow', 'Eyebrow')}{text('hero.title', 'Headline')}
                        {text('hero.description', 'Description', 'textarea')}{text('hero.primary_label', 'Primary button label')}
                        {text('hero.primary_url', 'Primary button destination', 'select', choices('hero_primary_url'))}
                        {text('hero.secondary_label', 'Secondary button label')}{text('hero.secondary_url', 'Secondary button destination', 'select', choices('hero_secondary_url'))}
                        {text('hero.caption_learn', 'Orbit learning caption', 'textarea')}{text('hero.caption_discuss', 'Orbit community caption', 'textarea')}{text('hero.caption_career', 'Orbit career caption', 'textarea')}</div>
                    <div className="pm-admin-repeater"><div className="pm-admin-list-heading"><h3>Hero portraits</h3>
                        <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={(data.hero?.people.length ?? 0) >= 5} onClick={() => update('hero.people', [...(data.hero?.people ?? []), { name: 'New portrait', avatar_path: '' }])}>Add portrait</button></div>
                        {(data.hero?.people ?? []).map((person, index) => <div className="pm-admin-repeat-card" key={`person-${index}`}>
                            <div className="pm-admin-repeat-header"><strong>Portrait {index + 1}</strong><div className="pm-admin-icon-actions">
                                <button type="button" aria-label={`Move portrait ${index + 1} up`} disabled={index === 0} onClick={() => {
                                    const people = [...(data.hero?.people ?? [])]; [people[index - 1], people[index]] = [people[index], people[index - 1]]; update('hero.people', people);
                                }}><ArrowUp size={16}/></button>
                                <button type="button" aria-label={`Move portrait ${index + 1} down`} disabled={index === (data.hero?.people.length ?? 0) - 1} onClick={() => {
                                    const people = [...(data.hero?.people ?? [])]; [people[index + 1], people[index]] = [people[index], people[index + 1]]; update('hero.people', people);
                                }}><ArrowDown size={16}/></button>
                                <button type="button" aria-label={`Remove portrait ${index + 1}`} onClick={() => update('hero.people', data.hero?.people.filter((_, i) => i !== index))}><Trash2 size={16}/></button>
                            </div></div>
                            {text(`hero.people.${index}.name`, `Name · ${index + 1}`)}
                            <HomepageImageUploader value={person.avatar_path ?? ''} onChange={url => update(`hero.people.${index}.avatar_path`, url)}/>
                        </div>)}
                    </div>
                </>)}
                {selected === 'pathway' && frame('Career pathway', 'Adjust the pathway steps, certification cards and professional-skills banner.', <>
                    {text('pathway.steps.heading', 'Pathway heading')}
                    {list('pathway.steps.items', 'Career steps', [{ key: 'title', label: 'Step title' }, { key: 'description', label: 'Description', kind: 'textarea' }, { key: 'icon', label: 'Icon', kind: 'select', choices: choices('pathway_step_icon') }])}
                    <div className="pm-admin-field-grid">{text('pathway.exams.heading', 'Exams heading')}{text('pathway.exams.description', 'Exams introduction', 'textarea')}
                        {text('pathway.exams.compare_label', 'Compare plans label')}{text('pathway.exams.more_label', 'More exams label')}</div>
                    {list('pathway.exams.items', 'Exam cards', [{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description', kind: 'textarea' }, { key: 'icon', label: 'Icon', kind: 'select', choices: choices('pathway_exam_icon') }, { key: 'features', label: 'Feature highlights (one per line)', kind: 'lines' }, { key: 'button_label', label: 'Button label' }, { key: 'plans_label', label: 'Plans label' }])}
                    <h3 className="pm-admin-subheading">Professional skills banner</h3>
                    <div className="pm-admin-field-grid">{text('pathway.banner.heading', 'Heading')}{text('pathway.banner.description', 'Description', 'textarea')}{text('pathway.banner.button_label', 'Button label')}</div>
                </>)}
                {selected === 'scenario' && frame('Daily challenge', 'The actual scenario comes from published content. Choose one or leave automatic selection.', <>
                    <div className="pm-admin-field-grid">{text('scenario.heading', 'Section heading')}{text('scenario.status_label', 'Status label')}
                        {text('scenario.view_all_label', 'View all label')}{text('scenario.button_label', 'General action label')}
                        {text('scenario.read_button_label', 'Read label')}{text('scenario.discussion_button_label', 'Discussion label')}
                        {text('scenario.responses_heading', 'Responses heading')}{text('scenario.score_label', 'Score label')}{text('scenario.hint', 'Hint', 'textarea')}{text('scenario.empty_message', 'No published scenario message', 'textarea')}{text('scenario.empty_responses_message', 'No responses message', 'textarea')}</div>
                    <div className="pm-admin-featured"><h3>Featured published scenario</h3><p>Leave Automatic to show the latest published scenario.</p>
                        <select value={String(data.scenario?.featured_id ?? '')} onChange={event => update('scenario.featured_id', event.target.value ? Number(event.target.value) : null)}>
                            <option value="">Automatic (latest)</option>{options.scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.title}</option>)}
                        </select></div>
                </>)}
                {selected === 'community' && frame('Community feed', 'Edit community copy and optionally pin two public posts.', <>
                    <div className="pm-admin-field-grid">{text('community.heading', 'Section heading')}{text('community.view_all_label', 'View all label')}
                        {text('community.prompt_title', 'Sharing invitation')}{text('community.prompt_description', 'Sharing message', 'textarea')}
                        {text('community.button_label', 'Button label')}{text('community.empty_message', 'No posts message', 'textarea')}</div>
                    {<EditableStringList title="Topic filters" values={data.community?.topics ?? []} onChange={values => update('community.topics', values)} error={errors['content.community.topics']}/>}
                    <FeaturedSelector label="Featured community posts" hint="Choose up to two posts, or leave empty to automatically show the latest public posts."
                        options={options.posts} selected={data.community?.featured_ids ?? []} max={2} onChange={ids => update('community.featured_ids', ids)} error={errors['content.community.featured_ids']}/>
                </>)}
                {selected === 'members' && frame('Member preview', 'Choose a few public member profiles or automatically show recent members.', <>
                    <div className="pm-admin-field-grid">{text('members.heading', 'Panel heading')}{text('members.hint', 'Supporting text', 'textarea')}{text('members.button_label', 'Button label')}{text('members.empty_message', 'No members message', 'textarea')}</div>
                    <FeaturedSelector label="Featured public members" hint="Choose up to three people, or leave empty for the latest public members."
                        options={options.members} selected={data.members?.featured_ids ?? []} max={3} onChange={ids => update('members.featured_ids', ids)} error={errors['content.members.featured_ids']}/>
                </>)}
                {selected === 'skills' && frame('Skills sidebar', 'Manage the cards shown next to the homepage feed.', <>
                    {text('skills.heading', 'Panel heading')}{list('skills.items', 'Skill cards', [
                        { key: 'title', label: 'Title' }, { key: 'description', label: 'Description', kind: 'textarea' },
                        { key: 'url', label: 'Destination', kind: 'select', choices: choices('skills_url') },
                        { key: 'icon', label: 'Icon', kind: 'select', choices: choices('skills_icon') },
                    ])}
                </>)}
                {selected === 'careers' && frame('Career highlights', 'Manage features, sample opportunities, resume banner and final invitation.', <>
                    <div className="pm-admin-field-grid">{text('careers.heading', 'Section heading')}{text('careers.opportunities_heading', 'Opportunities heading')}{text('careers.jobs_view_all_label', 'View all jobs label')}{text('careers.empty_message', 'No verified opportunities message', 'textarea')}</div>
                    {list('careers.features', 'Feature cards', [{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description', kind: 'textarea' },
                        { key: 'url', label: 'Destination', kind: 'select', choices: choices('careers_feature_url') }, { key: 'icon', label: 'Icon', kind: 'select', choices: choices('careers_feature_icon') }], 12)}
                    <div className="pm-admin-visibility"><div><strong>Display sample opportunities in public mode</strong><small>These are illustrative cards, not verified live job vacancies.</small></div>
                        <label className="pm-admin-switch"><input type="checkbox" checked={Boolean(data.careers?.show_sample_opportunities)} onChange={event => update('careers.show_sample_opportunities', event.target.checked)}/><span>{data.careers?.show_sample_opportunities ? 'Yes' : 'No'}</span></label></div>
                    {list('careers.opportunities', 'Sample job cards', [{ key: 'role', label: 'Role' }, { key: 'company', label: 'Example company' }, { key: 'location', label: 'Location', kind: 'select', choices: choices('careers_location') }, { key: 'type', label: 'Employment type', kind: 'select', choices: choices('careers_type') }, { key: 'icon', label: 'Icon', kind: 'select', choices: choices('careers_opportunity_icon') }], 12)}
                    <h3 className="pm-admin-subheading">Resume banner</h3><div className="pm-admin-field-grid">{text('careers.resume.title', 'Title')}{text('careers.resume.description', 'Description', 'textarea')}{text('careers.resume.button_label', 'Button label')}</div>
                    <h3 className="pm-admin-subheading">Membership invitation</h3><div className="pm-admin-field-grid">{text('careers.join.heading', 'Heading')}{text('careers.join.description', 'Description', 'textarea')}{text('careers.join.button_label', 'Button label')}{text('careers.join.hint', 'Hint', 'textarea')}</div>
                </>)}
            </section>
            <div className="pm-admin-editor-bottom"><span>{dirty ? 'You have unsaved changes.' : 'Saved content is published instantly.'}</span>
                <button type="button" className="pm-admin-button pm-admin-button-primary" onClick={save} disabled={processing || !dirty || missingMasterData}><Save size={16}/> Save homepage changes</button></div>
        </>}
    </AdminLayout>;
}
