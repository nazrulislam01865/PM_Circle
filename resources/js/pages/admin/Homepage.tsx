import { Link, router } from '@inertiajs/react';
import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, ExternalLink, Save, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { PMDropdown } from '@/components/pm/PMDropdown';
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
    // Suggestions are existing public destinations; the route field is also writable.
    const routeSuggestions: SelectOption[] = [...new Map([
        ...['/daily-challenge', '/community', '/register', '/learning', '/careers', '/pricing'].map(path => [path, { value: path, label: path }] as const),
        ...(['/', '/about', '/members', '/discover-pm', '/pm-trends', '/dashboard'] as const).map(path => [path, { value: path, label: path }] as const),
    ]).values()];
    const cardRouteSuggestions = [{ value: '/learning', label: '/learning' }, ...routeSuggestions.filter(option => option.value !== '/learning')];
    function text(path: string, label: string, kind: 'text' | 'textarea' | 'select' = 'text', choices?: { value: string; label: string }[], hint?: string) {
        return <ContentField key={path} id={`content-${path.replace(/[^a-zA-Z0-9]/g, '-')}`} label={label} value={String(data ? getValue(data, path) ?? '' : '')} type={kind}
            onChange={value => update(path, value)} choices={choices} hint={hint} error={errors[`content.${path}`]}/>;
    }
    function routeField(path: string, label: string, hint?: string) {
        return <ContentField key={path} id={`content-${path.replace(/[^a-zA-Z0-9]/g, '-')}`} label={label}
            value={String(data ? getValue(data, path) ?? '' : '')} type="route" choices={routeSuggestions}
            onChange={value => update(path, value)} hint={hint} error={errors[`content.${path}`]}/>;
    }
    function buttonPair(labelPath: string, labelName: string, routePath: string, routeName: string, hint?: string) {
        return <div className="pm-admin-button-pair" key={labelPath}>
            {text(labelPath, labelName)}
            {routeField(routePath, routeName, hint)}
        </div>;
    }
    function list(path: string, title: string, fields: EditorField[], max = 10, layout: 'grid' | 'stacked' = 'grid') {
        const raw = data ? getValue(data, path) : undefined;
        return <RepeatableItems title={title} path={`content.${path}`} rows={Array.isArray(raw) ? raw : []} fields={fields}
            max={max} layout={layout} errors={errors} onChange={items => update(path, items)}/>;
    }
    function save() {
        if (!data || processing) return;
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
                    <button type="button" className="pm-admin-button pm-admin-button-primary" onClick={save} disabled={processing || !dirty}><Save size={17}/>{processing ? 'Saving…' : 'Save changes'}</button></div>
            </div>
            {saved && <div className="pm-admin-notice pm-admin-notice-success" role="status"><CheckCircle2 size={18}/> Homepage saved. Changes are live on the public page.</div>}
            {errors.version && <div className="pm-admin-notice pm-admin-notice-error" role="alert"><AlertCircle size={18}/>{errors.version}</div>}
            {Object.keys(errors).length > 0 && !errors.version && <div className="pm-admin-notice pm-admin-notice-error" role="alert"><AlertCircle size={18}/> Please review the highlighted fields. {Object.values(errors)[0]}</div>}
            <section className="pm-admin-panel pm-admin-editor-main" aria-label={`${homepageSections.find(section => section.key === selected)?.name ?? 'Homepage'} editor`}>
                <div className="pm-admin-visibility"><div><strong>Show this section on the homepage</strong><small>Hide without deleting any text or cards.</small></div>
                    <label className="pm-admin-switch"><input type="checkbox" checked={data.sections[selected]} onChange={event => update(`sections.${selected}`, event.target.checked)}/><span>{data.sections[selected] ? 'Visible' : 'Hidden'}</span></label>
                </div>
                {selected === 'hero' && frame('Hero & portraits', 'Control the main welcome message, actions and portrait images.', <>
                    <div className="pm-admin-field-grid">{text('hero.eyebrow', 'Eyebrow')}{text('hero.title', 'Headline')}</div>
                    {text('hero.description', 'Description', 'textarea')}
                    {buttonPair('hero.primary_label', 'Primary button label', 'hero.primary_url', 'Primary button destination')}
                    {buttonPair('hero.secondary_label', 'Secondary button label', 'hero.secondary_url', 'Secondary button destination')}
                    <div className="pm-admin-field-grid">{text('hero.caption_learn', 'Orbit learning caption', 'textarea')}{text('hero.caption_discuss', 'Orbit community caption', 'textarea')}{text('hero.caption_career', 'Orbit career caption', 'textarea')}</div>
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
                    {list('pathway.steps.items', 'Career steps', [{ key: 'title', label: 'Step title' }, { key: 'description', label: 'Description', kind: 'textarea' },
                        { key: 'icon', label: 'Built-in icon', kind: 'select', choices: choices('pathway_step_icon') },
                        { key: 'icon_image', label: 'Custom icon image (36 × 36 px)', kind: 'image' }], 10, 'stacked')}
                    <div className="pm-admin-field-grid">{text('pathway.exams.heading', 'Exams heading')}{text('pathway.exams.description', 'Exams introduction', 'textarea')}
                        {text('pathway.exams.compare_label', 'Compare plans label')}{text('pathway.exams.more_label', 'More exams label')}</div>
                    {list('pathway.exams.items', 'Exam cards', [{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description', kind: 'textarea' }, { key: 'icon', label: 'Built-in icon', kind: 'select', choices: choices('pathway_exam_icon') }, { key: 'icon_image', label: 'Custom icon image (36 × 36 px)', kind: 'image' }, { key: 'features', label: 'Feature highlights (one per line)', kind: 'lines' }, { key: 'button_label', label: 'Button label' }, { key: 'plans_label', label: 'Plans label' }])}
                    <h3 className="pm-admin-subheading">Professional skills banner</h3>
                    <div className="pm-admin-field-grid">{text('pathway.banner.heading', 'Heading')}{text('pathway.banner.description', 'Description', 'textarea')}{text('pathway.banner.button_label', 'Button label')}</div>
                </>)}
                {selected === 'scenario' && frame('Daily challenge', 'Scenario content is selected from published entries; configure the visible actions and their destinations.', <>
                    <div className="pm-admin-field-grid">{text('scenario.heading', 'Section heading')}{text('scenario.status_label', 'Status label')}</div>
                    {buttonPair('scenario.view_all_label', 'View all button label', 'scenario.view_all_url', 'View all destination')}
                    {buttonPair('scenario.read_button_label', 'Read scenario button label', 'scenario.read_url', 'Read destination', 'Leave blank to open the current published scenario.')}
                    {buttonPair('scenario.discussion_button_label', 'Join discussion button label', 'scenario.discussion_url', 'Discussion destination', 'Leave blank to open the current published scenario.')}
                    <div className="pm-admin-field-grid">{text('scenario.responses_heading', 'Responses heading')}{text('scenario.score_label', 'Score label')}
                        {text('scenario.hint', 'Hint', 'textarea')}{text('scenario.empty_message', 'No published scenario message', 'textarea')}{text('scenario.empty_responses_message', 'No responses message', 'textarea')}</div>
                    <div className="pm-admin-featured"><h3>Featured published scenario</h3><p>Leave Automatic to show the latest published scenario.</p>
                        <PMDropdown id="featured-scenario" value={String(data.scenario?.featured_id ?? '')}
                            onValueChange={value => update('scenario.featured_id', value ? Number(value) : null)}
                            placeholder="Automatic (latest)" options={options.scenarios.map(scenario => ({ value: String(scenario.id), label: scenario.title ?? `Scenario #${scenario.id}` }))}/></div>
                </>)}
                {selected === 'community' && frame('Community feed', 'Latest published public posts appear automatically; configure the section and its actions.', <>
                    {text('community.heading', 'Section heading')}
                    {buttonPair('community.view_all_label', 'View all posts button label', 'community.view_all_url', 'View all destination')}
                    <div className="pm-admin-field-grid">{text('community.prompt_title', 'Sharing invitation')}{text('community.prompt_description', 'Sharing message', 'textarea')}</div>
                    {buttonPair('community.button_label', 'Join to share button label', 'community.button_url', 'Join button destination', 'Leave blank to use the default destination for each visitor.')}
                    {text('community.empty_message', 'No posts message', 'textarea')}
                    <EditableStringList title="Topic filters" values={data.community?.topics ?? []} onChange={values => update('community.topics', values)} error={errors['content.community.topics']}/>
                    <p className="pm-admin-hint">The feed automatically shows the two latest published public posts. No manual post selection is necessary.</p>
                </>)}
                {selected === 'members' && frame('Member preview', 'Choose a few public member profiles or automatically show recent members.', <>
                    <div className="pm-admin-field-grid">{text('members.heading', 'Panel heading')}{text('members.hint', 'Supporting text', 'textarea')}{text('members.button_label', 'Button label')}{text('members.empty_message', 'No members message', 'textarea')}</div>
                    <FeaturedSelector label="Featured public members" hint="Choose up to three people, or leave empty for the latest public members."
                        options={options.members} selected={data.members?.featured_ids ?? []} max={3} onChange={ids => update('members.featured_ids', ids)} error={errors['content.members.featured_ids']}/>
                </>)}
                {selected === 'skills' && frame('Skills sidebar', 'Manage the cards shown next to the homepage feed.', <>
                    {text('skills.heading', 'Panel heading')}{list('skills.items', 'Skill cards', [
                        { key: 'title', label: 'Title' }, { key: 'description', label: 'Description', kind: 'textarea' },
                        { key: 'url', label: 'Destination', kind: 'route', choices: cardRouteSuggestions },
                        { key: 'icon', label: 'Built-in icon', kind: 'select', choices: choices('skills_icon') },
                        { key: 'icon_image', label: 'Custom icon image (36 × 36 px)', kind: 'image' },
                    ])}
                </>)}
                {selected === 'career_features' && frame('PM career feature cards', 'Edit the four benefit cards, their page destinations and optional 36 × 36 px icons.', <>
                    {text('careers.heading', 'Section heading')}
                    {list('careers.features', 'Feature cards', [{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description', kind: 'textarea' },
                        { key: 'url', label: 'Destination', kind: 'route', choices: cardRouteSuggestions },
                        { key: 'icon', label: 'Built-in icon', kind: 'select', choices: choices('careers_feature_icon') },
                        { key: 'icon_image', label: 'Custom icon image (36 × 36 px)', kind: 'image' }], 12)}
                </>)}
                {selected === 'careers' && frame('Opportunities & resume', 'Show the three latest Careers jobs and manage the resume panel and final membership invitation. The document illustration is unchanged.', <>
                    <div className="pm-admin-field-grid">{text('careers.opportunities_heading', 'Opportunities heading')}{text('careers.empty_message', 'No verified opportunities message', 'textarea')}</div>
                    {buttonPair('careers.jobs_view_all_label', 'View all jobs button label', 'careers.jobs_url', 'Jobs destination')}
                    <p className="pm-admin-hint">The homepage displays the three newest current job listings from Careers automatically. No sample cards or manual job selection are used.</p>
                    <h3 className="pm-admin-subheading">Resume banner</h3>
                    <div className="pm-admin-field-grid">{text('careers.resume.title', 'Title')}{text('careers.resume.description', 'Description', 'textarea')}</div>
                    {buttonPair('careers.resume.button_label', 'Resume button label', 'careers.resume.button_url', 'Resume button destination')}
                    <div className="pm-admin-field"><span className="pm-admin-field-label">Resume sparkle icon (optional)</span>
                        <HomepageImageUploader variant="icon" value={data.careers?.resume.icon_image ?? ''} onChange={url => update('careers.resume.icon_image', url)}/>
                        {errors['content.careers.resume.icon_image'] && <span role="alert" className="pm-admin-error">{errors['content.careers.resume.icon_image']}</span>}
                        <small className="pm-admin-hint">Only the small decorative sparkle icon changes. The document illustration remains exactly as it is.</small></div>
                    <h3 className="pm-admin-subheading">Membership invitation</h3>
                    <div className="pm-admin-field-grid">{text('careers.join.heading', 'Heading')}{text('careers.join.description', 'Description', 'textarea')}</div>
                    {buttonPair('careers.join.button_label', 'Join button label', 'careers.join.button_url', 'Join button destination')}
                    {text('careers.join.hint', 'Hint', 'textarea')}
                </>)}
            </section>
            <div className="pm-admin-editor-bottom"><span>{dirty ? 'You have unsaved changes.' : 'Saved content is published instantly.'}</span>
                <button type="button" className="pm-admin-button pm-admin-button-primary" onClick={save} disabled={processing || !dirty}><Save size={16}/> Save homepage changes</button></div>
        </>}
    </AdminLayout>;
}
