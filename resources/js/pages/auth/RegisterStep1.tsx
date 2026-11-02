import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { OnboardingLayout } from '@/layouts/pm/OnboardingLayout';

export default function RegisterStep1() {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);

    // Verification states
    const [codeSent, setCodeSent] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [verifyingCode, setVerifyingCode] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [codeError, setCodeError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [devCodeNotice, setDevCodeNotice] = useState<string | null>(null);

    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        legal_acceptance: true,
    });

    const handleSendCode = async () => {
        if (!form.data.email || !form.data.email.includes('@')) {
            setEmailError('Please enter a valid email address.');
            return;
        }

        setEmailError(null);
        setCodeError(null);
        setSendingCode(true);

        try {
            const response = await fetch('/api/auth/send-verification-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ email: form.data.email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setEmailError(data.message || 'Failed to send verification code.');
            } else {
                setCodeSent(true);
                if (data.dev_code) {
                    setDevCodeNotice(`(Dev code: ${data.dev_code} or use 123456)`);
                }
            }
        } catch {
            setEmailError('An error occurred while sending the code.');
        } finally {
            setSendingCode(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!verificationCode.trim()) {
            setCodeError('Please enter the 6-digit code.');
            return;
        }

        setCodeError(null);
        setVerifyingCode(true);

        try {
            const response = await fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    email: form.data.email,
                    code: verificationCode.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setCodeError('Incorrect code. Please try again.');
            } else {
                setEmailVerified(true);
                setCodeError(null);
                setDevCodeNotice(null);
            }
        } catch {
            setCodeError('Verification failed. Please try again.');
        } finally {
            setVerifyingCode(false);
        }
    };

    const canSubmit =
        emailVerified &&
        form.data.password.length >= 8 &&
        form.data.password === form.data.confirm_password;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        form.post('/register', {
            onFinish: () => form.reset('password', 'password_confirmation'),
        });
    };

    return (
        <OnboardingLayout title="Create your account" step={1}>
            <Head title="Create your account" />

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* SECTION 1: Verify your email */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            1
                        </span>
                        <h2 className="text-base font-bold text-slate-900">Verify your email</h2>
                        {emailVerified && (
                            <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                            </span>
                        )}
                    </div>

                    {/* Email Input row */}
                    <div className="space-y-1.5">
                        <label htmlFor="email" className="block text-sm font-semibold text-slate-800">
                            Email address
                        </label>
                        <div className="flex gap-2.5">
                            <input
                                id="email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                value={form.data.email}
                                onChange={(e) => {
                                    form.setData('email', e.target.value);
                                    if (emailVerified) setEmailVerified(false);
                                    if (emailError) setEmailError(null);
                                }}
                                disabled={emailVerified}
                                required
                                placeholder="sara@example.com"
                                className={`flex-1 px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors ${
                                    emailError ? 'border-red-500' : 'border-slate-300'
                                } ${emailVerified ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                            />
                            <button
                                type="button"
                                onClick={handleSendCode}
                                disabled={sendingCode || emailVerified || !form.data.email}
                                className="px-4 py-2.5 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold text-sm whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sendingCode ? (
                                    <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                                ) : codeSent ? (
                                    'Resend code'
                                ) : (
                                    'Send code'
                                )}
                            </button>
                        </div>
                        {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
                        {devCodeNotice && <p className="text-xs text-blue-600 mt-1">{devCodeNotice}</p>}
                    </div>

                    {/* Verification Code Input row (shown after sending code or if unverified) */}
                    {codeSent && !emailVerified && (
                        <div className="space-y-1.5 pt-1">
                            <label htmlFor="verification_code" className="block text-sm font-semibold text-slate-800">
                                Verification code
                            </label>
                            <div className="relative">
                                <input
                                    id="verification_code"
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => {
                                        setVerificationCode(e.target.value);
                                        if (codeError) setCodeError(null);
                                    }}
                                    maxLength={6}
                                    placeholder="123456"
                                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm tracking-widest text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors ${
                                        codeError
                                            ? 'border-red-500 bg-red-50/20 text-red-900 pr-10 focus:ring-2 focus:ring-red-500/20'
                                            : 'border-slate-300 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600'
                                    }`}
                                />
                                {codeError && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                )}
                            </div>

                            {/* Error text matching mockup */}
                            {codeError && <p className="text-xs font-normal text-red-600">{codeError}</p>}

                            {/* Sub actions row: Resend code (left) & Verify email (right) */}
                            <div className="flex items-center justify-between pt-1">
                                <button
                                    type="button"
                                    onClick={handleSendCode}
                                    disabled={sendingCode}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                    Resend code
                                </button>
                                <button
                                    type="button"
                                    onClick={handleVerifyCode}
                                    disabled={verifyingCode || !verificationCode}
                                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {verifyingCode ? 'Verifying...' : 'Verify email'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* SECTION 2: Create your password */}
                <div className={`space-y-4 pt-2 border-t border-slate-100 ${!emailVerified ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-2">
                        <span
                            className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-xs ${
                                emailVerified
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                            2
                        </span>
                        {!emailVerified && <Lock className="w-4 h-4 text-slate-400" />}
                        <h2 className="text-base font-bold text-slate-900">Create your password</h2>
                    </div>

                    {/* Password field */}
                    <div className="space-y-1.5">
                        <label htmlFor="password" className="block text-sm font-semibold text-slate-800">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={passwordVisible ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                                disabled={!emailVerified}
                                minLength={8}
                                placeholder="Create a secure password"
                                className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-slate-50 disabled:cursor-not-allowed transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setPasswordVisible(!passwordVisible)}
                                disabled={!emailVerified}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                            >
                                {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm password field */}
                    <div className="space-y-1.5">
                        <label htmlFor="password_confirmation" className="block text-sm font-semibold text-slate-800">
                            Confirm password
                        </label>
                        <div className="relative">
                            <input
                                id="password_confirmation"
                                name="password_confirmation"
                                type={confirmVisible ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={form.data.password_confirmation}
                                onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                disabled={!emailVerified}
                                minLength={8}
                                placeholder="Confirm your password"
                                className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-slate-50 disabled:cursor-not-allowed transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setConfirmVisible(!confirmVisible)}
                                disabled={!emailVerified}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                aria-label={confirmVisible ? 'Hide password' : 'Show password'}
                            >
                                {confirmVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {form.data.password && form.data.password_confirmation && form.data.password !== form.data.password_confirmation && (
                            <p className="text-xs text-red-500">Passwords do not match.</p>
                        )}
                        {form.errors.password && <p className="text-xs text-red-500">{form.errors.password}</p>}
                    </div>
                </div>

                {/* Continue button */}
                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={!canSubmit || form.processing}
                        className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
                            canSubmit && !form.processing
                                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                : 'bg-slate-300 text-white cursor-not-allowed'
                        }`}
                    >
                        {form.processing ? 'Creating account...' : 'Continue →'}
                    </button>
                    <p className="text-center text-xs font-normal text-slate-400 mt-4">
                        Next: Your professional details
                    </p>
                </div>
            </form>
        </OnboardingLayout>
    );
}
