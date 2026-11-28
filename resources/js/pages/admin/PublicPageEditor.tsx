import { Link, useForm, usePage } from '@inertiajs/react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { ContentField, RepeatableItems, type EditorField } from '@/components/admin/HomepageFields';

type Page = 'about' | 'trends' | 'compare-plans' | 'refund-policy';
type Props = { page: Page; section: string; content: Record<string, string | boolean | Record<string, string | null>[]>; version: number };
const sections: Record<Page, string[][]> = {
    about: [['banner', 'Page banner'], ['intro', 'Introduction'], ['features', 'Feature cards'], ['company', 'Company information']],
    trends: [['banner', 'Page banner'], ['listing', 'Report listing'], ['detail', 'Report detail']],
    'compare-plans': [['banner', 'Page banner'], ['comparison', 'Comparison headers'], ['community', 'Community & profile'], ['learning', 'Courses & learning'], ['exams', 'Exam practice & challenges'], ['career', 'Career & events'], ['ai-support', 'AI tokens & support'], ['actions', 'Plan buttons'], ['notes', 'Supporting notes'], ['profile-import', 'Profile import & dialog']],
    'refund-policy': [['banner', 'Page banner'], ['navigation', 'Contents navigation'], ['monthly-plan-payments', 'Monthly plan payments'], ['cancel-your-plan', 'Cancellation'], ['payment-and-access-issues', 'Payment & access issues'], ['consumer-rights', 'Consumer rights']],
};
const pageInfo: Record<Page, {title: string; href: string}> = {
    about: {title: 'About Us control', href: '/about'}, trends: {title: 'Trends page control', href: '/pm-trends'},
    'compare-plans': {title: 'Compare Plans control', href: '/pricing'}, 'refund-policy': {title: 'Refund Policy control', href: '/refund-policy'},
};
const labels: Record<string, string> = { title: 'Heading', description: 'Description', enabled: 'Show section', linkLabel: 'Link label', href: 'Link destination', searchLabel: 'Search label', searchPlaceholder: 'Search placeholder', topicLabel: 'Topic label', allTopics: 'All topics label', searchAction: 'Search button', clearAction: 'Clear filters button', sourceTitle: 'Source section heading', sampleNoticeTitle: 'Sample disclaimer heading', sampleNoticeText: 'Sample disclaimer text', emptyText: 'Empty results message', noticeTitle: 'Disclaimer heading', noticeText: 'Disclaimer text', relatedTitle: 'Related reports heading', allReportsLabel: 'All reports link', relatedEnabled: 'Show related reports', commentsEnabled: 'Show comments', saveEnabled: 'Show save report button', shareEnabled: 'Show share button', currentLabel: 'Breadcrumb label', metaTitle: 'Browser title', recommended: 'Recommended badge', freeNote: 'Free plan note', proNote: 'Pro plan note', priceUnavailable: 'Unavailable price label', monthlyLabel: 'Monthly option', yearlyLabel: 'Yearly option', monthsLabel: 'Other durations suffix', perMonth: 'Monthly price suffix', durationLabel: 'Duration field label', regionLabel: 'Comparison table accessibility label', adminLabel: 'Admin action', freeGuest: 'Free guest action', freeMember: 'Free member action', plusLabel: 'Plus action', proLabel: 'Pro action', privacyNote: 'Privacy note', billingNote: 'Billing note', note: 'Supporting note', dialogTitle: 'Dialog title', dialogDescription: 'Dialog description', dialogBody: 'Dialog text', navigationTitle: 'Contents link label' };
const bodyFields = new Set(['description', 'noticeText', 'sampleNoticeText', 'privacyNote', 'billingNote', 'note', 'dialogDescription', 'dialogBody']);
const icons = ['FileText', 'BookOpen', 'BrainCircuit', 'BriefcaseBusiness', 'ChartNoAxesColumnIncreasing', 'IdCard', 'Link2', 'MessageCircle', 'RefreshCw', 'Settings', 'Shield', 'Trophy', 'UserRound', 'UsersRound', 'Eye', 'Target'];
const repeaters: Record<string, { title: string; fields: EditorField[]; max: number; min?: number; emptyMessage: string }> = {
    cards: {title:'Feature cards', max:12, fields:[{key:'title',label:'Title'},{key:'description',label:'Description',kind:'textarea'},{key:'linkLabel',label:'Link label'},{key:'href',label:'Link destination'}], emptyMessage:'No feature cards. Add a card to show it on About Us.'},
    rows: {title:'Comparison rows', max:25, fields:[{key:'label',label:'Feature'},{key:'description',label:'Feature details'},{key:'icon',label:'Icon',kind:'select',choices:icons.map(value => ({value,label:value}))},{key:'free',label:'Free'},{key:'plus',label:'Plus'},{key:'pro',label:'Pro'}], emptyMessage:'No comparison rows.'},
    paragraphs: {title:'Policy paragraphs', max:12, min:1, fields:[{key:'text',label:'Paragraph text',kind:'textarea'},{key:'linkLabel',label:'Link text (optional, must occur in paragraph)'},{key:'href',label:'Link destination (optional)'}], emptyMessage:'Add a policy paragraph.'},
};

function SectionEditor({ page, section, content, version }: Props) {
    const form = useForm({ content, version });
    const errors = form.errors as Record<string, string>;
    const update = (key: string, value: Props['content'][string]) => form.setData('content', {...form.data.content, [key]: value});
    return <form className="pm-admin-panel pm-event-editor" onSubmit={event => { event.preventDefault(); form.put(`/admin/public-pages/${page}/${section}`, {preserveScroll: true}); }}>
        <h2>{sections[page].find(([key]) => key === section)?.[1]}</h2>
        {page === 'compare-plans' && <p className="pm-admin-hint">Edit display content only. Actual prices, billing durations, feature access and credits are controlled by the existing billing and entitlement system. For comparison cells use Included, Not included, or a short display value.</p>}
        {page === 'refund-policy' && <p className="pm-admin-hint">Changes become public when saved. Review policy wording before saving. Payment and refund processing are not changed by this editor.</p>}
        {Object.entries(form.data.content).map(([key, value]) => {
            if (Array.isArray(value)) {
                const config = repeaters[key];
                return config ? <RepeatableItems key={key} {...config} path={`content.${key}`} rows={value} errors={errors} onChange={rows => update(key, rows as Record<string, string | null>[])}/> : null;
            }
            if (typeof value === 'boolean') return <label key={key} className="pm-admin-check-row"><input type="checkbox" checked={value} onChange={event => update(key,event.target.checked)}/>{labels[key] ?? key}</label>;
            return <ContentField key={key} label={labels[key] ?? key} value={value} type={bodyFields.has(key) ? 'textarea' : 'text'} onChange={value => update(key,value)} error={errors[`content.${key}`]}/>;
        })}
        {errors.version && <p role="alert" className="pm-admin-error">{errors.version}</p>}
        {errors.content && <p role="alert" className="pm-admin-error">{errors.content}</p>}
        <div className="pm-event-editor-actions"><button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={form.processing || !form.isDirty}>{form.processing ? 'Saving…' : 'Save section'}</button><Link href={pageInfo[page].href} className="pm-admin-button">View public page</Link></div>
        {form.recentlySuccessful && <p role="status">Section saved.</p>}
    </form>;
}

export default function PublicPageEditor(props: Props) {
    const base = `/admin/public-pages/${props.page}`;
    const { flash } = usePage<{flash?: {status?: string}}>().props;
    return <AdminLayout title={pageInfo[props.page].title} subtitle="Manage the existing public page section by section." active={base}>
        <nav className="pm-event-editor-actions" aria-label="Page sections">{sections[props.page].map(([key,label]) => <Link key={key} href={`${base}?section=${key}`} aria-current={props.section === key ? 'page' : undefined} className={`pm-admin-button ${props.section === key ? 'pm-admin-button-primary' : ''}`}>{label}</Link>)}{props.page === 'trends' && <Link href="/admin/trend-reports" className="pm-admin-button">Manage reports</Link>}</nav>
        {flash?.status && <p className="pm-admin-hint" role="status">{flash.status}</p>}
        <SectionEditor key={`${props.page}:${props.section}:${props.version}`} {...props}/>
    </AdminLayout>;
}
