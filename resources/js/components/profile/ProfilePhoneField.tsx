import { useMemo, useState } from 'react';

const countryCodes = [
    ['+880', 'Bangladesh'], ['+1', 'US / Canada'], ['+44', 'United Kingdom'],
    ['+91', 'India'], ['+971', 'UAE'], ['+966', 'Saudi Arabia'],
    ['+65', 'Singapore'], ['+61', 'Australia'], ['+49', 'Germany'],
    ['+33', 'France'], ['+60', 'Malaysia'], ['+81', 'Japan'],
] as const;

function parsePhone(value: string, country: string): { code: string; local: string } {
    const match = countryCodes.find(([prefix]) => value.startsWith(prefix));
    if (match) return { code: match[0], local: value.slice(match[0].length).trim() };
    if (value.startsWith('+')) {
        const unknown = value.match(/^(\+\d{1,4})[\s-]+(.*)$/);
        if (unknown) return { code: unknown[1], local: unknown[2] };
    }
    const preferred = countryCodes.find(([, name]) => name.toLowerCase().includes(country.toLowerCase()) && country !== '');
    return { code: preferred?.[0] ?? '+880', local: value.replace(/^\+/, '') };
}

export function ProfilePhoneField({ value, country, onChange }: { value: string; country: string; onChange: (value: string) => void }) {
    const parsed = useMemo(() => parsePhone(value, country), [value, country]);
    const [customCode, setCustomCode] = useState('');
    const [customMode, setCustomMode] = useState(false);
    const known = !customMode && countryCodes.some(([code]) => code === parsed.code);
    const code = customMode ? (customCode || parsed.code) : parsed.code;
    const update = (nextCode: string, nextLocal: string) => {
        const cleaned = nextLocal.replace(/[^\d\s()-]/g, '');
        onChange(cleaned.trim() ? `${nextCode} ${cleaned.trim()}` : '');
    };

    return <div className="pm-profile-phone-field">
        <div className="pm-form-group pm-profile-phone-code">
            <label htmlFor="pm-profile-phone-country" className="pm-label">Country code</label>
            <select id="pm-profile-phone-country" className="pm-select" value={known ? parsed.code : 'other'}
                onChange={(event) => {
                    if (event.target.value === 'other') { setCustomMode(true); setCustomCode('+'); return; }
                    setCustomMode(false); setCustomCode(''); update(event.target.value, parsed.local);
                }}>
                {countryCodes.map(([dial, label]) => <option key={dial} value={dial}>{dial} ({label})</option>)}
                <option value="other">Other code</option>
            </select>
        </div>
        <div className="pm-form-group pm-profile-phone-number">
            <label htmlFor="pm-profile-phone" className="pm-label">Phone number (private, optional)</label>
            <div className="pm-profile-phone-number-wrap">
                {!known && <input aria-label="Country calling code" className="pm-input pm-profile-custom-code" value={code}
                    onChange={(event) => setCustomCode(event.target.value.replace(/[^+\d]/g, '').slice(0, 5))}
                    onBlur={() => { if (/^\+\d{1,4}$/.test(code)) update(code, parsed.local); }} />}
                <input id="pm-profile-phone" type="tel" inputMode="tel" autoComplete="tel-national" className="pm-input"
                    placeholder="e.g. 1712 345678" value={parsed.local}
                    onChange={(event) => update(code, event.target.value)} />
            </div>
        </div>
    </div>;
}
