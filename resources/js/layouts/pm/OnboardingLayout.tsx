import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Brand } from '@/components/pm/Brand';

export function OnboardingLayout({
    children,
    step,
    title,
    subtitle,
    showFooter = false,
}: {
    children: ReactNode;
    step?: number;
    title: string;
    subtitle?: string;
    showFooter?: boolean;
}) {
    return (
        <div className="pm-app pm-auth-shell min-h-screen bg-[#f8fafc] flex flex-col justify-between">
            <header className="pm-auth-header bg-white">
                <Brand />
                <p>
                    Already a member? <Link href="/login">Log in</Link>
                </p>
            </header>
            <main className="pm-auth-main my-8 flex-1 flex flex-col items-center">
                <section className="pm-auth-card w-full max-w-[580px] bg-white" aria-label={title}>
                    {step && (
                        <div className="pm-stepper text-center mb-6">
                            <p className="text-xs font-medium text-slate-500 mb-2">Step {step} of 3</p>
                            <div className="pm-step-bars flex justify-center gap-2" aria-label={`Step ${step} of 3`}>
                                {[1, 2, 3].map((n) => (
                                    <span
                                        key={n}
                                        className={`w-11 h-1 rounded-full transition-colors ${
                                            n === step
                                                ? 'bg-blue-600'
                                                : n < step
                                                  ? 'bg-blue-600'
                                                  : 'bg-slate-200'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="pm-auth-intro text-center mb-6">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
                        {subtitle && <p className="text-sm sm:text-base text-slate-600 mt-2">{subtitle}</p>}
                    </div>
                    {children}
                </section>
                {showFooter && (
                    <p className="pm-auth-bottom text-center text-xs text-slate-400 mt-6">
                        Learn together. Practise daily. Grow your career.
                    </p>
                )}
            </main>
        </div>
    );
}
