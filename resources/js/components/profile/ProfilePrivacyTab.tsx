import { useState } from 'react';
import { router } from '@inertiajs/react';

export type ProfilePrivacyAudience = 'public' | 'community' | 'private';
export type ProfilePrivacyFieldGroup = {
    title: string;
    fields: Array<{ key: string; label: string }>;
};

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
    group, choices, disabled, onChange,
}: {
    group: ProfilePrivacyFieldGroup;
    choices: Record<string, ProfilePrivacyAudience>;
    disabled: boolean;
    onChange: (key: string, audience: ProfilePrivacyAudience) => void;
}) {
    return <fieldset className="pm-privacy-fieldset" disabled={disabled}>
        <legend className="pm-privacy-legend">{group.title}</legend>
        {group.fields.map((field) => <div className="pm-privacy-field-row" key={field.key}>
            <label htmlFor={`privacy-${field.key}`} className="pm-privacy-field-label">{field.label}</label>
            <select
                id={`privacy-${field.key}`}
                className="pm-select pm-privacy-select"
                value={choices[field.key] ?? 'community'}
                onChange={(event) => onChange(field.key, event.target.value as ProfilePrivacyAudience)}
            >
                {audienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
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

export function ProfilePrivacyTab({ groups, initialVisibility, globalVisibility }: Props) {
    const [choices, setChoices] = useState<Record<string, ProfilePrivacyAudience>>({ ...initialVisibility });
    const [savedChoices, setSavedChoices] = useState<Record<string, ProfilePrivacyAudience>>({ ...initialVisibility });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const changeChoice = (key: string, audience: ProfilePrivacyAudience) => {
        setChoices((current) => ({ ...current, [key]: audience }));
        setMessage('');
        setError('');
    };

    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');
        router.patch('/settings/profile', { field_visibility: choices, tab: 'privacy' }, {
            preserveScroll: true,
            onSuccess: () => {
                setSavedChoices({ ...choices });
                setMessage('Privacy settings saved.');
            },
            onError: (errors) => {
                setError(Object.values(errors)[0] || 'Could not save your privacy settings. Please try again.');
            },
            onFinish: () => setSaving(false),
        });
    };

    return <div className="pm-privacy-layout">
        <form className="pm-card pm-privacy-main" onSubmit={save} aria-labelledby="privacy-editor-heading">
            <div className="pm-privacy-intro">
                <h2 id="privacy-editor-heading">Profile visibility</h2>
                <p>Set who can see each field and section.</p>
            </div>
            <div className="pm-privacy-groups">
                {groups.map((group) => <VisibilityFields
                    key={group.title}
                    group={group}
                    choices={choices}
                    onChange={changeChoice}
                    disabled={saving}
                />)}
            </div>
            <p className="pm-privacy-confidential">Your account contact details and uploaded CV are visible only to you.</p>
            {error && <p className="pm-privacy-error" role="alert">{error}</p>}
            {message && <p className="pm-privacy-success" role="status">{message}</p>}
            <button type="submit" className="pm-btn pm-btn-primary pm-privacy-save" disabled={saving || !groups.length}>
                {saving ? 'Saving...' : 'Save privacy settings'}
            </button>
        </form>
        <aside className="pm-privacy-aside" aria-label="Privacy information">
            <VisibilityExplanation />
            <SavedVisibilityPreview groups={groups} saved={savedChoices} globalVisibility={globalVisibility} />
        </aside>
    </div>;
}
