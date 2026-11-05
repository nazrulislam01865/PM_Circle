import { Head, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { SignupButton, SignupField, SignupInput, SignupSectionTitle } from '@/components/onboarding/SignupControls';
import { OnboardingLayout } from '@/layouts/pm/OnboardingLayout';

type ApiResult = { message?: string; verified?: boolean; development_code?: string };
type SignupMode = 'email' | 'fixed' | 'off';

async function verificationRequest(url: string, values: Record<string, string>): Promise<ApiResult> {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    const response = await fetch(url, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': token },
        body: JSON.stringify(values),
    });
    const result = await response.json().catch(() => ({})) as ApiResult;
    if (!response.ok) throw new Error(result.message || 'Please try again.');
    return result;
}

export default function RegisterStep1({ signupVerificationMode = 'email' }: { signupVerificationMode?: SignupMode }) {
    const codeRequired = signupVerificationMode !== 'off';
    const form = useForm({ email: '' });
    const [codeSent, setCodeSent] = useState(false);
    const [code, setCode] = useState('');
    const [verified, setVerified] = useState(false);
    const [busy, setBusy] = useState<'send' | 'verify' | null>(null);
    const [feedback, setFeedback] = useState('');
    const [error, setError] = useState('');

    async function sendCode() {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.data.email.trim())) {
            setError('Enter a valid email address.'); return;
        }
        setBusy('send'); setError(''); setFeedback('');
        try {
            const result = await verificationRequest('/api/auth/send-verification-code', { email: form.data.email.trim() });
            setCodeSent(true); setCode('');
            setFeedback(`${result.message || 'Verification code sent.'}${result.development_code ? ` Local test code: ${result.development_code}` : ''}`);
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to send verification code.'); }
        finally { setBusy(null); }
    }

    async function verifyCode() {
        if (!/^\d{6}$/.test(code)) { setError('Enter the six-digit verification code.'); return; }
        setBusy('verify'); setError('');
        try {
            await verificationRequest('/api/auth/verify-code', { email: form.data.email.trim(), code });
            setVerified(true); setFeedback('Your email is verified. Continue to your professional details.');
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Invalid verification code.'); }
        finally { setBusy(null); }
    }

    function continueToDetails(event: FormEvent) {
        event.preventDefault();
        if (form.processing || (codeRequired && !verified)) return;
        form.post('/join/email');
    }

    return <OnboardingLayout step={1} title="Create your account" subtitle="Verify your email to get started.">
        <Head title="Create your account" />
        <form className="signup-form" onSubmit={continueToDetails}>
            <SignupSectionTitle number={1} title={codeRequired ? 'Verify your email' : 'Enter your email'} verified={verified} />
            <SignupField id="signup-email" label="Email address" required error={form.errors.email}>
                <div className="signup-row">
                    <SignupInput id="signup-email" type="email" autoComplete="email" required placeholder="you@example.com"
                        value={form.data.email} disabled={busy !== null || verified}
                        invalid={!!form.errors.email || !!error}
                        onChange={event => {
                            form.setData('email', event.target.value); setVerified(false); setCodeSent(false);
                            setCode(''); setFeedback(''); setError('');
                        }} />
                    {codeRequired && <SignupButton type="button" variant="outline" disabled={!form.data.email.trim() || busy !== null || verified} onClick={() => void sendCode()}>
                        {busy === 'send' ? 'Sending...' : 'Get code'}
                    </SignupButton>}
                </div>
            </SignupField>
            {codeRequired && codeSent && !verified && <SignupField id="signup-code" label="Verification code" required>
                <div className="signup-row">
                    <SignupInput id="signup-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                        value={code} placeholder="6-digit code" onChange={event => { setCode(event.target.value.replace(/\D/g, '')); setError(''); }} />
                    <SignupButton type="button" disabled={code.length !== 6 || busy !== null} onClick={() => void verifyCode()}>
                        {busy === 'verify' ? 'Verifying...' : 'Verify'}
                    </SignupButton>
                </div>
                <SignupButton type="button" variant="link" disabled={busy !== null} onClick={() => void sendCode()}>Resend code</SignupButton>
            </SignupField>}
            {feedback && <p role="status" className="signup-hint">{feedback}</p>}
            {error && <p role="alert" className="signup-error">{error}</p>}
            <div className="signup-form-actions">
                <SignupButton type="submit" forward disabled={!form.data.email.trim() || (codeRequired && !verified) || form.processing} className="signup-button--full">
                    {form.processing ? 'Continuing...' : 'Continue'}
                </SignupButton>
                <p className="signup-footline">Next: Password and professional details</p>
            </div>
        </form>
    </OnboardingLayout>;
}
