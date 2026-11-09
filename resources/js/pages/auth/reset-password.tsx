import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ActionButton } from '@/components/pm/ActionButton';
import { FormField } from '@/components/pm/FormField';
import { SignupPassword } from '@/components/onboarding/SignupControls';
import { SignupPasswordRequirements, meetsPasswordRequirements } from '@/components/onboarding/SignupPasswordRequirements';
import { AuthPageFrame } from '@/layouts/pm/AuthPageFrame';

type Props = { token: string; email: string };

export default function ResetPassword({ token, email }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const form = useForm({ token, email, password: '', password_confirmation: '' });
    const validPassword = meetsPasswordRequirements(form.data.password, form.data.password_confirmation);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!form.processing && validPassword) {
            form.post('/reset-password', {
                onFinish: () => form.reset('password', 'password_confirmation'),
            });
        }
    }

    return (
        <AuthPageFrame headerPrompt="New to PM Circle?" headerLinkHref="/register" headerLinkLabel="Join free">
            <Head title="Reset password" />
            <section className="pm-auth-card pm-password-reset-card">
                <div className="pm-auth-intro">
                    <h1>Create a new password</h1>
                    <p>Choose a secure password for your PM Circle account.</p>
                </div>
                <form onSubmit={submit}>
                    <FormField label="Email address" htmlFor="reset-account-email" error={form.errors.email}>
                        <input id="reset-account-email" type="email" name="email" value={email} readOnly autoComplete="email" />
                    </FormField>
                    <FormField label="New password" htmlFor="reset-password" error={form.errors.password}>
                        <SignupPassword id="reset-password" name="password" required autoFocus autoComplete="new-password"
                            placeholder="Enter your new password" value={form.data.password}
                            visible={showPassword} onToggle={() => setShowPassword(!showPassword)}
                            onChange={(event) => form.setData('password', event.target.value)}
                            invalid={Boolean(form.errors.password)} />
                    </FormField>
                    <FormField label="Confirm new password" htmlFor="reset-password-confirmation" error={form.errors.password_confirmation}>
                        <SignupPassword id="reset-password-confirmation" name="password_confirmation" required autoComplete="new-password"
                            placeholder="Confirm your new password" value={form.data.password_confirmation}
                            visible={showConfirmation} onToggle={() => setShowConfirmation(!showConfirmation)}
                            onChange={(event) => form.setData('password_confirmation', event.target.value)}
                            invalid={Boolean(form.errors.password_confirmation)} />
                    </FormField>
                    <SignupPasswordRequirements password={form.data.password} confirmation={form.data.password_confirmation} />
                    <ActionButton type="submit" className="pm-password-reset-submit" disabled={form.processing || !validPassword}>
                        <LockKeyhole size={18} aria-hidden="true" />{form.processing ? 'Updating password...' : 'Reset password'}
                    </ActionButton>
                </form>
                <p className="pm-auth-footnote"><Link className="pm-text-link" href="/login"><ArrowLeft size={15} aria-hidden="true" /> Back to log in</Link></p>
            </section>
        </AuthPageFrame>
    );
}
