import { Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { legalLinks, legalLinkText, replaceLegalLink, type LegalLink } from '@/components/pm/legal-links';

export function LegalSectionLinks({ body, disabled, onChange }: { body: string; disabled: boolean; onChange: (body: string) => void }) {
    const links = legalLinks(body);
    const [editing, setEditing] = useState<LegalLink | 'new' | null>(null);
    const [label, setLabel] = useState('');
    const [href, setHref] = useState('');
    const [original, setOriginal] = useState('');
    const [error, setError] = useState('');
    const begin = (link: LegalLink | 'new') => {
        setEditing(link); setOriginal(body); setError('');
        setLabel(link === 'new' ? '' : link.label);
        setHref(link === 'new' ? '' : link.href);
    };
    const apply = () => {
        if (!editing || disabled) return;
        if (original !== body) { setError('Section text changed. Cancel and reopen the link editor.'); return; }
        const text = legalLinkText(label, href);
        if (!text) { setError('Enter plain link text and a site path (e.g. /contact) or HTTPS URL.'); return; }
        const next = editing === 'new' ? `${body.trimEnd()}${body.trim() ? '\n\n' : ''}${text}` : replaceLegalLink(body, editing, text);
        if (next.length > 20000) { setError('Section content exceeds 20,000 characters.'); return; }
        onChange(next); setEditing(null); setError('');
    };
    return <div className="pm-course-admin-repeat-card">
        <div className="pm-course-admin-heading pm-course-admin-editor-head">
            <h4>Links in this section</h4>
            <button type="button" className="pm-admin-button" disabled={disabled || editing !== null} onClick={() => begin('new')}><Plus size={16}/> Add link</button>
        </div>
        {links.length === 0 && <p>No links in this section.</p>}
        {links.map((link, i) => <div className="pm-course-admin-repeat-card" key={i}>
            <strong><Link2 size={14} aria-hidden="true"/> {link.label}</strong>
            <small className="pm-legal-link-destination">{link.href}</small>
            <div className="pm-course-admin-heading pm-course-admin-editor-head">
                <button type="button" className="pm-admin-button" disabled={disabled || editing !== null} onClick={() => begin(link)}><Pencil size={16}/> Edit link</button>
                <button type="button" className="pm-course-admin-remove" disabled={disabled || editing !== null} onClick={() => {
                    if (window.confirm('Remove this link? Its text will remain in the section.')) onChange(replaceLegalLink(body, link, link.label));
                }}><Trash2 size={16}/> Remove link</button>
            </div>
        </div>)}
        {editing !== null && <div className="pm-course-admin-repeat-card" onKeyDown={event => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) { event.preventDefault(); apply(); } }}>
            <h4>{editing === 'new' ? 'Add link to end of section' : 'Edit existing link'}</h4>
            <label className="pm-admin-field"><span>Link text</span><input disabled={disabled} value={label} maxLength={180} onChange={event => setLabel(event.target.value)}/></label>
            <label className="pm-admin-field"><span>Destination</span><input disabled={disabled} value={href} maxLength={2048} placeholder="/contact or https://example.com" onChange={event => setHref(event.target.value)}/></label>
            {error && <p className="pm-admin-error" role="alert">{error}</p>}
            <div className="pm-course-admin-heading pm-course-admin-editor-head">
                <button type="button" className="pm-admin-button" onClick={() => {setEditing(null); setError('');}}>Cancel</button>
                <button type="button" className="pm-admin-button pm-admin-button-primary" disabled={disabled} onClick={apply}>Apply link</button>
            </div>
        </div>}
        <p>Apply link updates the section text. Save the draft and publish to make changes public.</p>
    </div>;
}
