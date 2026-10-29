import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Brand } from '@/components/pm/Brand';

export function OnboardingLayout({ children, step, title, subtitle, verified = false }: { children: ReactNode; step?: number; title: string; subtitle: string; verified?: boolean }) {
    const { emailVerificationRequired } = usePage<{ emailVerificationRequired: boolean }>().props;
    return <div className="pm-app pm-auth-shell">
        <header className="pm-auth-header"><Brand /><p>Already a member? <Link href="/login">Log in</Link></p></header>
        <main className="pm-auth-main"><section className="pm-auth-card" aria-label={title}>
            {step && <div className="pm-stepper"><p>Step {step} of 3</p><div className="pm-step-bars" aria-label={`Step ${step} of 3`}>{[1,2,3].map(n => <span key={n} className={n <= step ? 'active' : ''} />)}</div></div>}
            <div className="pm-auth-intro"><h1>{title}</h1><p>{subtitle}</p>{verified && <div className="pm-verified">✓ &nbsp;{emailVerificationRequired ? 'Email verified' : 'Email verification not required'}</div>}</div>
            {children}
        </section><p className="pm-auth-bottom">Learn together. Practise daily. Grow your career.</p></main>
    </div>;
}
