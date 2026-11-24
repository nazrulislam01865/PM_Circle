import type { ReactNode } from 'react';

export function FormField({ label, htmlFor, error, children, hint }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode }) {
    return <div className="pm-field"><label htmlFor={htmlFor}>{label}</label>{children}{hint && <small id={`${htmlFor}-hint`}>{hint}</small>}{error && <p id={`${htmlFor}-error`} className="pm-error" role="alert">{error}</p>}</div>;
}
