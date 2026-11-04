import { useState, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
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

type ComparisonItem = {
    field_key: string;
    field: string;
    current_value: string;
    imported_value: string;
    default_action: string;
    actions: string[];
    selected: boolean;
    notice?: string;
};

type ProfilePageProps = {
    activeTab: 'overview' | 'edit' | 'imports' | 'privacy';
    status?: string;
    profileData: {
        name: string;
        email: string;
        headline: string;
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
        featured_project: ProjectItem;
        educations: Array<{ id: number; degree: string; institution: string; year: string }>;
        certifications: Array<{ id: number; name: string; credential_number?: string; valid_until?: string; status_label?: string; verified: boolean }>;
        resume: {
            id: number;
            original_name: string;
            file_size: number;
            file_size_formatted: string;
            updated_at: string;
            is_demo: boolean;
        };
        import: {
            step: number;
            filename: string;
            comparisons: ComparisonItem[];
            history: Array<{ date: string; filename: string; fields_updated: number; status: string }>;
        };
    };
};

export default function Profile({ activeTab: initialTab = 'overview', profileData }: ProfilePageProps) {
    const { memberShell } = usePage<{ memberShell?: DashboardShellData }>().props;

    const dashboardShell: DashboardShellData = memberShell || {
        plan: 'premium',
        member: {
            name: profileData?.name || 'Sara Ahmed',
            role: profileData?.role || 'Project Manager',
            completion: profileData?.completeness || 80,
        },
        isDemo: true,
    };

    const [currentTab, setCurrentTab] = useState<'overview' | 'edit' | 'imports' | 'privacy'>(initialTab);
    const [editActiveSection, setEditActiveSection] = useState('basic');

    // Edit Form State
    const [formData, setFormData] = useState({
        name: profileData?.name || '',
        headline: profileData?.headline || '',
        role: profileData?.role || '',
        industry: profileData?.industry || '',
        country: profileData?.country || '',
        city: profileData?.city || '',
        about: profileData?.about || '',
        open_to_opportunities: profileData?.open_to_opportunities ?? true,
        visibility: profileData?.visibility || 'members_only',
        resume_employer_visibility: profileData?.resume_employer_visibility ?? true,
        contact_visibility: profileData?.contact_visibility || 'private',
    });

    const [skillsList, setSkillsList] = useState<string[]>(profileData?.skills || []);
    const [newSkillInput, setNewSkillInput] = useState('');
    const [showSkillDropdown, setShowSkillDropdown] = useState(false);

    // Experience state in edit mode
    const [expForm, setExpForm] = useState<ExperienceItem>(
        profileData?.experiences?.[0] || {
            job_title: 'Project Manager',
            organization: 'Northstar Digital',
            employment_type: 'Full-time',
            start_date: 'Jan 2022',
            end_date: '',
            is_current: true,
            responsibilities:
                'Led agile delivery for enterprise web applications across 3 cross-functional squads.\nSpearheaded bi-weekly sprint planning, retrospective rituals, and executive reporting.\nReduced release defect escape rate by 34% through automated regression gate alignment.',
        }
    );

    // Resume & Imports state (p2.png)
    const [comparisons, setComparisons] = useState<ComparisonItem[]>(profileData?.import?.comparisons || []);
    const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
        headline: true,
        experience_lead: true,
        skills_add: true,
        certifications: true,
    });
    const [allowEmployerResume, setAllowEmployerResume] = useState(profileData?.resume_employer_visibility ?? true);
    const [linkedInUrl, setLinkedInUrl] = useState('https://linkedin.com/in/sara-ahmed');
    const [isSaving, setIsSaving] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const resumeUploadRef = useRef<HTMLInputElement>(null);

    const changeTab = (tab: 'overview' | 'edit' | 'imports' | 'privacy') => {
        setCurrentTab(tab);
        router.visit(route('profile.edit', { tab }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        router.patch(
            route('profile.update'),
            {
                ...formData,
                skills: skillsList,
                tab: 'edit',
            },
            {
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

    const handleSaveExperience = () => {
        router.post(route('profile.experiences.save'), {
            ...expForm,
        });
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const uploadData = new FormData();
            uploadData.append('cover_photo', e.target.files[0]);
            uploadData.append('tab', currentTab);
            router.post(route('profile.cover.upload'), uploadData);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const uploadData = new FormData();
            uploadData.append('avatar', e.target.files[0]);
            uploadData.append('tab', currentTab);
            router.post(route('profile.avatar.upload'), uploadData);
        }
    };

    const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const uploadData = new FormData();
            uploadData.append('resume', e.target.files[0]);
            router.post(route('profile.resume.upload'), uploadData);
        }
    };

    const handleApplyImport = () => {
        const activeUpdates = Object.keys(selectedFields).filter((k) => selectedFields[k]);
        router.post(route('profile.import.apply'), {
            updates: activeUpdates,
        });
    };

    return (
        <MemberDashboardLayout dashboard={dashboardShell}>
            <Head title="My profile - PM Circle" />

            <div className="pm-profile-page">
                {/* Hidden File Inputs */}
                <input type="file" ref={coverInputRef} onChange={handleCoverChange} accept="image/*" className="hidden" aria-hidden="true" />
                <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" aria-hidden="true" />
                <input type="file" ref={resumeUploadRef} onChange={handleResumeUpload} accept=".pdf,.doc,.docx" className="hidden" aria-hidden="true" />

                {/* Top Action Header */}
                <header className="pm-profile-top-bar">
                    <div className="pm-profile-top-titles">
                        <h1>{currentTab === 'overview' ? 'My profile' : currentTab === 'edit' ? 'Edit profile' : currentTab === 'imports' ? 'Resume & imports' : 'Privacy settings'}</h1>
                        <p>
                            {currentTab === 'overview' && 'Showcase your experience, skills, and portfolio to the PM Circle community and prospective employers.'}
                            {currentTab === 'edit' && 'Keep your profile up to date to get the most relevant connections, job matches, and peer reviews.'}
                            {currentTab === 'imports' && 'Upload your resume or import from LinkedIn to auto-fill your profile and keep your credentials synchronised.'}
                            {currentTab === 'privacy' && 'Manage how your profile, contact details, and resume are displayed to other members and recruiters.'}
                        </p>
                    </div>

                    <div className="pm-profile-top-actions">
                        {currentTab === 'overview' && (
                            <>
                                <button type="button" className="pm-btn pm-btn-secondary" onClick={() => alert('Previewing public profile view...')}>
                                    <Eye size={17} /> Preview public profile
                                </button>
                                <button type="button" className="pm-btn pm-btn-primary" onClick={() => changeTab('edit')}>
                                    ✏️ Edit profile
                                </button>
                            </>
                        )}

                        {currentTab === 'edit' && (
                            <>
                                <button type="button" className="pm-btn pm-btn-secondary" onClick={() => changeTab('overview')}>
                                    Cancel
                                </button>
                                <button type="button" className="pm-btn pm-btn-primary" onClick={handleFormSubmit} disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save changes'}
                                </button>
                            </>
                        )}

                        {currentTab === 'imports' && (
                            <>
                                <a href={route('profile.resume.download', { format: 'docx' })} className="pm-btn pm-btn-secondary">
                                    <Download size={17} /> Download current CV
                                </a>
                                <button type="button" className="pm-btn pm-btn-primary" onClick={handleApplyImport}>
                                    Apply changes
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
                                            : {
                                                  backgroundImage:
                                                      'linear-gradient(135deg, rgba(10,102,194,0.85), rgba(15,23,42,0.9)), url("https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?auto=format&fit=crop&w=1200&q=80")',
                                              }
                                    }
                                >
                                    <button
                                        type="button"
                                        className="pm-hero-cover-btn"
                                        onClick={() => coverInputRef.current?.click()}
                                    >
                                        <Camera size={15} /> Change cover
                                    </button>
                                </div>

                                <div className="pm-hero-body">
                                    <div className="pm-hero-avatar-wrap">
                                        {profileData?.avatar_path ? (
                                            <img
                                                src={profileData.avatar_path}
                                                alt={profileData.name}
                                                className="pm-hero-avatar"
                                            />
                                        ) : (
                                            <div className="pm-hero-avatar">
                                                {profileData.name.charAt(0)}
                                            </div>
                                        )}
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
                                        <span className="pm-member-plan-badge">{profileData.plan_label}</span>
                                    </div>

                                    <p className="pm-hero-headline">{profileData.headline}</p>

                                    <div className="pm-hero-meta">
                                        <span className="pm-hero-location">
                                            <MapPin size={15} color="#64748B" /> {profileData.location_label}
                                        </span>
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
                                        <h3 id="about-head" className="pm-card-title">About</h3>
                                        <button type="button" className="pm-btn-ghost" onClick={() => changeTab('edit')}>
                                            ✏️ Edit
                                        </button>
                                    </div>
                                    <div className="text-[14.5px] leading-relaxed text-[#334155] whitespace-pre-line">
                                        {profileData.about}
                                    </div>
                                </div>
                            </section>

                            {/* Experience Section */}
                            <section className="pm-card" aria-labelledby="exp-head">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row">
                                        <h3 id="exp-head" className="pm-card-title">Experience</h3>
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
                                        <h3 id="proj-head" className="pm-card-title">Featured Project</h3>
                                        <button type="button" className="pm-btn-ghost" onClick={() => changeTab('edit')}>
                                            + Add project
                                        </button>
                                    </div>

                                    <div className="pm-project-card">
                                        <div className="pm-project-thumb">
                                            <Laptop size={44} strokeWidth={1.5} />
                                            <span className="text-[11px] font-semibold tracking-wider uppercase opacity-80">
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
                                                    onClick={() => alert('Opening anonymised project case study...')}
                                                >
                                                    View work sample ↗
                                                </button>
                                                <span className="text-[12px] text-[#64748B]">Anonymised case study</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Skills Section */}
                            <section className="pm-card" aria-labelledby="skills-head">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row">
                                        <h3 id="skills-head" className="pm-card-title">Skills</h3>
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
                                        <h3 id="edu-head" className="pm-card-title">Education & Certifications</h3>
                                        <button type="button" className="pm-btn-ghost" onClick={() => changeTab('edit')}>
                                            ✏️ Edit
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {profileData.educations.map((edu) => (
                                            <div key={edu.id} className="flex items-start gap-3">
                                                <GraduationCap size={22} className="text-[#0A66C2] mt-0.5" />
                                                <div>
                                                    <div className="font-semibold text-[#0F172A] text-[15px]">{edu.degree}</div>
                                                    <div className="text-[13.5px] text-[#475569]">
                                                        {edu.institution} · Graduated {edu.year}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {profileData.certifications.map((cert) => (
                                            <div key={cert.id} className="flex items-start gap-3 pt-3 border-t border-[#F1F5F9]">
                                                <Shield size={22} className="text-[#D97706] mt-0.5" />
                                                <div>
                                                    <div className="font-semibold text-[#0F172A] text-[15px]">{cert.name}</div>
                                                    <div className="text-[13.5px] text-[#475569]">
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

                                    <p className="text-[13.5px] text-[#475569] m-0">
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
                                        <h4 className="pm-card-title text-[16px]">Profile completeness</h4>
                                    </div>

                                    <div className="pm-progress-widget">
                                        <div className="pm-ring-circle">
                                            <svg viewBox="0 0 36 36">
                                                <path
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none"
                                                    stroke="#E2E8F0"
                                                    strokeWidth="3.5"
                                                />
                                                <path
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none"
                                                    stroke="#0A66C2"
                                                    strokeWidth="3.5"
                                                    strokeDasharray={`${profileData.completeness}, 100`}
                                                />
                                            </svg>
                                            <div className="pm-ring-val">{profileData.completeness}%</div>
                                        </div>

                                        <div className="pm-progress-text">
                                            Your profile is <strong>{profileData.completeness}% complete</strong>. Profiles above 80% receive 3x more peer reviews and employer visibility.
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
                                        <h4 className="pm-card-title text-[16px]">Profile visibility</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[12px] font-semibold text-[#64748B] uppercase block mb-1">
                                                Who can see your profile
                                            </label>
                                            <select
                                                className="pm-select text-[13.5px] py-2"
                                                value={formData.visibility}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, visibility: e.target.value });
                                                    router.patch(route('profile.update'), {
                                                        visibility: e.target.value,
                                                    });
                                                }}
                                            >
                                                <option value="members_only">Members only (Recommended)</option>
                                                <option value="public">Public to web</option>
                                                <option value="private">Private (Only you)</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                                            <span className="text-[13.5px] font-medium text-[#1E293B]">
                                                Show resume to employers
                                            </span>
                                            <label className="pm-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={allowEmployerResume}
                                                    onChange={(e) => {
                                                        setAllowEmployerResume(e.target.checked);
                                                        router.patch(route('profile.update'), {
                                                            resume_employer_visibility: e.target.checked,
                                                        });
                                                    }}
                                                />
                                                <span className="pm-slider"></span>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                                            <span className="text-[13.5px] font-medium text-[#1E293B]">Contact details</span>
                                            <span className="text-[13px] text-[#64748B] font-semibold">Private</span>
                                        </div>

                                        <button
                                            type="button"
                                            className="text-[13px] text-[#0A66C2] font-semibold hover:underline block pt-1"
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
                                        <h4 className="pm-card-title text-[16px]">Resume</h4>
                                    </div>

                                    <div className="pm-resume-card-inner">
                                        <div className="pm-doc-icon">DOCX</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="pm-doc-name truncate">{profileData.resume.original_name}</div>
                                            <div className="pm-doc-meta">
                                                Updated {profileData.resume.updated_at} · {profileData.resume.file_size_formatted}
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
                                        <h4 className="pm-card-title text-[16px]">Profile insights</h4>
                                    </div>

                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-[28px] font-bold text-[#0F172A]">{profileData.insights.views}</span>
                                        <span className="text-[13px] text-[#16A34A] font-semibold">
                                            {profileData.insights.change} {profileData.insights.period}
                                        </span>
                                    </div>

                                    <p className="text-[13px] text-[#64748B] mb-3">
                                        Profile views from peers, project leaders, and verified recruiters.
                                    </p>

                                    <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                                        <div className="text-[12.5px] font-semibold text-[#1E40AF] mb-1 flex items-center gap-1.5">
                                            <Sparkles size={14} /> Pro member insight
                                        </div>
                                        <p className="text-[12px] text-[#1E3A8A] m-0">
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
                        {/* Left Anchor Navigation */}
                        <nav className="pm-edit-nav" aria-label="Edit section anchors">
                            <button
                                type="button"
                                className={`pm-edit-nav-item ${editActiveSection === 'basic' ? 'is-active' : ''}`}
                                onClick={() => setEditActiveSection('basic')}
                            >
                                Basic details
                            </button>
                            <button
                                type="button"
                                className={`pm-edit-nav-item ${editActiveSection === 'about' ? 'is-active' : ''}`}
                                onClick={() => setEditActiveSection('about')}
                            >
                                About & skills
                            </button>
                            <button
                                type="button"
                                className={`pm-edit-nav-item ${editActiveSection === 'experience' ? 'is-active' : ''}`}
                                onClick={() => setEditActiveSection('experience')}
                            >
                                Experience
                            </button>
                            <button
                                type="button"
                                className={`pm-edit-nav-item ${editActiveSection === 'projects' ? 'is-active' : ''}`}
                                onClick={() => setEditActiveSection('projects')}
                            >
                                Projects (1)
                            </button>
                            <button
                                type="button"
                                className={`pm-edit-nav-item ${editActiveSection === 'education' ? 'is-active' : ''}`}
                                onClick={() => setEditActiveSection('education')}
                            >
                                Education (1)
                            </button>
                            <button
                                type="button"
                                className={`pm-edit-nav-item ${editActiveSection === 'certifications' ? 'is-active' : ''}`}
                                onClick={() => setEditActiveSection('certifications')}
                            >
                                Certifications (1)
                            </button>
                            <button
                                type="button"
                                className={`pm-edit-nav-item ${editActiveSection === 'career' ? 'is-active' : ''}`}
                                onClick={() => setEditActiveSection('career')}
                            >
                                Career preferences
                            </button>
                            <button
                                type="button"
                                className={`pm-edit-nav-item ${editActiveSection === 'links' ? 'is-active' : ''}`}
                                onClick={() => setEditActiveSection('links')}
                            >
                                Links & languages
                            </button>
                        </nav>

                        {/* Middle Editor Form */}
                        <form onSubmit={handleFormSubmit} className="space-y-6">
                            {/* Photo and Cover Editor */}
                            <div className="pm-card">
                                <div className="pm-card-body space-y-4">
                                    <div>
                                        <label className="pm-label mb-2 block">Cover banner</label>
                                        <div
                                            className="border-2 border-dashed border-[#CBD5E1] rounded-lg p-4 text-center cursor-pointer hover:border-[#0A66C2] transition-colors"
                                            onClick={() => coverInputRef.current?.click()}
                                        >
                                            <div className="text-[13.5px] font-semibold text-[#0A66C2]">
                                                Click to upload new cover photo
                                            </div>
                                            <div className="text-[12px] text-[#64748B]">
                                                Recommended: 1200 x 300px · Max 5MB JPG or PNG
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-[#F1F5F9] flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-[#E2E8F0] flex items-center justify-center font-bold text-[#0A66C2] text-xl overflow-hidden border">
                                            {profileData.avatar_path ? (
                                                <img src={profileData.avatar_path} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                formData.name.charAt(0)
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    className="pm-btn pm-btn-secondary pm-btn-sm"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    Change photo
                                                </button>
                                                <button
                                                    type="button"
                                                    className="pm-btn-ghost text-red-600 text-xs"
                                                    onClick={() => alert('Photo reset to initials.')}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <div className="text-[12px] text-[#64748B]">
                                                Recommended: 400 x 400px · JPG or PNG
                                            </div>
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
                                                className="pm-input"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="pm-form-group">
                                            <label className="pm-label">Professional headline *</label>
                                            <input
                                                type="text"
                                                className="pm-input"
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
                                                className="pm-input"
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="pm-form-group">
                                            <label className="pm-label">Industry *</label>
                                            <input
                                                type="text"
                                                className="pm-input"
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
                                                className="pm-input"
                                                value={formData.country}
                                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="pm-form-group">
                                            <label className="pm-label">City *</label>
                                            <input
                                                type="text"
                                                className="pm-input"
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
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
                                            className="pm-textarea"
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

                            {/* Section: Experience Accordion */}
                            <div className="pm-card" id="experience-section">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row mb-4">
                                        <h3 className="pm-card-title">Experience</h3>
                                        <span className="text-[13px] text-[#64748B]">1 entry</span>
                                    </div>

                                    <div className="pm-accordion-box">
                                        <div className="pm-accordion-head">
                                            <span>
                                                {expForm.job_title} at {expForm.organization}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    className="text-red-500 hover:text-red-700"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        alert('Delete experience confirmed.');
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <ChevronDown size={18} />
                                            </div>
                                        </div>

                                        <div className="pm-accordion-body space-y-4">
                                            <div className="pm-form-row-2">
                                                <div className="pm-form-group">
                                                    <label className="pm-label">Job title *</label>
                                                    <input
                                                        type="text"
                                                        className="pm-input"
                                                        value={expForm.job_title}
                                                        onChange={(e) => setExpForm({ ...expForm, job_title: e.target.value })}
                                                        required
                                                    />
                                                </div>

                                                <div className="pm-form-group">
                                                    <label className="pm-label">Organisation *</label>
                                                    <input
                                                        type="text"
                                                        className="pm-input"
                                                        value={expForm.organization}
                                                        onChange={(e) => setExpForm({ ...expForm, organization: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="pm-form-row-2">
                                                <div className="pm-form-group">
                                                    <label className="pm-label">Employment type *</label>
                                                    <select
                                                        className="pm-select"
                                                        value={expForm.employment_type}
                                                        onChange={(e) => setExpForm({ ...expForm, employment_type: e.target.value })}
                                                    >
                                                        <option value="Full-time">Full-time</option>
                                                        <option value="Part-time">Part-time</option>
                                                        <option value="Contract">Contract</option>
                                                        <option value="Freelance">Freelance</option>
                                                    </select>
                                                </div>

                                                <div className="pm-form-group">
                                                    <label className="pm-label">Start date *</label>
                                                    <input
                                                        type="text"
                                                        className="pm-input"
                                                        placeholder="e.g. Jan 2022"
                                                        value={expForm.start_date}
                                                        onChange={(e) => setExpForm({ ...expForm, start_date: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="checkbox"
                                                    id="currWork"
                                                    checked={expForm.is_current}
                                                    onChange={(e) => setExpForm({ ...expForm, is_current: e.target.checked })}
                                                />
                                                <label htmlFor="currWork" className="text-[13.5px] font-medium text-[#1E293B]">
                                                    Currently work here
                                                </label>
                                            </div>

                                            <div className="pm-form-group">
                                                <label className="pm-label">Responsibilities & measurable outcomes</label>
                                                <textarea
                                                    rows={4}
                                                    className="pm-textarea"
                                                    value={expForm.responsibilities || ''}
                                                    onChange={(e) => setExpForm({ ...expForm, responsibilities: e.target.value })}
                                                    maxLength={1000}
                                                />
                                                <span className="pm-char-count">{(expForm.responsibilities || '').length} / 1000</span>
                                            </div>

                                            <button
                                                type="button"
                                                className="pm-btn pm-btn-secondary pm-btn-sm"
                                                onClick={handleSaveExperience}
                                            >
                                                Save experience entry
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="pm-btn pm-btn-secondary pm-btn-sm w-full mt-2"
                                        onClick={() => alert('New experience form opened.')}
                                    >
                                        + Add another experience
                                    </button>
                                </div>
                            </div>

                            {/* Collapsed Sub-sections matching p1.png */}
                            <div className="space-y-3">
                                {[
                                    { title: 'Projects (1)', count: 1 },
                                    { title: 'Education (1)', count: 1 },
                                    { title: 'Certifications (1)', count: 1 },
                                    { title: 'Career preferences', note: 'Open to opportunities' },
                                    { title: 'Links & languages', note: 'LinkedIn, English, Bangla' },
                                ].map((sec) => (
                                    <div key={sec.title} className="pm-card cursor-pointer hover:bg-slate-50 transition-colors">
                                        <div className="pm-card-body py-4 flex items-center justify-between">
                                            <span className="font-semibold text-[15px] text-[#0F172A]">{sec.title}</span>
                                            <div className="flex items-center gap-2 text-[13px] text-[#64748B]">
                                                {sec.note && <span>{sec.note}</span>}
                                                <ChevronRight size={17} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </form>

                        {/* Right Quick Helper Sidebar */}
                        <aside className="space-y-4">
                            {/* Build From Resume CTA */}
                            <div className="pm-card">
                                <div className="pm-card-body">
                                    <h4 className="pm-card-title text-[15px] mb-2 flex items-center gap-2">
                                        <UploadCloud size={18} className="text-[#0A66C2]" /> Build from your resume
                                    </h4>
                                    <p className="text-[13px] text-[#475569] mb-4">
                                        Skip manual typing. Upload your resume and we will auto-fill your profile details.
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
                                    <h4 className="pm-card-title text-[15px] mb-2">Privacy</h4>
                                    <p className="text-[13px] text-[#475569]">
                                        Your profile is currently visible to <strong>Members only</strong>. Changes you make are updated instantly.
                                    </p>
                                </div>
                            </div>

                            {/* Account Card */}
                            <div className="pm-card">
                                <div className="pm-card-body">
                                    <h4 className="pm-card-title text-[15px] mb-2">Account</h4>
                                    <div className="text-[13.5px] font-semibold text-[#0F172A] mb-1">{formData.name}</div>
                                    <div className="text-[13px] text-[#475569] mb-2 flex items-center gap-1.5">
                                        {profileData.email} <CheckCircle2 size={14} className="text-emerald-600" />
                                    </div>
                                    <Link href="/settings/security" className="text-[13px] text-[#0A66C2] font-semibold hover:underline">
                                        Manage password and security →
                                    </Link>
                                </div>
                            </div>
                        </aside>
                    </div>
                )}

                {/* ==============================================================
                    TAB 3: RESUME & IMPORTS (p2.png)
                   ============================================================== */}
                {currentTab === 'imports' && (
                    <div className="space-y-6">
                        {/* Dual Top Cards: Upload Resume & LinkedIn Import */}
                        <div className="pm-imports-top-grid">
                            {/* Card 1: Resume Upload */}
                            <div className="pm-card">
                                <div className="pm-card-body">
                                    <h3 className="pm-card-title mb-1">Upload a resume</h3>
                                    <p className="text-[13px] text-[#64748B] mb-4">
                                        Upload your latest CV to update your profile automatically.
                                    </p>

                                    <div
                                        className="pm-dropzone-box"
                                        onClick={() => resumeUploadRef.current?.click()}
                                    >
                                        <UploadCloud size={32} className="mx-auto text-[#0A66C2] mb-2" />
                                        <div className="text-[14px] font-semibold text-[#0F172A]">
                                            Drag and drop your resume here, or <span className="text-[#0A66C2] underline">browse files</span>
                                        </div>
                                        <div className="text-[12px] text-[#64748B] mt-1">
                                            Supported: PDF, DOCX up to 5 MB
                                        </div>
                                    </div>

                                    <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="pm-doc-icon text-[10px]">DOCX</div>
                                            <div>
                                                <div className="text-[13.5px] font-semibold text-[#0F172A]">
                                                    {profileData.resume.original_name}
                                                </div>
                                                <div className="text-[12px] text-[#64748B]">
                                                    {profileData.resume.file_size_formatted} · Updated {profileData.resume.updated_at}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <a
                                                href={route('profile.resume.download')}
                                                className="pm-btn-ghost text-xs"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Preview
                                            </a>
                                            <button
                                                type="button"
                                                className="pm-btn-ghost text-xs"
                                                onClick={() => resumeUploadRef.current?.click()}
                                            >
                                                Replace
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: LinkedIn Import */}
                            <div className="pm-card">
                                <div className="pm-card-body">
                                    <h3 className="pm-card-title mb-1">Import from LinkedIn</h3>
                                    <p className="text-[13px] text-[#64748B] mb-4">
                                        Synchronise work history and skills from your LinkedIn profile.
                                    </p>

                                    <div className="space-y-3">
                                        <div className="pm-form-group mb-2">
                                            <label className="pm-label">LinkedIn public URL</label>
                                            <input
                                                type="text"
                                                className="pm-input"
                                                value={linkedInUrl}
                                                onChange={(e) => setLinkedInUrl(e.target.value)}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            className="pm-btn pm-btn-secondary pm-btn-sm w-full"
                                            onClick={() => alert('LinkedIn profile URL saved.')}
                                        >
                                            Save LinkedIn link
                                        </button>

                                        <div className="flex items-center gap-2 my-2 text-center text-[#94A3B8] text-[12px]">
                                            <div className="flex-1 border-t border-[#E2E8F0]"></div>
                                            <span>or</span>
                                            <div className="flex-1 border-t border-[#E2E8F0]"></div>
                                        </div>

                                        <button
                                            type="button"
                                            className="pm-btn pm-btn-secondary pm-btn-sm w-full"
                                            onClick={() => alert('Select your downloaded LinkedIn PDF export.')}
                                        >
                                            Upload LinkedIn profile PDF / export
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Extraction Review Stepper Card (p2.png) */}
                        <div className="pm-card">
                            {/* Stepper Header */}
                            <div className="pm-stepper-wrap">
                                <div className="pm-step-item is-done">
                                    <div className="pm-step-num"><Check size={14} /></div>
                                    <span>1. Upload document</span>
                                </div>
                                <div className="w-12 h-0.5 bg-[#CBD5E1]"></div>
                                <div className="pm-step-item is-current">
                                    <div className="pm-step-num">2</div>
                                    <span>2. Review extracted data</span>
                                </div>
                                <div className="w-12 h-0.5 bg-[#CBD5E1]"></div>
                                <div className="pm-step-item">
                                    <div className="pm-step-num">3</div>
                                    <span>3. Apply updates</span>
                                </div>
                            </div>

                            <div className="pm-card-body">
                                <h3 className="pm-card-title mb-1">
                                    Review extracted data from {profileData.import.filename}
                                </h3>
                                <p className="text-[13.5px] text-[#475569] mb-4">
                                    Compare extracted values against your current profile. Choose which fields to replace, merge, or keep.
                                </p>

                                <div className="pm-notice-alert">
                                    <Info size={17} className="flex-shrink-0" />
                                    <span>
                                        <strong>Certification details remain self-reported.</strong> We do not automatically claim third-party verification without manual review.
                                    </span>
                                </div>

                                {/* Comparison Table */}
                                <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg mb-4">
                                    <table className="pm-comparison-tbl">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={Object.values(selectedFields).every(Boolean)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            const updated: Record<string, boolean> = {};
                                                            comparisons.forEach((c) => {
                                                                updated[c.field_key] = checked;
                                                            });
                                                            setSelectedFields(updated);
                                                        }}
                                                    />
                                                </th>
                                                <th>Field</th>
                                                <th>Current profile</th>
                                                <th>Imported value</th>
                                                <th style={{ width: '180px' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {comparisons.map((row) => (
                                                <tr key={row.field_key}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!selectedFields[row.field_key]}
                                                            onChange={(e) =>
                                                                setSelectedFields({
                                                                    ...selectedFields,
                                                                    [row.field_key]: e.target.checked,
                                                                })
                                                            }
                                                        />
                                                    </td>
                                                    <td className="pm-tbl-field-name">{row.field}</td>
                                                    <td className="pm-tbl-current">{row.current_value}</td>
                                                    <td className="pm-tbl-imported">{row.imported_value}</td>
                                                    <td>
                                                        <select
                                                            className="pm-select py-1.5 text-[13px]"
                                                            defaultValue={row.default_action}
                                                        >
                                                            {row.actions.map((act) => (
                                                                <option key={act} value={act}>
                                                                    {act}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Bottom Selection Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                    <div className="flex items-center gap-6">
                                        <label className="flex items-center gap-2 text-[13px] font-medium text-[#1E293B] cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Object.values(selectedFields).every(Boolean)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    const updated: Record<string, boolean> = {};
                                                    comparisons.forEach((c) => {
                                                        updated[c.field_key] = checked;
                                                    });
                                                    setSelectedFields(updated);
                                                }}
                                            />
                                            Select all new fields
                                        </label>
                                        <label className="flex items-center gap-2 text-[13px] font-medium text-[#1E293B] cursor-pointer">
                                            <input type="checkbox" defaultChecked />
                                            Keep existing data as backup
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            className="pm-btn pm-btn-secondary pm-btn-sm"
                                            onClick={() => changeTab('overview')}
                                        >
                                            Cancel import
                                        </button>
                                        <button
                                            type="button"
                                            className="pm-btn pm-btn-primary pm-btn-sm"
                                            onClick={handleApplyImport}
                                        >
                                            Apply {Object.values(selectedFields).filter(Boolean).length} selected updates
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Resume Document Management Bar */}
                        <div className="pm-card">
                            <div className="pm-card-body flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="pm-doc-icon">DOCX</div>
                                    <div>
                                        <div className="font-semibold text-[#0F172A] text-[15px]">
                                            {profileData.resume.original_name}
                                        </div>
                                        <div className="text-[13px] text-[#64748B]">
                                            Updated {profileData.resume.updated_at} · {profileData.resume.file_size_formatted}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <a
                                        href={route('profile.resume.download', { format: 'pdf' })}
                                        className="pm-btn pm-btn-secondary pm-btn-sm"
                                    >
                                        <Download size={14} /> Download PDF
                                    </a>
                                    <a
                                        href={route('profile.resume.download', { format: 'word' })}
                                        className="pm-btn pm-btn-secondary pm-btn-sm"
                                    >
                                        <Download size={14} /> Download Word
                                    </a>
                                    <button
                                        type="button"
                                        className="pm-btn pm-btn-secondary pm-btn-sm"
                                        onClick={() => alert('Generating standardized resume from your profile...')}
                                    >
                                        <RefreshCw size={14} /> Generate from profile
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50 border-t border-[#E2E8F0] flex items-center justify-between">
                                <span className="text-[13.5px] font-medium text-[#1E293B]">
                                    Allow employers and verified recruiters to view and download my resume
                                </span>
                                <label className="pm-switch">
                                    <input
                                        type="checkbox"
                                        checked={allowEmployerResume}
                                        onChange={(e) => {
                                            setAllowEmployerResume(e.target.checked);
                                            router.patch(route('profile.update'), {
                                                resume_employer_visibility: e.target.checked,
                                            });
                                        }}
                                    />
                                    <span className="pm-slider"></span>
                                </label>
                            </div>
                        </div>

                        {/* Import History Accordion */}
                        <div className="pm-card">
                            <button
                                type="button"
                                className="w-full px-6 py-4 flex items-center justify-between text-left font-semibold text-[15px] text-[#0F172A] hover:bg-slate-50 transition-colors"
                                onClick={() => setHistoryOpen(!historyOpen)}
                            >
                                <span>Import history (1)</span>
                                <ChevronDown size={18} className={`transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {historyOpen && (
                                <div className="px-6 pb-4 pt-1 border-t border-slate-100 space-y-2">
                                    {profileData.import.history.map((hist, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-[13px] py-2 border-b last:border-none">
                                            <div>
                                                <div className="font-semibold text-[#0F172A]">{hist.filename}</div>
                                                <div className="text-[#64748B]">{hist.date} · {hist.fields_updated} fields updated</div>
                                            </div>
                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold">
                                                {hist.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
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
                                    <p className="text-[13px] text-[#64748B] mb-2">
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

                                <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                                    <div>
                                        <div className="text-[14px] font-semibold text-[#0F172A]">
                                            Open to career opportunities
                                        </div>
                                        <div className="text-[12.5px] text-[#64748B]">
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

                                <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                                    <div>
                                        <div className="text-[14px] font-semibold text-[#0F172A]">
                                            Show resume to employers
                                        </div>
                                        <div className="text-[12.5px] text-[#64748B]">
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

                                <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                                    <div>
                                        <div className="text-[14px] font-semibold text-[#0F172A]">
                                            Contact information
                                        </div>
                                        <div className="text-[12.5px] text-[#64748B]">
                                            Controls whether other members can see your email or phone number.
                                        </div>
                                    </div>
                                    <select
                                        className="pm-select w-auto text-[13px] py-1.5"
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
            </div>
        </MemberDashboardLayout>
    );
}
