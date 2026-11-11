import { router } from '@inertiajs/react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Database, ImagePlus, Link2, Plus, Save, RotateCcw } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';

type Category = { value: string; label: string; can_add: boolean; is_icon: boolean };
type Option = { id: number; value: string; label: string; sort_order: number; is_active: boolean; icon_url?: string | null };
type Props = { categories: Category[]; options: Record<string, Option[]>; selectedCategory: string; navigation: boolean };

function OptionEditor({ option, navigation, category }: { option: Option; navigation: boolean; category: Category }) {
    const [label, setLabel] = useState(option.label);
    const [order, setOrder] = useState(String(option.sort_order));
    const [active, setActive] = useState(option.is_active);
    const [busy, setBusy] = useState(false);
    const [iconBusy, setIconBusy] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const base = navigation ? '/admin/navigation' : '/admin/master-data';

    useEffect(() => { setLabel(option.label); setOrder(String(option.sort_order)); setActive(option.is_active); }, [option.label, option.sort_order, option.is_active]);
    const changed = label !== option.label || Number(order) !== option.sort_order || active !== option.is_active;
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!changed || busy) return;
        setError(''); setSaved(false); setBusy(true);
        router.patch(`${base}/${option.id}`, { label: label.trim(), sort_order: Number(order), is_active: active }, {
            preserveScroll: true,
            onSuccess: () => setSaved(true),
            onError: errors => setError(Object.values(errors).join(' ') || 'Unable to update this value.'),
            onFinish: () => setBusy(false),
        });
    }
    function upload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = '';
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
            setError('Choose a PNG, JPG or WebP image up to 1 MB.'); return;
        }
        setIconBusy(true); setError(''); setSaved(false);
        router.post(`/admin/master-data/${option.id}/icon`, { icon: file }, {
            forceFormData: true, preserveScroll: true,
            onSuccess: () => setSaved(true),
            onError: errors => setError(Object.values(errors).join(' ') || 'Unable to upload icon.'),
            onFinish: () => setIconBusy(false),
        });
    }
    function restore() {
        setIconBusy(true); setError('');
        router.delete(`/admin/master-data/${option.id}/icon`, {
            preserveScroll: true,
            onSuccess: () => setSaved(true),
            onError: errors => setError(Object.values(errors).join(' ') || 'Unable to restore icon.'),
            onFinish: () => setIconBusy(false),
        });
    }
    return <div className="pm-admin-option-card">
        <form className="pm-admin-master-row" onSubmit={submit} aria-label={`Edit ${option.value}`}>
            <div className="pm-admin-master-code"><strong>{option.value}</strong><small>Stored value (fixed)</small></div>
            <div className="pm-admin-field"><label htmlFor={`master-label-${option.id}`}>Display label</label><input id={`master-label-${option.id}`} maxLength={160} required value={label} onChange={event => { setLabel(event.target.value); setSaved(false); }}/></div>
            <div className="pm-admin-field pm-admin-master-order"><label htmlFor={`master-order-${option.id}`}>Order</label><input type="number" min="0" max="65535" id={`master-order-${option.id}`} required value={order} onChange={event => { setOrder(event.target.value); setSaved(false); }}/></div>
            <label className="pm-admin-master-active"><input type="checkbox" checked={active} onChange={event => { setActive(event.target.checked); setSaved(false); }}/> Active</label>
            <button className="pm-admin-button pm-admin-button-quiet" type="submit" disabled={!changed || busy}><Save size={16}/>{busy ? 'Saving…' : 'Save'}</button>
        </form>
        {category.is_icon && <div className="pm-admin-icon-upload">
            {option.icon_url ? <img className="pm-admin-icon-preview" src={option.icon_url} alt={`Uploaded icon for ${option.label}`}/> : <span className="pm-admin-icon-preview pm-admin-icon-placeholder"><ImagePlus size={20} aria-hidden="true"/></span>}
            <div className="pm-admin-icon-copy"><strong>{option.icon_url ? 'Custom uploaded icon' : 'Using standard PM Circle icon'}</strong><small>PNG, JPG or WebP · up to 1 MB · 1024 × 1024 px maximum</small></div>
            <label className="pm-admin-button pm-admin-button-quiet pm-admin-icon-upload-button"><ImagePlus size={16}/>{iconBusy ? 'Uploading…' : 'Upload icon'}
                <input className="pm-admin-file-input" type="file" accept="image/png,image/jpeg,image/webp" disabled={iconBusy} onChange={upload}/></label>
            {option.icon_url && <button type="button" className="pm-admin-button" disabled={iconBusy} onClick={restore}><RotateCcw size={16}/> Restore default</button>}
        </div>}
        {(error || saved) && <p className={error ? 'pm-admin-error' : 'pm-admin-master-success'} role={error ? 'alert' : 'status'}>{error || 'Saved successfully'}</p>}
    </div>;
}

export default function MasterData({ categories, options, selectedCategory, navigation }: Props) {
    const [value, setValue] = useState('');
    const [label, setLabel] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const category = categories.find(item => item.value === selectedCategory);
    const rows = options[selectedCategory] ?? [];
    const base = navigation ? '/admin/navigation' : '/admin/master-data';
    useEffect(() => { setValue(''); setLabel(''); setError(''); setNotice(''); }, [selectedCategory, navigation]);

    function addOption(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!category || busy) return;
        setBusy(true); setError(''); setNotice('');
        router.post(base, { category: selectedCategory, value: value.trim(), label: label.trim() }, {
            preserveScroll: true,
            onSuccess: () => { setValue(''); setLabel(''); setNotice('New value added.'); },
            onError: errors => setError(Object.values(errors).join(' ') || 'Unable to add this value.'),
            onFinish: () => setBusy(false),
        });
    }

    return <AdminLayout active={base} selectedCatalogCategory={selectedCategory} title={navigation ? 'Navigation control' : 'Master data'}
        subtitle={navigation ? 'Manage allowed page destinations separately from homepage dropdown values.' : 'Manage the dropdown choices used by the homepage editor. Select a category from the sidebar.'}>
        <section className="pm-admin-panel pm-admin-master-intro">{navigation ? <Link2 size={22} aria-hidden="true"/> : <Database size={22} aria-hidden="true"/>}
            <div><h2>{category?.label ?? 'Select a category'}</h2><p>{navigation ? 'Manage existing internal website destinations. External or administrative URLs are not accepted.' : 'Only active values appear in the homepage editor. Upload an icon to replace its standard graphic wherever that choice is used.'}</p></div>
            <span className="pm-admin-catalog-count">{rows.filter(row => row.is_active).length} active</span>
        </section>
        {notice && <p className="pm-admin-notice pm-admin-notice-success" role="status"><CheckCircle2 size={18}/>{notice}</p>}
        {error && <p className="pm-admin-notice pm-admin-notice-error" role="alert"><AlertCircle size={18}/>{error}</p>}
        <section className="pm-admin-panel pm-admin-master-main" aria-label={`${category?.label ?? 'Master data'} values`}>
            <div className="pm-admin-master-rows">{rows.length ? rows.map(option => <OptionEditor key={option.id} option={option} navigation={navigation} category={category!}/>) : <p className="pm-admin-empty">No values available. Add a value below or run the master-data seeder.</p>}</div>
            {category?.can_add && <form onSubmit={addOption} className="pm-admin-master-create">
                <h3>Add {navigation ? 'a destination' : 'a dropdown value'}</h3><p>{navigation ? 'Only existing internal website routes are allowed.' : 'New values are available in the homepage editor after saving.'}</p>
                <div className="pm-admin-master-create-fields"><div className="pm-admin-field"><label htmlFor="new-master-value">Stored value</label><input id="new-master-value" maxLength={160} required value={value} onChange={event => setValue(event.target.value)} placeholder={navigation ? '/learning' : 'New value'}/></div>
                    <div className="pm-admin-field"><label htmlFor="new-master-label">Display label</label><input id="new-master-label" maxLength={160} required value={label} onChange={event => setLabel(event.target.value)} placeholder="Label shown in dropdown"/></div>
                    <button className="pm-admin-button pm-admin-button-primary" type="submit" disabled={busy}><Plus size={16}/>{busy ? 'Adding…' : 'Add value'}</button></div>
            </form>}
            {category?.is_icon && <p className="pm-admin-hint">The stored icon codes remain stable. Uploaded images replace their visuals on the public homepage without changing saved card content.</p>}
        </section>
    </AdminLayout>;
}
