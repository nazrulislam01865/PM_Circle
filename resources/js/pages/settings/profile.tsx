import { useState, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { ProfileEditSections, sectionAnchor, sectionLabel, type ProfileSectionId } from '@/components/profile/ProfileEditSections';
import { ResumeImportsTab, type ResumeImportState, type ResumeRecord } from '@/components/profile/ResumeImportsTab';
import { ProfileImageCropDialog } from '@/components/profile/ProfileImageCropDialog';
import { ProfileHeroPhoto } from '@/components/profile/ProfileHeroPhoto';
import { ProfilePhoneField } from '@/components/profile/ProfilePhoneField';
import {
    Briefcase,
    Building2,
    Calendar,
    Camera,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Download,
    Eye,
    FileText,
    Globe,
    GraduationCap,
    Info,
    Laptop,
    Lock,
    MapPin,
    Pencil,
    Plus,
    RefreshCw,
    Shield,
    Sparkles,
    Trash2,
    UploadCloud,
    UserCheck,
    X,
} from 'lucide-react';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardShellData } from '@/types/dashboard';

type ExperienceItem = {
    id?: number;
    job_title: string;
    organization: string;
    employment_type: string;
    start_date: string;
    end_date?: string | null;
    is_current: boolean;
    responsibilities?: string | null;
};

type ProjectItem = {
    id: number;
    title: string;
    summary: string;
    role: string;
    team_size: number;
    delivery_months: number;
    work_sample_path?: string | null;
    is_featured: boolean;
    is_anonymized: boolean;
};

type ProfilePageProps = {
    activeTab: 'overview' | 'edit' | 'imports' | 'privacy';
    status?: string;
    profileData: {
        id: number;
        name: string;
        email: string;
        headline: string;
        phone: string;
        role: string;
        industry: string;
        country: string;
        city: string;
        about: string;
        skills: string[];
        cover_photo_path?: string | null;
        avatar_path?: string | null;
        open_to_opportunities: boolean;
        visibility: string;
        resume_employer_visibility: boolean;
        contact_visibility: string;
        linkedin_url: string;
        languages: string[];
        plan_label: string;
        location_label: string;
        status_label: string;
        completeness: number;
        insights: {
            views: number;
            change: string;
            period: string;
        };
        learning_stats: {
            activities: number;
            hours: number;
            achievements: number;
        };
        experiences: ExperienceItem[];
        featured_project: ProjectItem | null;
        projects: ProjectItem[];
        educations: Array<{ id: number; degree: string; institution: string; year: string }>;
        certifications: Array<{ id: number; name: string; credential_number?: string; valid_until?: string; status_label?: string; verified: boolean }>;
        resume: ResumeRecord | null;
        import: ResumeImportState;
    };
};

export default function Profile({ activeTab: initialTab = 'overview', profileData }: ProfilePageProps) {
    const { memberShell } = usePage<{ memberShell?: DashboardShellData }>().props;

    const dashboardShell: DashboardShellData = memberShell || {
        plan: 'premium',
        member: {
            id: profileData?.id ?? 0,
            name: profileData?.name || 'Sara Ahmed',
            role: profileData?.role || 'Project Manager',
            completion: profileData?.completeness || 80,
        },
        isDemo: true,
    };

    // Older resume imports could place a comma-separated address into the headline
    // while leaving structured city/country empty. Present that address as a
    // location, without modifying stored data or running another query.
    const headlineLooksLikeLegacyAddress = !profileData.location_label && !profileData.city && !profileData.country
        && Boolean(profileData.role) && !profileData.headline.includes('|')
        && profileData.headline.split(',').filter((part) => part.trim()).length >= 3;
    const overviewHeadline = headlineLooksLikeLegacyAddress ? profileData.role : (profileData.headline || profileData.role);
    const overviewLocation = profileData.location_label || (headlineLooksLikeLegacyAddress ? profileData.headline.replace(/\s+,/g, ',') : '');

    const [currentTab, setCurrentTab] = useState<'overview' | 'edit' | 'imports' | 'privacy'>(initialTab);
    const [editActiveSection, setEditActiveSection] = useState<ProfileSectionId>('basic');
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ experience: true });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Edit Form State
    const [formData, setFormData] = useState({
        name: profileData?.name || '',
        headline: profileData?.headline || '',
        phone: profileData?.phone || '',
        role: profileData?.role || '',
        industry: profileData?.industry || '',
        country: profileData?.country || '',
        city: profileData?.city || '',
        about: profileData?.about || '',
        open_to_opportunities: profileData?.open_to_opportunities ?? true,
        visibility: profileData?.visibility || 'members_only',
        resume_employer_visibility: profileData?.resume_employer_visibility ?? true,
        contact_visibility: profileData?.contact_visibility || 'private',
        linkedin_url: profileData?.linkedin_url || '',
        languages: profileData?.languages || [],
    });

    const [skillsList, setSkillsList] = useState<string[]>(profileData?.skills || []);
    const [newSkillInput, setNewSkillInput] = useState('');
    const [showSkillDropdown, setShowSkillDropdown] = useState(false);

    const [allowEmployerResume, setAllowEmployerResume] = useState(profileData?.resume_employer_visibility ?? false);
    const [isSaving, setIsSaving] = useState(false);
    const [photoSaving, setPhotoSaving] = useState(false);
    const [photoError, setPhotoError] = useState('');
    const [pendingPhoto, setPendingPhoto] = useState<{ file: File; kind: 'avatar' | 'cover' } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const resumeUploadRef = useRef<HTMLInputElement>(null);

    const navigateToSection = (section: ProfileSectionId) => {
        setEditActiveSection(section);
        setExpandedSections((previous) => ({ ...previous, [section]: true }));
        // The section exists even while collapsed; expand then scroll to its anchor.
        requestAnimationFrame(() => {
            document.getElementById(sectionAnchor[section])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    const toggleSection = (section: ProfileSectionId) => {
        setEditActiveSection(section);
        setExpandedSections((previous) => ({ ...previous, [section]: !previous[section] }));
    };

    const changeTab = (tab: 'overview' | 'edit' | 'imports' | 'privacy') => {
        setCurrentTab(tab);
        router.visit(ProfileController.edit.url({ query: { tab } }), {
            preserveState: false,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        router.patch(
            ProfileController.update.url(),
            {
                ...formData,
                skills: skillsList,
                languages: formData.languages.map((language) => language.trim()).filter(Boolean),
                tab: 'edit',
            },
            {
                preserveScroll: true,
                onSuccess: () => setFormErrors({}),
                onError: setFormErrors,
                onFinish: () => setIsSaving(false),
            }
        );
    };

    const handleAddSkill = (skill: string) => {
        const trimmed = skill.trim();
        if (trimmed && !skillsList.includes(trimmed)) {
            setSkillsList([...skillsList, trimmed]);
            setNewSkillInput('');
            setShowSkillDropdown(false);
        }
    };

    const handleRemoveSkill = (skillToRemove: string) => {
        setSkillsList(skillsList.filter((s) => s !== skillToRemove));
    };

    const prepareImage = (event: React.ChangeEvent<HTMLInputElement>, kind: 'avatar' | 'cover') => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setPhotoError('Choose a JPG, PNG or WebP image.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setPhotoError('The selected image must be 5 MB or smaller.');
            return;
        }
        setPhotoError('');
        setPendingPhoto({ file, kind });
    };

    const uploadCroppedImage = (file: File, kind: 'avatar' | 'cover') => {
        setPendingPhoto(null);
        setPhotoSaving(true);
        const uploadData = new FormData();
        uploadData.append(kind === 'avatar' ? 'avatar' : 'cover_photo', file);
        uploadData.append('tab', currentTab);
        router.post(kind === 'avatar' ? ProfileController.uploadAvatar.url() : ProfileController.uploadCover.url(), uploadData, {
            preserveScroll: true,
            onSuccess: () => setPhotoError(''),
            onError: (errors) => setPhotoError(Object.values(errors)[0] || 'The image could not be saved. Try again.'),
            onFinish: () => setPhotoSaving(false),
        });
    };

    const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const uploadData = new FormData();
            uploadData.append('resume', e.target.files[0]);
            router.post(ProfileController.uploadResume.url(), uploadData);
        }
    };

    return (
        <MemberDashboardLayout dashboard={dashboardShell}>
            <Head title="My profile - PM Circle" />

            <div className="pm-profile-page">
                {/* Hidden File Inputs */}
                <input type="file" ref={coverInputRef} onChange={(event) => prepareImage(event, 'cover')} accept="image/jpeg,image/png,image/webp" className="hidden" aria-hidden="true" />
                <input type="file" ref={fileInputRef} onChange={(event) => prepareImage(event, 'avatar')} accept="image/jpeg,image/png,image/webp" className="hidden" aria-hidden="true" />
                <input type="file" ref={resumeUploadRef} onChange={handleResumeUpload} accept=".pdf,.docx" className="hidden" aria-hidden="true" />

                <ProfileImageCropDialog file={pendingPhoto?.file || null} kind={pendingPhoto?.kind || 'avatar'}
                    onCancel={() => setPendingPhoto(null)} onConfirm={uploadCroppedImage} />
                {photoError && <div className="pm-profile-upload-alert" role="alert">{photoError}</div>}
                {photoSaving && <p className="pm-profile-upload-status" role="status">Uploading image...</p>}

                {/* Top Action Header */}
                <header className="pm-profile-top-bar">
                    <div className="pm-profile-top-titles">
                        <h1>My profile</h1>
                        <p>
                            {currentTab === 'overview' && 'Showcase your experience, skills and achievements to the PM Circle community.'}
                            {currentTab === 'edit' && 'Manage your information, skills and preferences to get the most out of PM Circle.'}
                            {currentTab === 'imports' && 'Manage your information, skills and preferences to get the most out of PM Circle.'}
                            {currentTab === 'privacy' && 'Manage how your profile, contact details, and resume are displayed to other members and recruiters.'}
                        </p>
                    </div>

                    <div className="pm-profile-top-actions">
                        {currentTab === 'overview' && (
                            <>
                                <Link href={`/members/${profileData.id}`} className="pm-btn pm-btn-secondary" title="Preview your public profile">
                                    <Eye size={17} /> Preview public profile
                                </Link>
                                <button type="button" className="pm-btn pm-btn-primary" onClick={() => changeTab('edit')}>
                                    <Pencil size={17} /> Edit profile
                                </button>
                            </>
                        )}

                    </div>
                </header>

                {/* Horizontal Nav Tabs */}
                <nav className="pm-profile-nav-tabs" aria-label="Profile tabs">
                    <button
                        type="button"
                        onClick={() => changeTab('overview')}
                        className={`pm-profile-tab-item ${currentTab === 'overview' ? 'is-active' : ''}`}
                    >
                        Overview
                    </button>
                    <button
                        type="button"
                        onClick={() => changeTab('edit')}
                        className={`pm-profile-tab-item ${currentTab === 'edit' ? 'is-active' : ''}`}
                    >
                        Edit profile
                    </button>
                    <button
                        type="button"
                        onClick={() => changeTab('imports')}
                        className={`pm-profile-tab-item ${currentTab === 'imports' ? 'is-active' : ''}`}
                    >
                        Resume & imports
                    </button>
                    <button
                        type="button"
                        onClick={() => changeTab('privacy')}
                        className={`pm-profile-tab-item ${currentTab === 'privacy' ? 'is-active' : ''}`}
                    >
                        Privacy
                    </button>
                </nav>

                {/* ==============================================================
                    TAB 1: OVERVIEW (p3.png)
                   ============================================================== */}
                {currentTab === 'overview' && (
                    <div className="pm-profile-overview-grid">
                        {/* Main Left Column */}
                        <div className="pm-profile-main-col">
                            {/* Hero Card */}
                            <div className="pm-hero-card">
                                <div
                                    className="pm-hero-cover"
                                    style={
                                        profileData?.cover_photo_path
                                            ? { backgroundImage: `url(${profileData.cover_photo_path})` }
                                            : undefined
                                    }
                                >

                                </div>

                                <div className="pm-hero-body">
                                    <div className="pm-hero-avatar-wrap">
                                        <ProfileHeroPhoto name={profileData.name} src={profileData.avatar_path} />
                                        <button
                                            type="button"
                                            className="pm-hero-avatar-camera"
                                            onClick={() => fileInputRef.current?.click()}
                                            title="Update profile picture"
                                        >
                                            <Camera size={16} />
                                        </button>
                                    </div>

                                    <div className="pm-hero-name-row">
                                        <h2 className="pm-hero-name">{profileData.name}</h2>
                                        <span className="pm-member-plan-badge">{dashboardShell.plan === 'free' ? 'Free member' : dashboardShell.plan === 'pro' ? '♛ Pro member' : '♛ Plus member'}</span>
                                    </div>

                                    {overviewHeadline && <p className="pm-hero-headline">{overviewHeadline}</p>}
                                    <div className="pm-hero-meta">
                                        {overviewLocation && <span className="pm-hero-location">
                                            <MapPin size={20} aria-hidden="true" /><span>{overviewLocation}</span>
                                        </span>}
                                        {profileData.open_to_opportunities && (
                                            <span className="pm-status-pill">
                                                <Briefcase size={13} /> {profileData.status_label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* About Section */}
                            <section className="pm-card" aria-labelledby="about-head">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row">
                                        <h3 id="about-head" className="pm-card-title"><UserCheck size={20} aria-hidden="true"/> About</h3>
                                        <button type="button" className="pm-btn-ghost" onClick={() => changeTab('edit')}>
                                            ✏️ Edit
                                        </button>
                                    </div>
                                    <div className="text-(length:--pm-font-size-14p5px) leading-relaxed text-(color:--pm-tone-334155) whitespace-pre-line">
                                        {profileData.about}
                                    </div>
                                </div>
                            </section>

                            {/* Experience Section */}
                            <section className="pm-card" aria-labelledby="exp-head">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row">
                                        <h3 id="exp-head" className="pm-card-title"><Briefcase size={20} aria-hidden="true"/> Experience</h3>
                                        <div className="flex items-center gap-2">
                                            <button type="button" className="pm-btn-ghost" onClick={() => changeTab('edit')}>
                                                + Add experience
                                            </button>
                                            <button type="button" className="pm-btn-ghost" onClick={() => changeTab('edit')}>
                                                ✏️ Edit
                                            </button>
                                        </div>
                                    </div>

                                    {profileData.experiences.map((exp, idx) => (
                                        <div key={exp.id || idx} className="pm-experience-item">
                                            <div className="pm-company-logo">
                                                <Building2 size={24} />
                                            </div>
                                            <div className="pm-experience-details">
                                                <h4 className="pm-experience-role">{exp.job_title}</h4>
                                                <div className="pm-experience-org">
                                                    {exp.organization} · {exp.employment_type}
                                                </div>
                                                <div className="pm-experience-dates">
                                                    {exp.start_date} — {exp.is_current ? 'Present' : exp.end_date} · 2 yrs 10 mos · Dhaka, Bangladesh · Hybrid
                                                </div>

                                                {exp.responsibilities && (
                                                    <ul className="pm-experience-bullets">
                                                        {exp.responsibilities.split('\n').filter(Boolean).map((bullet, bIdx) => (
                                                            <li key={bIdx}>{bullet.replace(/^[-•*]\s*/, '')}</li>
                                                        ))}
                                                    </ul>
                                                )}

                                                <span className="pm-reported-tag">
                                                    <Info size={12} /> Member-reported outcomes ⓘ
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Featured Project */}
                            <section className="pm-card" aria-labelledby="proj-head">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row">
                                        <h3 id="proj-head" className="pm-card-title"><FileText size={20} aria-hidden="true"/> Featured Project</h3>
                                        <button type="button" className="pm-btn-ghost" onClick={() => changeTab('edit')}>
                                            + Add project
                                        </button>
                                    </div>

                                    {profileData.featured_project ? <div className="pm-project-card">
                                        <div className="pm-project-thumb">
                                            <Laptop size={44} strokeWidth={1.5} />
                                            <span className="text-(length:--pm-font-size-11px) font-semibold tracking-wider uppercase opacity-80">
                                                Interactive Portal
                                            </span>
                                        </div>

                                        <div className="pm-project-info">
                                            <div>
                                                <h4 className="pm-project-title">{profileData.featured_project.title}</h4>
                                                <p className="pm-project-summary">{profileData.featured_project.summary}</p>

                                                <div className="pm-project-metrics">
                                                    <span>Role: <strong>{profileData.featured_project.role}</strong></span>
                                                    <span>Team size: <strong>{profileData.featured_project.team_size}</strong></span>
                                                    <span>Delivery: <strong>{profileData.featured_project.delivery_months} months</strong></span>
                                                </div>
                                            </div>

                                            <div className="pm-project-foot">
                                                <button
                                                    type="button"
                                                    className="pm-btn pm-btn-secondary pm-btn-sm"
                                                    disabled={!profileData.featured_project.work_sample_path}
                                                    onClick={() => { if (profileData.featured_project?.work_sample_path) window.open(profileData.featured_project.work_sample_path, '_blank', 'noopener,noreferrer'); }}
                                                >
                                                    View work sample ↗
                                                </button>
                                                <span className="text-(length:--type-caption) text-(color:--disabled-text)">Anonymised case study</span>
                                            </div>
                                        </div>
                                    </div> : <p className="pm-profile-empty">No projects added yet. Add a project in Edit profile.</p>}
                                </div>
                            </section>

                            {/* Skills Section */}
                            <section className="pm-card" aria-labelledby="skills-head">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row">
                                        <h3 id="skills-head" className="pm-card-title"><Sparkles size={20} aria-hidden="true"/> Skills</h3>
                                        <button type="button" className="pm-btn-ghost" onClick={() => changeTab('edit')}>
                                            ✏️ Edit
                                        </button>
                                    </div>

                                    <div className="pm-skills-list">
                                        {profileData.skills.map((skill) => (
                                            <span key={skill} className="pm-skill-tag">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* Education & Certifications */}
                            <section className="pm-card" aria-labelledby="edu-head">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row">
                                        <h3 id="edu-head" className="pm-card-title"><GraduationCap size={20} aria-hidden="true"/> Education & Certifications</h3>
                                        <button type="button" className="pm-btn-ghost" onClick={() => changeTab('edit')}>
                                            ✏️ Edit
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {profileData.educations.map((edu) => (
                                            <div key={edu.id} className="flex items-start gap-3">
                                                <GraduationCap size={22} className="text-(color:--primary) mt-0.5" />
                                                <div>
                                                    <div className="font-semibold text-(color:--pm-tone-0f172a) text-(length:--pm-font-size-15px)">{edu.degree}</div>
                                                    <div className="text-(length:--pm-font-size-13p5px) text-(color:--pm-tone-475569)">
                                                        {edu.institution} · Graduated {edu.year}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {profileData.certifications.map((cert) => (
                                            <div key={cert.id} className="flex items-start gap-3 pt-3 border-t border-(color:--pm-tone-f1f5f9)">
                                                <Shield size={22} className="text-(color:--pm-tone-d97706) mt-0.5" />
                                                <div>
                                                    <div className="font-semibold text-(color:--pm-tone-0f172a) text-(length:--pm-font-size-15px)">{cert.name}</div>
                                                    <div className="text-(length:--pm-font-size-13p5px) text-(color:--pm-tone-475569)">
                                                        {cert.status_label || 'Valid until 2028 · Self-reported'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* Learning & Contributions */}
                            <section className="pm-card" aria-labelledby="learning-head">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row">
                                        <h3 id="learning-head" className="pm-card-title">Learning & Contributions</h3>
                                        <Link href="/learning" className="pm-btn-ghost inline-flex items-center gap-1">
                                            View learning record <ChevronRight size={14} />
                                        </Link>
                                    </div>

                                    <p className="text-(length:--pm-font-size-13p5px) text-(color:--pm-tone-475569) m-0">
                                        Track your practical simulation experience, solved workplace dilemmas, and accredited learning hours.
                                    </p>

                                    <div className="pm-learning-triplet">
                                        <div className="pm-stat-box">
                                            <div className="pm-stat-num">{profileData.learning_stats.activities}</div>
                                            <div className="pm-stat-label">Scenarios & Activities</div>
                                        </div>
                                        <div className="pm-stat-box">
                                            <div className="pm-stat-num">{profileData.learning_stats.hours}</div>
                                            <div className="pm-stat-label">Learning Hours</div>
                                        </div>
                                        <div className="pm-stat-box">
                                            <div className="pm-stat-num">{profileData.learning_stats.achievements}</div>
                                            <div className="pm-stat-label">Badges Earned</div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right Sidebar */}
                        <aside className="pm-profile-side-col">
                            {/* Completeness Ring */}
                            <div className="pm-card">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row mb-3">
                                        <h4 className="pm-card-title text-(length:--type-body)">Profile completeness</h4>
                                    </div>

                                    <div className="pm-progress-widget">
                                        <div className="pm-ring-circle">
                                            <svg viewBox="0 0 36 36">
                                                <path
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none"
                                                    stroke="var(--pm-tone-e2e8f0)"
                                                    strokeWidth="3.5"
                                                />
                                                <path
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none"
                                                    stroke="var(--primary)"
                                                    strokeWidth="3.5"
                                                    strokeDasharray={`${profileData.completeness}, 100`}
                                                />
                                            </svg>
                                            <div className="pm-ring-val">{profileData.completeness}%</div>
                                        </div>

                                        <div className="pm-progress-text">
                                            <strong>Great progress!</strong> Add a work sample to make your profile stand out.
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="pm-btn pm-btn-secondary pm-btn-sm w-full"
                                        onClick={() => changeTab('edit')}
                                    >
                                        Add a work sample →
                                    </button>
                                </div>
                            </div>

                            {/* Visibility Widget */}
                            <div className="pm-card">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row mb-3">
                                        <h4 className="pm-card-title text-(length:--type-body)">Profile visibility</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-(length:--type-caption) font-semibold text-(color:--disabled-text) uppercase block mb-1">
                                                Who can see your profile
                                            </label>
                                            <select
                                                className="pm-select text-(length:--pm-font-size-13p5px) py-2"
                                                value={formData.visibility}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, visibility: e.target.value });
                                                    router.patch(ProfileController.update.url(), {
                                                        visibility: e.target.value,
                                                    });
                                                }}
                                            >
                                                <option value="members_only">Members only (Recommended)</option>
                                                <option value="public">Public to web</option>
                                                <option value="private">Private (Only you)</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-(color:--pm-tone-f1f5f9)">
                                            <span className="text-(length:--pm-font-size-13p5px) font-medium text-(color:--pm-tone-1e293b)">
                                                Show resume to employers
                                            </span>
                                            <label className="pm-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={allowEmployerResume}
                                                    onChange={(e) => {
                                                        setAllowEmployerResume(e.target.checked);
                                                        router.patch(ProfileController.update.url(), {
                                                            resume_employer_visibility: e.target.checked,
                                                        });
                                                    }}
                                                />
                                                <span className="pm-slider"></span>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-(color:--pm-tone-f1f5f9)">
                                            <span className="text-(length:--pm-font-size-13p5px) font-medium text-(color:--pm-tone-1e293b)">Contact details</span>
                                            <span className="text-(length:--pm-font-size-13px) text-(color:--disabled-text) font-semibold">Private</span>
                                        </div>

                                        <button
                                            type="button"
                                            className="text-(length:--pm-font-size-13px) text-(color:--primary) font-semibold hover:underline block pt-1"
                                            onClick={() => changeTab('privacy')}
                                        >
                                            Manage granular privacy settings →
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Resume Card */}
                            <div className="pm-card">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row mb-3">
                                        <h4 className="pm-card-title text-(length:--type-body)">Resume</h4>
                                    </div>

                                    <div className="pm-resume-card-inner">
                                        <div className="pm-doc-icon">{profileData.resume?.original_name.toLowerCase().endsWith('.pdf') ? 'PDF' : <FileText size={22} />}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="pm-doc-name truncate">{profileData.resume?.original_name || 'No resume uploaded'}</div>
                                            <div className="pm-doc-meta">
                                                {profileData.resume ? `Updated ${profileData.resume.updated_at} / ${profileData.resume.file_size_formatted}` : 'Upload a PDF or Word document to get started.'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            className="pm-btn pm-btn-secondary pm-btn-sm"
                                            onClick={() => resumeUploadRef.current?.click()}
                                        >
                                            Upload new
                                        </button>
                                        <button
                                            type="button"
                                            className="pm-btn pm-btn-secondary pm-btn-sm"
                                            onClick={() => changeTab('imports')}
                                        >
                                            Manage resume
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Profile Insights */}
                            <div className="pm-card">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row mb-2">
                                        <h4 className="pm-card-title text-(length:--type-body)">Profile insights</h4>
                                    </div>

                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-(length:--type-h2) font-bold text-(color:--pm-tone-0f172a)">{profileData.insights.views}</span>
                                        <span className="text-(length:--pm-font-size-13px) text-(color:--pm-tone-16a34a) font-semibold">
                                            {profileData.insights.change} {profileData.insights.period}
                                        </span>
                                    </div>

                                    <p className="text-(length:--pm-font-size-13px) text-(color:--disabled-text) mb-3">
                                        Profile views from peers, project leaders, and verified recruiters.
                                    </p>

                                    <div className="p-3 bg-(color:--pm-tone-eff6ff) border border-(color:--pm-tone-bfdbfe) rounded-lg">
                                        <div className="text-(length:--pm-font-size-12p5px) font-semibold text-(color:--pm-tone-1e40af) mb-1 flex items-center gap-1.5">
                                            <Sparkles size={14} /> Pro member insight
                                        </div>
                                        <p className="text-(length:--type-caption) text-(color:--pm-tone-1e3a8a) m-0">
                                            Upgrade to Pro to see the companies, hiring leads, and roles looking at your profile.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                )}

                {/* ==============================================================
                    TAB 2: EDIT PROFILE (p1.png)
                   ============================================================== */}
                {currentTab === 'edit' && (
                    <div className="pm-profile-edit-grid">
                        {/* Anchors and accordion panels share the same section keys. */}
                        <nav className="pm-edit-nav" aria-label="Edit profile sections">
                            {(Object.keys(sectionLabel) as ProfileSectionId[]).map((section) => {
                                const count = section === 'experience' ? profileData.experiences.length :
                                    section === 'projects' ? profileData.projects.length :
                                    section === 'education' ? profileData.educations.length :
                                    section === 'certifications' ? profileData.certifications.length : undefined;
                                return <button key={section} type="button"
                                    className={`pm-edit-nav-item ${editActiveSection === section ? 'is-active' : ''}`}
                                    aria-current={editActiveSection === section ? 'location' : undefined}
                                    onClick={() => navigateToSection(section)}>
                                    {sectionLabel[section]}{count === undefined ? '' : ` (${count})`}
                                </button>;
                            })}
                        </nav>

                        {/* Middle Editor Form */}
                        <div className="space-y-6">
                            {/* Photo and Cover Editor – matches the approved p1 profile prototype. */}
                            <div className="pm-card pm-profile-edit-media">
                                <div className="pm-profile-edit-cover"
                                    style={profileData.cover_photo_path ? { backgroundImage: `url(${profileData.cover_photo_path})` } : undefined}>
                                    <button type="button" className="pm-profile-edit-cover-action" onClick={() => coverInputRef.current?.click()}>
                                        <Camera size={16} /> Upload cover photo
                                    </button>
                                </div>
                                <div className="pm-profile-edit-media-footer">
                                    <div className="pm-profile-edit-media-avatar">
                                        <ProfileHeroPhoto name={formData.name || profileData.name} src={profileData.avatar_path} />
                                        <button type="button" className="pm-hero-avatar-camera" onClick={() => fileInputRef.current?.click()} aria-label="Change profile photo"><Camera size={16} /></button>
                                    </div>
                                    <div className="pm-profile-photo-actions">
                                        <div className="pm-profile-photo-buttons">
                                            <button type="button" className="pm-btn pm-btn-secondary pm-btn-sm" onClick={() => fileInputRef.current?.click()}><Camera size={15}/> Change photo</button>
                                            <button type="button" className="pm-btn pm-btn-secondary pm-btn-sm pm-profile-remove-photo" onClick={() => { if (profileData.avatar_path && window.confirm('Remove your profile photo?')) router.delete('/settings/profile/avatar', { preserveScroll: true }); }}> <Trash2 size={15}/> Remove</button>
                                        </div>

                                    </div>

                                </div>
                            </div>

                            {/* Section: Basic Details */}
                            <div className="pm-card" id="basic-details">
                                <div className="pm-card-body">
                                    <h3 className="pm-card-title mb-4">Basic details</h3>

                                    <div className="pm-form-row-2">
                                        <div className="pm-form-group">
                                            <label className="pm-label">Full name *</label>
                                            <input
                                                type="text"
                                                className="pm-input" placeholder="Your full name" autoComplete="name"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="pm-form-group">
                                            <label className="pm-label">Professional headline *</label>
                                            <input
                                                type="text"
                                                className="pm-input" placeholder="e.g. Project Manager | Agile delivery"
                                                value={formData.headline}
                                                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="pm-form-row-2">
                                        <div className="pm-form-group">
                                            <label className="pm-label">Current role *</label>
                                            <input
                                                type="text"
                                                className="pm-input" placeholder="e.g. Senior Project Manager"
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="pm-form-group">
                                            <label className="pm-label">Industry *</label>
                                            <input
                                                type="text"
                                                className="pm-input" placeholder="e.g. Information technology"
                                                value={formData.industry}
                                                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="pm-form-row-2">
                                        <div className="pm-form-group">
                                            <label className="pm-label">Country *</label>
                                            <input
                                                type="text"
                                                className="pm-input" placeholder="e.g. Bangladesh" autoComplete="country-name"
                                                value={formData.country}
                                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="pm-form-group">
                                            <label className="pm-label">City *</label>
                                            <input
                                                type="text"
                                                className="pm-input" placeholder="e.g. Dhaka" autoComplete="address-level2"
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <ProfilePhoneField value={formData.phone} country={formData.country}
                                        onChange={(phone) => setFormData((previous) => ({ ...previous, phone }))} />
                                </div>
                            </div>

                            {/* Section: About & Skills */}
                            <div className="pm-card" id="about-skills">
                                <div className="pm-card-body">
                                    <h3 className="pm-card-title mb-4">About & skills</h3>

                                    <div className="pm-form-group">
                                        <label className="pm-label">About</label>
                                        <textarea
                                            rows={5}
                                            className="pm-textarea" placeholder="Introduce your professional background and key achievements..."
                                            value={formData.about}
                                            onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                                            maxLength={500}
                                        />
                                        <span className="pm-char-count">{formData.about.length} / 500</span>
                                    </div>

                                    <div className="pm-form-group">
                                        <label className="pm-label mb-2">Skills</label>
                                        <div className="pm-skills-list mb-3">
                                            {skillsList.map((skill) => (
                                                <span key={skill} className="pm-skill-tag">
                                                    {skill}
                                                    <button
                                                        type="button"
                                                        className="pm-chip-del"
                                                        onClick={() => handleRemoveSkill(skill)}
                                                        title="Remove skill"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex gap-2 relative">
                                            <input
                                                type="text"
                                                placeholder="Type a skill and press Enter or click Add"
                                                className="pm-input flex-1"
                                                value={newSkillInput}
                                                onChange={(e) => setNewSkillInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddSkill(newSkillInput);
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="pm-btn pm-btn-secondary pm-btn-sm"
                                                onClick={() => handleAddSkill(newSkillInput)}
                                            >
                                                <Plus size={15} /> Add skill
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <ProfileEditSections
                                active={editActiveSection}
                                expanded={expandedSections}
                                toggle={toggleSection}
                                experiences={profileData.experiences.map((item) => ({ ...item }))}
                                projects={profileData.projects.map((item) => ({ ...item }))}
                                educations={profileData.educations.map((item) => ({ ...item }))}
                                certifications={profileData.certifications.map((item) => ({ ...item }))}
                                career={formData}
                                links={{ linkedin_url: formData.linkedin_url, languages: formData.languages }}
                                update={(changes) => setFormData((previous) => ({ ...previous, ...changes }))}
                            />
                            {Object.keys(formErrors).length > 0 &&
                                <div role="alert" className="pm-profile-error pm-profile-form-errors">
                                    {Object.values(formErrors).join(' ')}
                                </div>}
                        </div>

                        {/* Right Quick Helper Sidebar */}
                        <aside className="space-y-4">
                            {/* Build From Resume CTA */}
                            <div className="pm-card">
                                <div className="pm-card-body">
                                    <h4 className="pm-card-title text-(length:--pm-font-size-15px) mb-2 flex items-center gap-2">
                                        <UploadCloud size={18} className="text-(color:--primary)" /> Build from your resume
                                    </h4>
                                    <p className="text-(length:--pm-font-size-13px) text-(color:--pm-tone-475569) mb-4">
                                        Upload a resume to get suggested profile updates. Review each change before applying.
                                    </p>
                                    <button
                                        type="button"
                                        className="pm-btn pm-btn-primary pm-btn-sm w-full"
                                        onClick={() => changeTab('imports')}
                                    >
                                        Upload DOCX or PDF
                                    </button>
                                </div>
                            </div>

                            {/* Privacy Note */}
                            <div className="pm-card">
                                <div className="pm-card-body">
                                    <h4 className="pm-card-title text-(length:--pm-font-size-15px) mb-2">Privacy</h4>
                                    <p className="text-(length:--pm-font-size-13px) text-(color:--pm-tone-475569)">
                                        Your profile is currently visible to <strong>Members only</strong>. Changes you make are updated instantly.
                                    </p>
                                </div>
                            </div>

                            {/* Account Card */}
                            <div className="pm-card">
                                <div className="pm-card-body">
                                    <h4 className="pm-card-title text-(length:--pm-font-size-15px) mb-2">Account</h4>
                                    <div className="text-(length:--pm-font-size-13p5px) font-semibold text-(color:--pm-tone-0f172a) mb-1">{formData.name}</div>
                                    <div className="text-(length:--pm-font-size-13px) text-(color:--pm-tone-475569) mb-2 flex items-center gap-1.5">
                                        {profileData.email} <CheckCircle2 size={14} className="text-emerald-600" />
                                    </div>
                                    <Link href="/settings/security" className="text-(length:--pm-font-size-13px) text-(color:--primary) font-semibold hover:underline">
                                        Manage password and security →
                                    </Link>
                                </div>
                            </div>
                        </aside>
                    </div>
                )}

                {/* Resume & imports is isolated so overview/edit share persisted profile data only. */}
                {currentTab === 'imports' && (
                    <ResumeImportsTab
                        resume={profileData.resume}
                        importData={profileData.import}
                        linkedInUrl={profileData.linkedin_url}
                        employerVisibility={profileData.resume_employer_visibility}
                        canImportLinkedIn={dashboardShell.plan === 'premium' || dashboardShell.plan === 'pro'}
                    />
                )}

                {/* ==============================================================
                    TAB 4: PRIVACY
                   ============================================================== */}
                {currentTab === 'privacy' && (
                    <div className="max-w-2xl space-y-6">
                        <div className="pm-card">
                            <div className="pm-card-body space-y-6">
                                <h3 className="pm-card-title">Granular privacy controls</h3>

                                <div>
                                    <label className="pm-label mb-1 block">Profile visibility</label>
                                    <p className="text-(length:--pm-font-size-13px) text-(color:--disabled-text) mb-2">
                                        Choose who is allowed to view your complete profile and achievements.
                                    </p>
                                    <select
                                        className="pm-select"
                                        value={formData.visibility}
                                        onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                                    >
                                        <option value="members_only">Members only (Recommended)</option>
                                        <option value="public">Public (Visible to everyone on the web)</option>
                                        <option value="private">Private (Only visible to you)</option>
                                    </select>
                                </div>

                                <div className="pt-4 border-t border-(color:--pm-tone-f1f5f9) flex items-center justify-between">
                                    <div>
                                        <div className="text-(length:--type-small) font-semibold text-(color:--pm-tone-0f172a)">
                                            Open to career opportunities
                                        </div>
                                        <div className="text-(length:--pm-font-size-12p5px) text-(color:--disabled-text)">
                                            Displays the "Open to opportunities" badge to verified hiring leads.
                                        </div>
                                    </div>
                                    <label className="pm-switch">
                                        <input
                                            type="checkbox"
                                            checked={formData.open_to_opportunities}
                                            onChange={(e) => setFormData({ ...formData, open_to_opportunities: e.target.checked })}
                                        />
                                        <span className="pm-slider"></span>
                                    </label>
                                </div>

                                <div className="pt-4 border-t border-(color:--pm-tone-f1f5f9) flex items-center justify-between">
                                    <div>
                                        <div className="text-(length:--type-small) font-semibold text-(color:--pm-tone-0f172a)">
                                            Show resume to employers
                                        </div>
                                        <div className="text-(length:--pm-font-size-12p5px) text-(color:--disabled-text)">
                                            Allows recruiters and hiring managers to download your uploaded CV.
                                        </div>
                                    </div>
                                    <label className="pm-switch">
                                        <input
                                            type="checkbox"
                                            checked={allowEmployerResume}
                                            onChange={(e) => {
                                                setAllowEmployerResume(e.target.checked);
                                                setFormData({ ...formData, resume_employer_visibility: e.target.checked });
                                            }}
                                        />
                                        <span className="pm-slider"></span>
                                    </label>
                                </div>

                                <div className="pt-4 border-t border-(color:--pm-tone-f1f5f9) flex items-center justify-between">
                                    <div>
                                        <div className="text-(length:--type-small) font-semibold text-(color:--pm-tone-0f172a)">
                                            Contact information
                                        </div>
                                        <div className="text-(length:--pm-font-size-12p5px) text-(color:--disabled-text)">
                                            Controls whether other members can see your email or phone number.
                                        </div>
                                    </div>
                                    <select
                                        className="pm-select w-auto text-(length:--pm-font-size-13px) py-1.5"
                                        value={formData.contact_visibility}
                                        onChange={(e) => setFormData({ ...formData, contact_visibility: e.target.value })}
                                    >
                                        <option value="private">Private (Only you)</option>
                                        <option value="members">Connections & Members</option>
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    className="pm-btn pm-btn-primary w-full"
                                    onClick={handleFormSubmit}
                                >
                                    Save privacy preferences
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {currentTab === 'edit' && (
                    <div className="pm-profile-sticky-save" role="group" aria-label="Profile edit actions">
                        <span className="pm-profile-save-description">Review your profile changes before saving.</span>
                        <div className="pm-profile-sticky-buttons">
                            <button type="button" className="pm-btn pm-btn-secondary" disabled={isSaving}
                                onClick={() => changeTab('overview')}>Cancel</button>
                            <button type="button" className="pm-btn pm-btn-primary" disabled={isSaving}
                                onClick={handleFormSubmit}>{isSaving ? 'Saving...' : 'Save changes'}</button>
                        </div>
                    </div>
                )}
            </div>
        </MemberDashboardLayout>
    );
}
