import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { Brand } from '@/components/pm/Brand';
import { FormField } from '@/components/pm/FormField';
import { ActionButton } from '@/components/pm/ActionButton';

export default function Login({ status, canResetPassword }: { status?: string; canResetPassword: boolean }) {
    const [visible, setVisible] = useState(false);
    const form = useForm({ email: '', password: '', remember: false });
    return <div className="pm-app pm-auth-shell"><Head title="Log in"/><header className="pm-auth-header"><Brand/><p>New to PM Circle? <Link href="/register">Join free</Link></p></header>
        <main className="pm-auth-main"><section className="pm-auth-card"><div className="pm-auth-intro"><h1>Welcome back.</h1><p>Log in to continue growing with your circle.</p></div>
            {status && <p className="pm-verified" role="status">{status}</p>}
            <form onSubmit={e => { e.preventDefault(); form.post('/login', { onFinish: () => form.reset('password') }); }}>
                <FormField label="Email address" htmlFor="email" error={form.errors.email}><input autoFocus id="email" type="email" autoComplete="email" value={form.data.email} onChange={e => form.setData('email', e.target.value)} placeholder="you@example.com" required/></FormField>
                <FormField label="Password" htmlFor="password" error={form.errors.password}><div className="pm-password-wrap"><input id="password" type={visible ? 'text' : 'password'} autoComplete="current-password" value={form.data.password} onChange={e => form.setData('password', e.target.value)} placeholder="Your password" required/><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div></FormField>
                <div className="flex justify-between items-center mb-5"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.data.remember} onChange={e => form.setData('remember', e.target.checked)}/> Remember me</label>{canResetPassword && <Link href="/forgot-password" className="pm-text-link">Forgot password?</Link>}</div>
                <ActionButton type="submit" className="pm-auth-submit" forward disabled={form.processing}>Log in</ActionButton>
                <p className="pm-auth-note"><LockKeyhole size={16}/>Your account is protected with secure authentication.</p>
                <p className="pm-auth-footnote">Don't have an account? <Link href="/register" className="pm-text-link">Join the circle — free</Link></p>
            </form>
        </section><p className="pm-auth-bottom">Learn together. Practise daily. Grow your career.</p></main></div>;
}
