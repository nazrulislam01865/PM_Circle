import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { useState } from 'react';
import { OnboardingLayout } from '@/layouts/pm/OnboardingLayout';
import { FormField } from '@/components/pm/FormField';
import { ActionButton } from '@/components/pm/ActionButton';

export default function RegisterStep1() {
    const [visible, setVisible] = useState(false);
    const form = useForm({ name: '', email: '', password: '', password_confirmation: '', legal_acceptance: false });
    return <OnboardingLayout title="Join the circle" subtitle="Start with the basics. It takes about a minute." step={1}><Head title="Join the circle"/>
        <form onSubmit={e => { e.preventDefault(); form.post('/register', { onFinish: () => form.reset('password', 'password_confirmation') }); }}>
            <FormField label="Full name" htmlFor="name" error={form.errors.name}><input id="name" autoComplete="name" name="name" value={form.data.name} onChange={e => form.setData('name', e.target.value)} required maxLength={255} autoFocus placeholder="Your full name"/></FormField>
            <FormField label="Email address" htmlFor="email" error={form.errors.email}><input id="email" type="email" name="email" autoComplete="email" value={form.data.email} onChange={e => form.setData('email', e.target.value)} required placeholder="you@example.com"/></FormField>
            <FormField label="Password" htmlFor="password" error={form.errors.password} hint="Use at least 8 characters."><div className="pm-password-wrap"><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete="new-password" value={form.data.password} onChange={e => form.setData(d => ({ ...d, password: e.target.value, password_confirmation: e.target.value }))} minLength={8} required placeholder="Create a secure password"/><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={21}/> : <Eye size={21}/>}</button></div></FormField>
            <div className="pm-legal-row"><input id="legal" type="checkbox" checked={form.data.legal_acceptance} onChange={e => form.setData('legal_acceptance', e.target.checked)} required/><label htmlFor="legal">I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms</a> and <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</label></div>
            {form.errors.legal_acceptance && <p className="pm-error" role="alert">{form.errors.legal_acceptance}</p>}
            <ActionButton forward className="pm-auth-submit" type="submit" disabled={form.processing}>Continue</ActionButton>
            <div className="pm-auth-note"><Mail size={20}/>Next, add your professional details. No email verification needed for now.</div><p className="pm-auth-footnote">Free to join. Add your professional details later.</p>
        </form>
    </OnboardingLayout>;
}
