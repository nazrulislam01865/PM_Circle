import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import type { FormEvent } from 'react';
import { ActionButton } from '@/components/pm/ActionButton';
import { FormField } from '@/components/pm/FormField';
import { AuthPageFrame } from '@/layouts/pm/AuthPageFrame';

export default function ForgotPassword({ status, resetLinkMinutes }: { status?: string; resetLinkMinutes: number }) {
    const form = useForm({ email: '' });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!form.processing) form.post('/forgot-password');
    }

    return (
        <AuthPageFrame headerPrompt="New to PM Circle?" headerLinkHref="/register" headerLinkLabel="Join free">
            <Head title="Forgot password" />
            <section className="pm-auth-card pm-password-reset-card">
                <div className="pm-auth-intro">
                    <h1>Forgot your password?</h1>
                    <p>Enter your account email and we'll send you a secure link to create a new password.</p>
                </div>

                {status && <div className="pm-password-reset-status" role="status">
                    <ShieldCheck size={20} aria-hidden="true" />
                    <div><strong>Check your inbox</strong><p>{status}</p><p>This link expires in {resetLinkMinutes} minutes. Check your spam or junk folder if you don't see it.</p></div>
                </div>}

                <form onSubmit={submit}>
                    <FormField label="Email address" htmlFor="reset-email" error={form.errors.email}>
                        <input id="reset-email" type="email" name="email" autoComplete="email" autoFocus required
                            value={form.data.email} onChange={(event) => form.setData('email', event.target.value)}
                            placeholder="you@example.com" aria-invalid={Boolean(form.errors.email)} />
                    </FormField>
                    <ActionButton className="pm-password-reset-submit" type="submit" disabled={form.processing}>
                        <Mail size={18} aria-hidden="true" />{form.processing ? 'Sending link...' : 'Send password reset link'}
                    </ActionButton>
                </form>
                <p className="pm-password-reset-hint"><ShieldCheck size={16} aria-hidden="true" /> Only someone with access to your email can reset the password.</p>
                <p className="pm-auth-footnote"><Link className="pm-text-link" href="/login"><ArrowLeft size={15} aria-hidden="true" /> Back to log in</Link></p>
            </section>
        </AuthPageFrame>
    );
}
