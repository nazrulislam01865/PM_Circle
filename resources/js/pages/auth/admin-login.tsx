import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Brand } from '@/components/pm/Brand';

/** Administrator login is not a member login or member dashboard page. */
export default function AdminLogin() {
    const [showPassword, setShowPassword] = useState(false);
    const form = useForm({ email: '', password: '' });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post('/admin/login', { onFinish: () => form.reset('password') });
    };

    return <div className="pm-admin-login-shell">
        <Head title="Administrator sign in · PM Circle" />
        <header className="pm-auth-header pm-admin-login-header" aria-label="PM Circle branding">
            <Brand />
        </header>
        <main className="pm-admin-login-main">
            <section className="pm-admin-login-card" aria-labelledby="pm-admin-login-title">
                <span className="pm-admin-login-emblem"><ShieldCheck size={23} aria-hidden="true" /></span>
                <h1 id="pm-admin-login-title">Administrator sign in</h1>
                <p className="pm-admin-login-description">Use your administrator account to manage PM Circle. Member accounts cannot access this area.</p>
                <form onSubmit={submit} className="pm-admin-login-form">
                    <div className="pm-admin-field"><label htmlFor="admin-email">Email address</label>
                        <input id="admin-email" type="email" autoComplete="username" autoFocus required value={form.data.email}
                            aria-invalid={Boolean(form.errors.email)} aria-describedby={form.errors.email ? 'admin-email-error' : undefined}
                            onChange={event => form.setData('email', event.target.value)} placeholder="admin@example.com" />
                        {form.errors.email && <span className="pm-admin-error" id="admin-email-error" role="alert">{form.errors.email}</span>}
                    </div>
                    <div className="pm-admin-field"><label htmlFor="admin-password">Password</label>
                        <div className="pm-admin-login-password">
                            <input id="admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                                value={form.data.password} onChange={event => form.setData('password', event.target.value)}
                                aria-invalid={Boolean(form.errors.password)} aria-describedby={form.errors.password ? 'admin-password-error' : undefined} />
                            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                                onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
                        </div>
                        {form.errors.password && <span className="pm-admin-error" id="admin-password-error" role="alert">{form.errors.password}</span>}
                    </div>
                    <button type="submit" className="pm-admin-button pm-admin-button-primary pm-admin-login-submit" disabled={form.processing}>
                        {form.processing ? 'Signing in…' : 'Sign in to administration'}
                    </button>
                    <p className="pm-admin-login-security"><LockKeyhole size={16} aria-hidden="true" /> Protected administrator access</p>
                </form>
            </section>
            <p className="pm-admin-login-back">Not an administrator? <Link href="/login">Member sign in</Link></p>
        </main>
    </div>;
}
