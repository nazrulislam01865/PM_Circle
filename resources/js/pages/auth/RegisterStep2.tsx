import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronDown, FileUp, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { OnboardingLayout } from '@/layouts/pm/OnboardingLayout';

type Cert = { name: string; credential_number: string };

type Props = {
    name?: string;
    profile?: {
        role?: string | null;
        years_experience?: number | null;
        resume_scan_status?: string;
    } | null;
    certifications?: Cert[];
};

const roles = [
    'Project Manager',
    'Project Coordinator',
    'Program Manager',
    'PMO Analyst',
    'Scrum Master',
    'Agile Coach',
    'Business Analyst',
    'Technical Project Manager',
    'Product Operations',
    'Student / Aspiring PM',
    'Other',
];

const credentials = [
    'PMP',
    'CAPM',
    'CSM',
    'PSM',
    'PRINCE2',
    'PMI-ACP',
    'AgilePM',
    'Other',
];

export default function RegisterStep2({ name = '', profile, certifications = [] }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

    const form = useForm({
        name: name || '',
        role: profile?.role || '',
        years_experience: profile?.years_experience !== null && profile?.years_experience !== undefined
            ? profile.years_experience.toString()
            : '',
        certifications: certifications.length ? certifications : [{ name: '', credential_number: '' }],
        resume: null as File | null,
    });

    const addCertification = () => {
        if (form.data.certifications.length < 6) {
            form.setData('certifications', [
                ...form.data.certifications,
                { name: '', credential_number: '' },
            ]);
        }
    };

    const updateCertification = (index: number, field: keyof Cert, value: string) => {
        const updated = form.data.certifications.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        );
        form.setData('certifications', updated);
    };

    const removeCertification = (index: number) => {
        if (form.data.certifications.length === 1) {
            form.setData('certifications', [{ name: '', credential_number: '' }]);
        } else {
            form.setData(
                'certifications',
                form.data.certifications.filter((_, i) => i !== index)
            );
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setData('resume', file);
            setSelectedFileName(file.name);
        }
    };

    const handleRemoveFile = () => {
        form.setData('resume', null);
        setSelectedFileName(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Filter out completely empty certification rows before sending
        const validCerts = form.data.certifications.filter(
            (c) => c.name.trim() !== '' || c.credential_number.trim() !== ''
        );
        form.setData('certifications', validCerts);

        form.post('/join/step/2', {
            forceFormData: true,
        });
    };

    return (
        <OnboardingLayout
            title="A little about you"
            subtitle="Add your name. Complete the rest now or later."
            step={2}
        >
            <Head title="A little about you" />

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full name * field */}
                <div className="space-y-1.5">
                    <label htmlFor="name" className="block text-sm font-semibold text-slate-800">
                        Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="name"
                        type="text"
                        name="name"
                        autoComplete="name"
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        required
                        placeholder="Your full name"
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors ${
                            form.errors.name ? 'border-red-500' : 'border-slate-300'
                        }`}
                    />
                    {form.errors.name && <p className="text-xs text-red-500">{form.errors.name}</p>}
                </div>

                {/* 2-column: Role and Experience */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Your role (optional) */}
                    <div className="space-y-1.5">
                        <label htmlFor="role" className="block text-sm font-semibold text-slate-800">
                            Your role <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                            <select
                                id="role"
                                name="role"
                                value={form.data.role}
                                onChange={(e) => form.setData('role', e.target.value)}
                                className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                            >
                                <option value="">Select role</option>
                                {roles.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        {form.errors.role && <p className="text-xs text-red-500">{form.errors.role}</p>}
                    </div>

                    {/* Experience (optional) */}
                    <div className="space-y-1.5">
                        <label htmlFor="experience" className="block text-sm font-semibold text-slate-800">
                            Experience <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                            <select
                                id="experience"
                                name="years_experience"
                                value={form.data.years_experience}
                                onChange={(e) => form.setData('years_experience', e.target.value)}
                                className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                            >
                                <option value="">Select years</option>
                                <option value="0">Less than 1 year</option>
                                <option value="1">1 year</option>
                                <option value="2">2 years</option>
                                <option value="3">3 years</option>
                                <option value="4">4 years</option>
                                <option value="5">5 years</option>
                                <option value="6">6 years</option>
                                <option value="7">7 years</option>
                                <option value="8">8 years</option>
                                <option value="9">9 years</option>
                                <option value="10">10+ years</option>
                                <option value="15">15+ years</option>
                                <option value="20">20+ years</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        {form.errors.years_experience && (
                            <p className="text-xs text-red-500">{form.errors.years_experience}</p>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <hr className="border-slate-200 my-4" />

                {/* Certifications (optional) */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">
                        Certifications <span className="text-slate-400 font-normal">(optional)</span>
                    </h3>

                    {form.data.certifications.map((cert, index) => (
                        <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start relative">
                            {/* Certification select */}
                            <div className="space-y-1">
                                <label
                                    htmlFor={`cert_name_${index}`}
                                    className="block text-xs font-medium text-slate-600"
                                >
                                    Certification
                                </label>
                                <div className="relative">
                                    <select
                                        id={`cert_name_${index}`}
                                        value={cert.name}
                                        onChange={(e) => updateCertification(index, 'name', e.target.value)}
                                        className="w-full appearance-none px-3 py-2 pr-9 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                                    >
                                        <option value="">Select certification</option>
                                        {credentials.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            {/* Certification number */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label
                                        htmlFor={`cert_num_${index}`}
                                        className="block text-xs font-medium text-slate-600"
                                    >
                                        Certification number
                                    </label>
                                    {form.data.certifications.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeCertification(index)}
                                            className="text-slate-400 hover:text-red-500 text-xs flex items-center gap-0.5"
                                            title="Remove"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Remove
                                        </button>
                                    )}
                                </div>
                                <input
                                    id={`cert_num_${index}`}
                                    type="text"
                                    value={cert.credential_number}
                                    onChange={(e) => updateCertification(index, 'credential_number', e.target.value)}
                                    placeholder="Enter number"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                                />
                            </div>
                        </div>
                    ))}

                    {/* Add another certification link */}
                    <div className="pt-1">
                        <button
                            type="button"
                            onClick={addCertification}
                            disabled={form.data.certifications.length >= 6}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" /> Add another certification
                        </button>
                        <p className="text-xs text-slate-400 mt-1">
                            Details are self-reported until verified.
                        </p>
                    </div>
                </div>

                {/* Add your resume (optional) area */}
                <div className="border border-dashed border-blue-200 bg-blue-50/20 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                            <FileUp className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">
                                {selectedFileName ? selectedFileName : 'Add your resume (optional)'}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {selectedFileName
                                    ? 'File attached and ready for upload'
                                    : 'PDF or DOCX · Up to 5 MB · Private by default'}
                            </p>
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                        {selectedFileName && (
                            <button
                                type="button"
                                onClick={handleRemoveFile}
                                className="text-slate-400 hover:text-red-500 p-1"
                                title="Remove file"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleFileChange}
                            className="hidden"
                            id="resume-upload"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-1.5 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold text-sm bg-white transition-colors"
                        >
                            {selectedFileName ? 'Change file' : 'Choose file'}
                        </button>
                    </div>
                </div>
                {form.errors.resume && <p className="text-xs text-red-500">{form.errors.resume}</p>}

                {/* Bottom actions */}
                <div className="pt-2 space-y-3">
                    <button
                        type="submit"
                        disabled={form.processing || !form.data.name.trim()}
                        className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {form.processing ? 'Saving...' : 'Continue →'}
                    </button>

                    <div className="text-center">
                        <Link
                            href="/join/step/1"
                            className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
                        >
                            Back
                        </Link>
                    </div>
                </div>
            </form>
        </OnboardingLayout>
    );
}
