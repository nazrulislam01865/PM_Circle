import { Head, Link, useForm } from '@inertiajs/react';
import { FileUp, Plus, X } from 'lucide-react';
import { SignupPassword } from '@/components/onboarding/SignupControls';
import { SignupPasswordRequirements, meetsPasswordRequirements } from '@/components/onboarding/SignupPasswordRequirements';
import { useRef, useState } from 'react';
import { SignupButton, SignupField, SignupInput } from '@/components/onboarding/SignupControls';
import { PMDropdown } from '@/components/pm/PMDropdown';
import { OnboardingLayout } from '@/layouts/pm/OnboardingLayout';

type Certification = { name: string; credential_number: string };
type SignupOption = { value: string; label: string };
type SignupOptions = Record<'signup_role' | 'signup_experience' | 'signup_certification', SignupOption[]>;
type Props = {
    name?: string;
    isGuest?: boolean;
    email?: string;
    profile?: { role?: string | null; years_experience?: number | null; resume_scan_status?: string } | null;
    certifications?: Certification[];
    signupOptions?: Partial<SignupOptions>;
};
export default function RegisterStep2({ name = '', profile, certifications = [], isGuest = false, email, signupOptions = {} }: Props) {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmationVisible, setConfirmationVisible] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');
    const form = useForm({
        name,
        password: '',
        password_confirmation: '',
        legal_acceptance: false,
        role: profile?.role || '',
        years_experience: profile?.years_experience != null ? String(profile.years_experience) : '',
        certifications: certifications.length ? certifications : [{ name: '', credential_number: '' }],
        resume: null as File | null,
    });
    const updateCertification = (index: number, field: keyof Certification, value: string) => {
        form.setData('certifications', form.data.certifications.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };
    const addCertification = () => {
        if (form.data.certifications.length < 6) form.setData('certifications', [...form.data.certifications, { name: '', credential_number: '' }]);
    };
    const removeCertification = (index: number) => {
        const remaining = form.data.certifications.filter((_, i) => i !== index);
        form.setData('certifications', remaining.length ? remaining : [{ name: '', credential_number: '' }]);
    };
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (form.processing || !form.data.name.trim() || (isGuest && (!meetsPasswordRequirements(form.data.password, form.data.password_confirmation) || !form.data.legal_acceptance))) return;
        form.transform((data) => ({ ...data, certifications: data.certifications.filter((c) => c.name.trim() || c.credential_number.trim()) }));
        form.post('/join/step/2', { forceFormData: true });
    };
    return (
        <OnboardingLayout title="A little about you" subtitle="Add your name. Complete the rest now or later." step={2}>
            <Head title="A little about you" />
            <form className="signup-form" onSubmit={submit}>
                {isGuest && email && <p className="signup-hint signup-email-confirmed">Verified email: {email}</p>}
                <SignupField id="signup-name" label="Full name" required error={form.errors.name}>
                    <SignupInput id="signup-name" name="name" autoComplete="name" required aria-describedby={form.errors.name ? "signup-name-error" : undefined} placeholder="Your full name" value={form.data.name} invalid={!!form.errors.name}
                        onChange={(e) => form.setData('name', e.target.value)} />
                </SignupField>
                {isGuest && <section className="signup-password-section" aria-label="Password fields">
                    <div className="signup-fields-stack">
                        <SignupField id="signup-password" label="Password" required error={form.errors.password}>
                            <SignupPassword id="signup-password" name="password" autoComplete="new-password" required aria-describedby={form.errors.password ? "signup-password-error signup-password-rules" : "signup-password-rules"}
                                value={form.data.password} visible={passwordVisible} onToggle={() => setPasswordVisible(!passwordVisible)}
                                invalid={!!form.errors.password} onChange={event => form.setData('password', event.target.value)} placeholder="Create a secure password" />
                        </SignupField>
                        <SignupField id="signup-password-confirm" label="Confirm password" required
                            error={form.errors.password_confirmation || (form.data.password_confirmation && form.data.password !== form.data.password_confirmation ? 'Passwords do not match.' : '')}>
                            <SignupPassword id="signup-password-confirm" name="password_confirmation" autoComplete="new-password" required aria-describedby="signup-password-rules"
                                value={form.data.password_confirmation} visible={confirmationVisible} onToggle={() => setConfirmationVisible(!confirmationVisible)}
                                invalid={!!form.errors.password_confirmation || (form.data.password_confirmation.length > 0 && form.data.password !== form.data.password_confirmation)}
                                onChange={event => form.setData('password_confirmation', event.target.value)} placeholder="Confirm your password" />
                        </SignupField>
                    </div>
                    <SignupPasswordRequirements password={form.data.password} confirmation={form.data.password_confirmation}/>
                </section>}
                <div className="signup-grid">
                    <SignupField id="signup-role" label="Your role" optional error={form.errors.role}>
                        <PMDropdown id="signup-role" name="role" invalid={!!form.errors.role}
                            aria-describedby={form.errors.role ? 'signup-role-error' : undefined}
                            value={form.data.role} onValueChange={(value) => form.setData('role', value)}
                            placeholder="Select role" options={signupOptions.signup_role ?? []} />
                    </SignupField>
                    <SignupField id="signup-years" label="Experience" optional error={form.errors.years_experience}>
                        <PMDropdown id="signup-years" name="years_experience" invalid={!!form.errors.years_experience}
                            aria-describedby={form.errors.years_experience ? 'signup-years-error' : undefined}
                            value={form.data.years_experience} onValueChange={(value) => form.setData('years_experience', value)}
                            placeholder="Select years" options={signupOptions.signup_experience ?? []} />
                    </SignupField>
                </div>
                <hr className="signup-divider" />
                <section aria-label="Certifications">
                    <h2 className="signup-cert-title">Certifications <span className="signup-optional">(optional)</span></h2>
                    <div className="signup-cert-list">
                        {form.data.certifications.map((cert, index) => (
                            <div className="signup-grid signup-cert-row" key={index}>
                                <SignupField id={`signup-cert-${index}`} label="Certification" error={form.errors[`certifications.${index}.name` as keyof typeof form.errors]}>
                                    <PMDropdown id={`signup-cert-${index}`}
                                        invalid={!!form.errors[`certifications.${index}.name` as keyof typeof form.errors]}
                                        aria-describedby={form.errors[`certifications.${index}.name` as keyof typeof form.errors] ? `signup-cert-${index}-error` : undefined}
                                        value={cert.name} onValueChange={(value) => updateCertification(index, 'name', value)}
                                        placeholder="Select certification" options={signupOptions.signup_certification ?? []} />
                                </SignupField>
                                <SignupField id={`signup-cert-number-${index}`} label="Certification number">
                                    <SignupInput id={`signup-cert-number-${index}`} value={cert.credential_number} placeholder="Enter number" onChange={(e) => updateCertification(index, 'credential_number', e.target.value)} />
                                </SignupField>
                                {form.data.certifications.length > 1 && (
                                    <button type="button" onClick={() => removeCertification(index)} className="signup-cert-remove" aria-label={`Remove certification ${index + 1}`}><X size={13} /></button>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="signup-cert-actions">
                        <SignupButton type="button" variant="link" onClick={addCertification} disabled={form.data.certifications.length >= 6}>
                            <Plus size={15} /> Add another certification
                        </SignupButton>
                        <p className="signup-hint">Details are self-reported until verified.</p>
                    </div>
                </section>
                <section aria-label="Resume upload">
                    <div className="signup-resume">
                        <div className="signup-resume-text">
                            <FileUp size={30} strokeWidth={1.6} aria-hidden="true" />
                            <div><strong>{fileName || 'Add your resume'} <span className="signup-optional">(optional)</span></strong>
                                <p>{fileName ? 'File attached and ready to upload' : 'PDF or DOCX · Up to 5 MB · Private by default'}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {fileName && <button className="signup-resume-remove" type="button" aria-label="Remove resume" onClick={() => { setFileName(''); form.setData('resume', null); if (fileRef.current) fileRef.current.value = ''; }}><X size={15}/></button>}
                            <input ref={fileRef} id="signup-resume" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={(event) => { const file = event.currentTarget.files?.[0] || null; form.setData('resume', file); setFileName(file?.name || ''); }} />
                            <SignupButton variant="outline" type="button" className="signup-resume-choose" onClick={() => fileRef.current?.click()}>{fileName ? 'Change file' : 'Choose file'}</SignupButton>
                        </div>
                    </div>
                    {form.errors.resume && <p role="alert" className="signup-error">{form.errors.resume}</p>}
                </section>
                {isGuest && <div className="signup-legal">
                    <label className="signup-legal-label">
                        <input type="checkbox" checked={form.data.legal_acceptance} onChange={event => form.setData('legal_acceptance', event.target.checked)} required/>
                        <span>I agree to the <Link href="/terms" target="_blank">Terms</Link> and <Link href="/privacy" target="_blank">Privacy Policy</Link>.</span>
                    </label>
                    {form.errors.legal_acceptance && <p role="alert" className="signup-error">{form.errors.legal_acceptance}</p>}
                </div>}
                <div className="signup-form-actions">
                    <SignupButton type="submit" forward className="signup-button--full" disabled={form.processing || !form.data.name.trim() || (isGuest && (!meetsPasswordRequirements(form.data.password, form.data.password_confirmation) || !form.data.legal_acceptance))}>{form.processing ? 'Saving...' : 'Continue'}</SignupButton>
                    <Link href="/join/step/1" className="signup-link">Back</Link>
                </div>
            </form>
        </OnboardingLayout>
    );
}
