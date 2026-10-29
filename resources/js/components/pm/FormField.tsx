import type { ReactNode } from 'react';

export function FormField({ label, htmlFor, error, children, hint }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode }) {
    return <div className="pm-field"><label htmlFor={htmlFor}>{label}</label>{children}{hint && <small>{hint}</small>}{error && <p className="pm-error" role="alert">{error}</p>}</div>;
}
