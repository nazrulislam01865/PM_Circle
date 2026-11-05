import type { ReactNode } from 'react';
import { AuthPageFrame } from '@/layouts/pm/AuthPageFrame';

export function OnboardingLayout({ children, step, title, subtitle }: {
    children: ReactNode;
    step?: 1 | 2 | 3;
    title: string;
    subtitle?: string;
}) {
    return (
        <AuthPageFrame
            className={`pm-signup signup-step-${step ?? 1}`}
            headerPrompt="Already a member?"
            headerLinkHref="/login"
            headerLinkLabel="Log in"
        >
            <section className="pm-auth-card signup-card" aria-label={title}>
                {step && (
                    <div className="signup-stepper" aria-label={`Step ${step} of 3`}>
                        <span>Step {step} of 3</span>
                        <div className="signup-step-bars" aria-hidden="true">
                            {[1, 2, 3].map((n) => <span key={n} className={n <= step ? 'is-active' : ''} />)}
                        </div>
                    </div>
                )}
                <div className="signup-intro">
                    <h1>{title}</h1>
                    {subtitle && <p>{subtitle}</p>}
                </div>
                {children}
            </section>
        </AuthPageFrame>
    );
}
