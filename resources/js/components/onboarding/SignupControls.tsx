import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';

export function SignupField({ id, label, optional, required, error, hint, children }: {
    id: string; label: string; optional?: boolean; required?: boolean; error?: string; hint?: string; children: ReactNode;
}) {
    return (
        <div className="signup-field">
            <label htmlFor={id} className="signup-label">{label}{required && <span className="signup-required"> *</span>}{optional && <span className="signup-optional"> (optional)</span>}</label>
            {children}
            {hint && <p id={`${id}-hint`} className="signup-hint">{hint}</p>}
            {error && <p id={`${id}-error`} role="alert" className="signup-error">{error}</p>}
        </div>
    );
}

export function SignupInput({ invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
    return <input {...props} aria-invalid={invalid || undefined} className={`signup-input ${invalid ? 'is-invalid' : ''} ${props.className || ''}`} />;
}

export function SignupPassword({ visible, onToggle, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { visible: boolean; onToggle: () => void; invalid?: boolean }) {
    return (
        <div className="signup-input-icon-wrap">
            <SignupInput {...props} invalid={invalid} type={visible ? 'text' : 'password'} />
            <button type="button" className="signup-icon-toggle" disabled={props.disabled} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={onToggle}>
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
        </div>
    );
}

type SignupButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'outline' | 'link'; forward?: boolean;
};
export function SignupButton({ variant = 'primary', forward = false, children, className = '', ...props }: SignupButtonProps) {
    return (
        <button {...props} className={`signup-button signup-button--${variant} ${className}`}>
            {children}{forward && <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />}
        </button>
    );
}

export function SignupSectionTitle({ number, title, locked = false, verified = false }: {
    number: number; title: string; locked?: boolean; verified?: boolean;
}) {
    return (
        <div className={`signup-section-heading ${locked ? 'is-locked' : ''}`}>
            <span className="signup-section-number">{number}</span>
            {locked && <LockKeyhole size={14} className="signup-locked-icon" aria-hidden="true" />}
            <h2>{title}</h2>
            {verified && <span className="signup-verified">Verified</span>}
        </div>
    );
}
