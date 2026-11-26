import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import type { CatalogSettings } from '@/components/learning/catalogSettings';

export default function LearningCatalogSettings({ settings }: { settings: CatalogSettings }) {
    const form = useForm<CatalogSettings>(settings);
    const { flash } = usePage<{flash?: {status?: string}}>().props;
    const fields = (items: [Exclude<keyof CatalogSettings, 'starting_enabled' | 'topics_enabled'>, string][]) => items.map(([key, label]) => <label key={key} className="pm-admin-field pm-course-admin-wide"><span>{label}</span>{key.includes('description') ? <textarea rows={3} maxLength={500} value={form.data[key]} onChange={e => form.setData(key,e.target.value)}/> : <input maxLength={120} value={form.data[key]} onChange={e => form.setData(key,e.target.value)}/>} {form.errors[key] && <small className="pm-admin-error" role="alert">{form.errors[key]}</small>}</label>);
    return <AdminLayout active="/admin/learning/courses/catalog-settings" title="Browse Courses settings" subtitle="Manage the public and member course catalog presentation.">
        <Head title="Browse Courses settings | PM Circle Admin"/>
        <div className="pm-course-admin-heading pm-course-admin-editor-head"><Link href="/admin/learning/courses" className="pm-admin-button"><ArrowLeft size={16}/> Course library</Link><Link href="/learning" className="pm-admin-button">View catalog</Link></div>
        {flash?.status && <p className="pm-admin-notice pm-admin-notice-success" role="status">{flash.status}</p>}
        <form className="pm-course-admin-editor" onSubmit={e => {e.preventDefault(); form.put('/admin/learning/courses/catalog-settings', {preserveScroll:true});}}>
            <section className="pm-admin-panel pm-course-admin-section"><h2>Page heading</h2>{fields([['title','Title'],['description','Description']])}</section>
            <section className="pm-admin-panel pm-course-admin-section"><h2>Find Your Starting Point</h2><label className="pm-course-admin-publish"><input type="checkbox" checked={form.data.starting_enabled} onChange={e => form.setData('starting_enabled',e.target.checked)}/> Show recommendation card</label>{fields([['starting_title','Card title'],['starting_description','Card description'],['starting_button','Button label']])}<p>Recommendations use the existing published catalog and experience, topic and goal questions.</p></section>
            <section className="pm-admin-panel pm-course-admin-section"><h2>Catalog controls</h2><label className="pm-course-admin-publish"><input type="checkbox" checked={form.data.topics_enabled} onChange={e => form.setData('topics_enabled',e.target.checked)}/> Show topic shortcuts</label>{fields([['search_placeholder','Search placeholder'],['detail_button','Course details button'],['empty_title','Empty state title'],['empty_description','Empty state description']])}<p>Categories, levels, access, course order and cards are managed in Course Library and Master data. The approved four-column grid is preserved.</p></section>
            <div className="pm-course-content-form-actions"><button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={form.processing}><Save size={16}/>{form.processing ? 'Saving…' : 'Save changes'}</button></div>
        </form>
    </AdminLayout>;
}
