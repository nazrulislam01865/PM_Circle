import { router } from '@inertiajs/react';
import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Database, Link2, Plus, Save } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';

type Category = { value: string; label: string; can_add: boolean };
type Option = { id: number; value: string; label: string; sort_order: number; is_active: boolean };
type Props = { categories: Category[]; options: Record<string, Option[]>; selectedCategory: string; navigation: boolean };

function OptionEditor({ option, navigation }: { option: Option; navigation: boolean }) {
    const [label, setLabel] = useState(option.label);
    const [order, setOrder] = useState(String(option.sort_order));
    const [active, setActive] = useState(option.is_active);
    const [busy, setBusy] = useState(false);
    const [destination, setDestination] = useState(option.value);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const base = navigation ? '/admin/navigation' : '/admin/master-data';

    useEffect(() => { setLabel(option.label); setOrder(String(option.sort_order)); setActive(option.is_active); setDestination(option.value); }, [option.label, option.sort_order, option.is_active, option.value]);
    const changed = label !== option.label || Number(order) !== option.sort_order || active !== option.is_active || (navigation && destination !== option.value);
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!changed || busy) return;
        setError(''); setSaved(false); setBusy(true);
        router.patch(`${base}/${option.id}`, { label: label.trim(), sort_order: Number(order), is_active: active, ...(navigation ? { value: destination.trim() } : {}) }, {
            preserveScroll: true,
            onSuccess: () => setSaved(true),
            onError: errors => setError(Object.values(errors).join(' ') || 'Unable to update this value.'),
            onFinish: () => setBusy(false),
        });
    }
    return <div className="pm-admin-option-card">
        <form className="pm-admin-master-row" onSubmit={submit} aria-label={`Edit ${option.value}`}>
            <div className="pm-admin-master-code">{navigation ? <div className="pm-admin-field"><label htmlFor={`master-destination-${option.id}`}>Destination</label><input id={`master-destination-${option.id}`} value={destination} maxLength={160} required onChange={event => { setDestination(event.target.value); setSaved(false); }}/></div> : <><strong>{option.value}</strong><small>Stored value (fixed)</small></>}</div>
            <div className="pm-admin-field"><label htmlFor={`master-label-${option.id}`}>Display label</label><input id={`master-label-${option.id}`} maxLength={160} required value={label} onChange={event => { setLabel(event.target.value); setSaved(false); }}/></div>
            <div className="pm-admin-field pm-admin-master-order"><label htmlFor={`master-order-${option.id}`}>Order</label><input type="number" min="0" max="65535" id={`master-order-${option.id}`} required value={order} onChange={event => { setOrder(event.target.value); setSaved(false); }}/></div>
            <label className="pm-admin-master-active"><input type="checkbox" checked={active} onChange={event => { setActive(event.target.checked); setSaved(false); }}/> Active</label>
            <button className="pm-admin-button pm-admin-button-quiet" type="submit" disabled={!changed || busy}><Save size={16}/>{busy ? 'Saving…' : 'Save'}</button>
        </form>
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
        subtitle={navigation ? 'Manage the public header and footer menu labels, links, order and visibility.' : 'Manage dropdown choices. Homepage icon images are uploaded individually in Homepage control.'}>
        <section className="pm-admin-panel pm-admin-master-intro">{navigation ? <Link2 size={22} aria-hidden="true"/> : <Database size={22} aria-hidden="true"/>}
            <div><h2>{category?.label ?? 'Select a category'}</h2><p>{navigation ? 'Manage header and footer links. External and administrative URLs are not accepted.' : 'Only active values appear in the relevant forms. Homepage icons are uploaded on each item.'}</p></div>
            <span className="pm-admin-catalog-count">{rows.filter(row => row.is_active).length} active</span>
        </section>
        {notice && <p className="pm-admin-notice pm-admin-notice-success" role="status"><CheckCircle2 size={18}/>{notice}</p>}
        {error && <p className="pm-admin-notice pm-admin-notice-error" role="alert"><AlertCircle size={18}/>{error}</p>}
        <section className="pm-admin-panel pm-admin-master-main" aria-label={`${category?.label ?? 'Master data'} values`}>
            <div className="pm-admin-master-rows">{rows.length ? rows.map(option => <OptionEditor key={option.id} option={option} navigation={navigation}/>) : <p className="pm-admin-empty">No values available. Add a value below or run the master-data seeder.</p>}</div>
            {category?.can_add && <form onSubmit={addOption} className="pm-admin-master-create">
                <h3>Add {navigation ? 'a destination' : 'a dropdown value'}</h3><p>{navigation ? 'Only existing internal website routes are allowed.' : 'New values appear in the relevant dropdown after saving.'}</p>
                <div className="pm-admin-master-create-fields"><div className="pm-admin-field"><label htmlFor="new-master-value">Stored value</label><input id="new-master-value" maxLength={160} required value={value} onChange={event => setValue(event.target.value)} placeholder={navigation ? '/learning' : 'New value'}/></div>
                    <div className="pm-admin-field"><label htmlFor="new-master-label">Display label</label><input id="new-master-label" maxLength={160} required value={label} onChange={event => setLabel(event.target.value)} placeholder="Label shown in dropdown"/></div>
                    <button className="pm-admin-button pm-admin-button-primary" type="submit" disabled={busy}><Plus size={16}/>{busy ? 'Adding…' : 'Add value'}</button></div>
            </form>}
        </section>
    </AdminLayout>;
}
