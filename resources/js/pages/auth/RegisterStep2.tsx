import { Head, Link, useForm } from '@inertiajs/react';
import { FileUp, Plus, Trash2 } from 'lucide-react';
import { OnboardingLayout } from '@/layouts/pm/OnboardingLayout';
import { FormField } from '@/components/pm/FormField';
import { ActionButton } from '@/components/pm/ActionButton';

type Cert = { name: string; credential_number: string };
type Props = { profile?: { role?: string | null; years_experience?: number | null; resume_scan_status?: string } | null; certifications?: Cert[] };
const roles = ['Project Manager', 'Project Coordinator', 'Program Manager', 'PMO Analyst', 'Scrum Master', 'Agile Coach', 'Business Analyst', 'Student / Aspiring PM', 'Other'];
const credentials = ['PMP', 'CAPM', 'CSM', 'PSM', 'PRINCE2', 'PMI-ACP', 'Other'];

export default function RegisterStep2({ profile, certifications = [] }: Props) {
    const form = useForm({ role: profile?.role || '', years_experience: profile?.years_experience?.toString() || '', certifications: certifications.length ? certifications : [] as Cert[], resume: null as File | null });
    const add = () => form.setData('certifications', [...form.data.certifications, { name: 'PMP', credential_number: '' }]);
    const edit = (index: number, field: keyof Cert, value: string) => form.setData('certifications', form.data.certifications.map((item, i) => i === index ? { ...item, [field]: value } : item));
    return <OnboardingLayout title="A little about you" subtitle="Optional now. You can update this anytime." step={2} verified><Head title="Your professional profile"/>
        <form onSubmit={e => { e.preventDefault(); form.post('/join/step/2', { forceFormData: true }); }}>
            <div className="pm-field-grid"><FormField label="Your role" htmlFor="role" error={form.errors.role}><select id="role" value={form.data.role} onChange={e => form.setData('role', e.target.value)}><option value="">Select your role</option>{roles.map(role => <option key={role}>{role}</option>)}</select></FormField>
                <FormField label="Experience" htmlFor="years" error={form.errors.years_experience}><select id="years" value={form.data.years_experience} onChange={e => form.setData('years_experience', e.target.value)}><option value="">Select years</option>{[0,1,2,3,4,5,6,7,8,9,10,12,15,20,25,30,40].map(n => <option key={n} value={n}>{n === 0 ? 'Less than 1 year' : n >= 10 ? `${n}+ years` : `${n} ${n === 1 ? 'year' : 'years'}`}</option>)}</select></FormField></div>
            <div className="pm-credential-head">Have a certification?</div><p className="pm-credential-sub">Optional — aspiring project managers are welcome.</p>
            {form.data.certifications.map((cert, i) => <div className="pm-field-grid" key={i}><FormField label="Certification" htmlFor={`credential-${i}`} error={form.errors[`certifications.${i}.name` as keyof typeof form.errors]}><select id={`credential-${i}`} value={cert.name} onChange={e => edit(i, 'name', e.target.value)}>{credentials.map(c => <option key={c}>{c}</option>)}</select></FormField><FormField label="Certification number" htmlFor={`credential-number-${i}`} error={form.errors[`certifications.${i}.credential_number` as keyof typeof form.errors]}><div className="flex gap-2"><input id={`credential-number-${i}`} value={cert.credential_number} onChange={e => edit(i, 'credential_number', e.target.value)} placeholder="Enter number"/><button type="button" aria-label="Remove certification" onClick={() => form.setData('certifications', form.data.certifications.filter((_, j) => j !== i))}><Trash2 color="#7586a0" size={16}/></button></div></FormField></div>)}
            <button type="button" className="pm-add-line" onClick={add} disabled={form.data.certifications.length >= 8}><Plus size={18}/>Add another certification</button><p className="pm-minor-note">PMP, CSM or another credential. Details are self-reported until verified.</p>
            <div className="pm-upload-area"><FileUp size={39}/><div><strong>Add your resume (optional)</strong><small>PDF or DOCX · Up to 5 MB · Private by default</small>{profile?.resume_scan_status === 'pending_scan' && <small>Previous upload awaiting security scan</small>}</div><input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-label="Choose resume file" onChange={e => form.setData('resume', e.target.files?.[0] || null)}/></div>
            {form.errors.resume && <p className="pm-error" role="alert">{form.errors.resume}</p>}
            <ActionButton type="submit" forward className="pm-auth-submit" disabled={form.processing}>Continue</ActionButton><Link className="pm-skip" href="/join/step/3">Skip for now</Link>
        </form>
    </OnboardingLayout>;
}
