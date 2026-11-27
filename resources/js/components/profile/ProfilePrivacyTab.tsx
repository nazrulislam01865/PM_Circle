import { useState, type ReactNode } from 'react';
import { router } from '@inertiajs/react';
import { PMDropdown } from '@/components/pm/PMDropdown';

export type ProfilePrivacyAudience = 'public' | 'community' | 'private';
export type ProfilePrivacyFieldGroup = {
    title: string;
    fields: Array<{ key: string; label: string }>;
};

export type ProfileGlobalVisibility = 'public' | 'members_only' | 'private';

type PreviewAudience = 'visitor' | 'member' | 'employer';

type Props = {
    groups: ProfilePrivacyFieldGroup[];
    initialVisibility: Record<string, ProfilePrivacyAudience>;
    globalVisibility: string;
};

const audienceOptions: Array<{ value: ProfilePrivacyAudience; label: string }> = [
    { value: 'public', label: 'Public' },
    { value: 'community', label: 'Community only' },
    { value: 'private', label: 'Only me' },
];

const previewOptions: Array<{ value: PreviewAudience; label: string }> = [
    { value: 'visitor', label: 'Signed-out visitor' },
    { value: 'member', label: 'Community member' },
    { value: 'employer', label: 'Employer' },
];

/** Read-only preview uses only saved choices and never fetches another member's data. */
function audienceCanSee(choice: ProfilePrivacyAudience, audience: PreviewAudience, globalVisibility: string): boolean {
    if (globalVisibility === 'private') return false;
    if (globalVisibility === 'members_only' && audience === 'visitor') return false;
    return choice === 'public' || (choice === 'community' && audience !== 'visitor');
}

function VisibilityFields({
    group, choices, disabled, onChange, centralized = false,
}: {
    centralized?: boolean;
    group: ProfilePrivacyFieldGroup;
    choices: Record<string, ProfilePrivacyAudience>;
    disabled: boolean;
    onChange: (key: string, audience: ProfilePrivacyAudience) => void;
}) {
    return <fieldset className="pm-privacy-fieldset" disabled={disabled}>
        <legend className="pm-privacy-legend">{group.title}</legend>
        {group.fields.map((field) => <div className="pm-privacy-field-row" key={field.key}>
            <label htmlFor={`privacy-${field.key}`} className="pm-privacy-field-label">{field.label}</label>
            {centralized ? <PMDropdown id={`privacy-${field.key}`} value={choices[field.key] ?? 'community'} options={audienceOptions} placeholder="Choose visibility" required disabled={disabled} className="pm-privacy-select" aria-label={field.label} onValueChange={value => onChange(field.key, value as ProfilePrivacyAudience)}/> : <select
                id={`privacy-${field.key}`}
                className="pm-select pm-privacy-select"
                value={choices[field.key] ?? 'community'}
                onChange={(event) => onChange(field.key, event.target.value as ProfilePrivacyAudience)}
            >
                {audienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>}
        </div>)}
    </fieldset>;
}

function VisibilityExplanation() {
    return <section className="pm-card pm-privacy-side-card" aria-labelledby="privacy-options-heading">
        <h3 id="privacy-options-heading">Visibility options</h3>
        <dl className="pm-privacy-definitions">
            <div><dt>Public</dt><dd>Anyone, including signed-out visitors, community members, and employers.</dd></div>
            <div><dt>Community only</dt><dd>Signed-in PM Circle community members and employers.</dd></div>
            <div><dt>Only me</dt><dd>Only you.</dd></div>
        </dl>
    </section>;
}

function SavedVisibilityPreview({
    groups, saved, globalVisibility,
}: Pick<Props, 'groups' | 'globalVisibility'> & { saved: Record<string, ProfilePrivacyAudience> }) {
    const [selected, setSelected] = useState<PreviewAudience | null>(null);
    const visibleFields = selected === null ? [] : groups.flatMap((group) => group.fields)
        .filter((field) => audienceCanSee(saved[field.key] ?? 'community', selected, globalVisibility));

    return <section className="pm-card pm-privacy-side-card" aria-labelledby="privacy-preview-heading">
        <h3 id="privacy-preview-heading">Preview saved visibility</h3>
        <p>See the profile as each audience would see it.</p>
        <div className="pm-privacy-preview-buttons" role="group" aria-label="Preview profile audience">
            {previewOptions.map((option) => <button
                key={option.value}
                type="button"
                className={`pm-btn pm-btn-secondary pm-privacy-preview-btn${selected === option.value ? ' is-selected' : ''}`}
                aria-pressed={selected === option.value}
                onClick={() => setSelected((previous) => previous === option.value ? null : option.value)}
            >{option.label}</button>)}
        </div>
        {selected && <div className="pm-privacy-preview-details" role="status" aria-live="polite">
            <strong>Visible fields for {previewOptions.find((option) => option.value === selected)?.label}</strong>
            {visibleFields.length ? <ul>{visibleFields.map((field) => <li key={field.key}>{field.label}</li>)}</ul>
                : <p>No profile fields are shared with this audience.</p>}
            <p className="pm-privacy-preview-note">This is a preview of saved field settings. Fields without profile data do not appear on the public profile.</p>
        </div>}
    </section>;
}

/** Shared privacy fields; supporting information is optional for embedded settings. */
export function ProfilePrivacyEditor({ groups, choices, saved, globalVisibility, savedGlobalVisibility, disabled, onChange, onGlobalChange, children, showSidebar = true, centralized = true }: {
    groups: ProfilePrivacyFieldGroup[];
    choices: Record<string, ProfilePrivacyAudience>;
    saved: Record<string, ProfilePrivacyAudience>;
    globalVisibility: string;
    savedGlobalVisibility: string;
    disabled: boolean;
    onChange: (key: string, audience: ProfilePrivacyAudience) => void;
    onGlobalChange: (value: ProfileGlobalVisibility) => void;
    children?: ReactNode;
    showSidebar?: boolean;
    centralized?: boolean;
}) {
    return <div className={`pm-privacy-layout${showSidebar ? '' : ' pm-privacy-layout--full'}`}>
        <section className="pm-card pm-privacy-main" aria-labelledby="privacy-editor-heading">
            <div className="pm-privacy-intro">
                <h2 id="privacy-editor-heading">Profile visibility</h2>
                <p>Set who can see each field and section.</p>
            </div>
            <div className="pm-privacy-groups">
                <fieldset className="pm-privacy-fieldset" disabled={disabled}>
                    <legend className="pm-privacy-legend">Profile audience</legend>
                    <div className="pm-privacy-field-row">
                        <label htmlFor="privacy-global" className="pm-privacy-field-label">Who can open your profile</label>
                        {centralized ? <PMDropdown id="privacy-global" value={globalVisibility} options={[{value:'public',label:'Public'},{value:'members_only',label:'Community only'},{value:'private',label:'Only me'}]} placeholder="Choose audience" required disabled={disabled} className="pm-privacy-select" aria-label="Who can open your profile" onValueChange={value => onGlobalChange(value as ProfileGlobalVisibility)}/> : <select id="privacy-global" className="pm-select pm-privacy-select" value={globalVisibility} onChange={event => onGlobalChange(event.target.value as ProfileGlobalVisibility)}>
                            <option value="public">Public</option><option value="members_only">Community only</option><option value="private">Only me</option>
                        </select>}
                    </div>
                    <p className="pm-privacy-confidential pm-privacy-audience-note">Individual field choices can restrict, but cannot expand, your profile audience.</p>
                </fieldset>
                {groups.map(group => <VisibilityFields key={group.title} group={group} choices={choices} onChange={onChange} disabled={disabled} centralized={centralized}/>)}
            </div>
            <p className="pm-privacy-confidential">Your account contact details and uploaded CV are visible only to you.</p>
            {children}
        </section>
        {showSidebar && <aside className="pm-privacy-aside" aria-label="Privacy information">
            <VisibilityExplanation />
            <SavedVisibilityPreview groups={groups} saved={saved} globalVisibility={savedGlobalVisibility} />
        </aside>}
    </div>;
}

export function ProfilePrivacyTab({ groups, initialVisibility, globalVisibility }: Props) {
    const [choices, setChoices] = useState<Record<string, ProfilePrivacyAudience>>({ ...initialVisibility });
    const [savedChoices, setSavedChoices] = useState<Record<string, ProfilePrivacyAudience>>({ ...initialVisibility });
    const [audience, setAudience] = useState(globalVisibility);
    const [savedAudience, setSavedAudience] = useState(globalVisibility);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const dirty = audience !== savedAudience || Object.keys(choices).some(key => choices[key] !== savedChoices[key]);
    const clearStatus = () => { setMessage(''); setError(''); };
    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving || !dirty) return;
        setSaving(true); clearStatus();
        router.patch('/settings/profile', { field_visibility: choices, visibility: audience, tab: 'privacy' }, {
            preserveScroll: true,
            onSuccess: () => { setSavedChoices({ ...choices }); setSavedAudience(audience); setMessage('Privacy settings saved.'); },
            onError: errors => setError(Object.values(errors)[0] || 'Could not save your privacy settings. Please try again.'),
            onFinish: () => setSaving(false),
        });
    };
    return <form onSubmit={save}>
        <ProfilePrivacyEditor groups={groups} choices={choices} saved={savedChoices} globalVisibility={audience} savedGlobalVisibility={savedAudience} disabled={saving}
            onChange={(key, value) => { setChoices(current => ({ ...current, [key]: value })); clearStatus(); }}
            onGlobalChange={value => { setAudience(value); clearStatus(); }}>
            {error && <p className="pm-privacy-error" role="alert">{error}</p>}
            {message && <p className="pm-privacy-success" role="status">{message}</p>}
            <div className="pm-privacy-actions">
                <button type="button" className="pm-btn pm-btn-secondary pm-privacy-save" disabled={saving || !dirty} onClick={() => { setChoices({ ...savedChoices }); setAudience(savedAudience); clearStatus(); }}>Discard</button>
                <button type="submit" className="pm-btn pm-btn-primary pm-privacy-save" disabled={saving || !dirty || !groups.length}>{saving ? 'Saving...' : 'Save privacy settings'}</button>
            </div>
        </ProfilePrivacyEditor>
    </form>;
}
