import { Check, X } from 'lucide-react';

export const passwordCriteria = [
    { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
    { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
    { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
    { label: 'One number', test: (value: string) => /\d/.test(value) },
    { label: 'One special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export function meetsPasswordRequirements(password: string, confirmation: string): boolean {
    return passwordCriteria.every(({ test }) => test(password)) && password === confirmation && confirmation.length > 0;
}

export function SignupPasswordRequirements({ password, confirmation }: { password: string; confirmation: string }) {
    if (!password && !confirmation) return <p id="signup-password-rules" className="signup-hint">Use at least 8 characters with uppercase, lowercase, number and special character.</p>;
    return <div id="signup-password-rules" className="signup-password-rules" aria-live="polite" aria-label="Password requirements">
        {passwordCriteria.map(({ label, test }) => {
            const passed = test(password);
            return <span key={label} className={passed ? 'is-valid' : 'is-invalid'}>{passed ? <Check size={15} /> : <X size={15} />}{label}</span>;
        })}
        {confirmation.length > 0 && <span className={password === confirmation ? 'is-valid' : 'is-invalid'}>
            {password === confirmation ? <Check size={15} /> : <X size={15} />}
            {password === confirmation ? 'Passwords match' : 'Passwords do not match'}
        </span>}
    </div>;
}
