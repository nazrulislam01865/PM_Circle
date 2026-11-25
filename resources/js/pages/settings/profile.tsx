import { LatestBadgeCards } from '@/components/achievements/AchievementCards';
import type { AchievementBadge } from '@/components/achievements/types';
import { useState, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { ProfileEditorPrototype, type ProfileEditorDetails } from '@/components/profile/ProfileEditorPrototype';
import { ProfileOverviewSections } from '@/components/profile/ProfileOverviewSections';
import { ResumeImportsTab, type ResumeImportState, type ResumeRecord } from '@/components/profile/ResumeImportsTab';
import { ProfileImageCropDialog } from '@/components/profile/ProfileImageCropDialog';
import { ProfileHeroPhoto } from '@/components/profile/ProfileHeroPhoto';
import { ProfilePrivacyTab, type ProfilePrivacyAudience, type ProfilePrivacyFieldGroup } from '@/components/profile/ProfilePrivacyTab';
import {
    Camera,
    ChevronRight,
    FileText,
    MapPin,
    ImagePlus,
    Sparkle,
    Plus,
    Sparkles,
    UserRound,
} from 'lucide-react';
import { ProfileWorkspaceHeader, type ProfileTab } from '@/components/profile/ProfileWorkspaceHeader';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardShellData } from '@/types/dashboard';
import type { ProfileRewardData } from '@/types/reward';
import { ProfileCompletionReward } from '@/components/rewards/ProfileCompletionReward';

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
    canUseAssistant: boolean;
    activeTab: 'overview' | 'edit' | 'imports' | 'privacy';
    profileReward: ProfileRewardData | null;
    privacyFieldGroups: ProfilePrivacyFieldGroup[];
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
        field_visibility: Record<string, ProfilePrivacyAudience>;
        resume_employer_visibility: boolean;
        contact_visibility: string;
        linkedin_url: string;
        languages: string[];
        editor_details?: ProfileEditorDetails;
        plan_label: string;
        location_label: string;
        status_label: string;
        completeness: number;
        insights: {
            views: number;
            change: string;
            period: string;
        };
        latest_badges: AchievementBadge[];
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

export default function Profile({ activeTab: initialTab = 'overview', profileData, profileReward, privacyFieldGroups = [], canUseAssistant }: ProfilePageProps) {
    const { memberShell } = usePage<{ memberShell?: DashboardShellData }>().props;

    const dashboardShell: DashboardShellData = memberShell || {
        plan: 'free',
        member: {
            id: profileData?.id ?? 0,
            name: profileData?.name || '',
            role: profileData?.role || '',
            completion: profileData?.completeness ?? 0,
        },
        isDemo: false,
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

    const [allowEmployerResume, setAllowEmployerResume] = useState(profileData?.resume_employer_visibility ?? false);
    const [photoSaving, setPhotoSaving] = useState(false);
    const [photoError, setPhotoError] = useState('');
    const [pendingPhoto, setPendingPhoto] = useState<{ file: File; kind: 'avatar' | 'cover' } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const resumeUploadRef = useRef<HTMLInputElement>(null);

    const changeTab = (tab: ProfileTab) => {
        if (tab !== 'assistant') setCurrentTab(tab);
        router.visit(ProfileController.edit.url({ query: { tab } }), {
            preserveState: false,
            preserveScroll: true,
            replace: true,
        });
    };

    const prepareImage = (event: React.ChangeEvent<HTMLInputElement>, kind: 'avatar' | 'cover') => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || photoSaving) return;
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

            <div className={`pm-profile-page ${currentTab === 'edit' ? 'pm-profile-page--editor' : currentTab === 'overview' ? 'pm-profile-page--overview' : ''}`}>
                {/* Hidden File Inputs */}
                <input type="file" ref={coverInputRef} onChange={(event) => prepareImage(event, 'cover')} accept="image/jpeg,image/png,image/webp" className="hidden" aria-hidden="true" />
                <input type="file" ref={fileInputRef} onChange={(event) => prepareImage(event, 'avatar')} accept="image/jpeg,image/png,image/webp" className="hidden" aria-hidden="true" />
                <input type="file" ref={resumeUploadRef} onChange={handleResumeUpload} accept=".pdf,.docx" className="hidden" aria-hidden="true" />

                <ProfileImageCropDialog file={pendingPhoto?.file || null} kind={pendingPhoto?.kind || 'avatar'}
                    onCancel={() => setPendingPhoto(null)} onConfirm={uploadCroppedImage} />
                {photoError && <div className="pm-profile-upload-alert" role="alert">{photoError}</div>}
                {photoSaving && <p className="pm-profile-upload-status" role="status">Uploading image...</p>}

                <ProfileWorkspaceHeader tab={currentTab} memberId={profileData.id} canUseAssistant={canUseAssistant} onTab={changeTab}/>

                {/* ==============================================================
                    TAB 1: OVERVIEW (p3.png)
                   ============================================================== */}
                {currentTab === 'overview' && (
                    <div className="pm-profile-overview-grid">
                        {/* Main Left Column */}
                        <div className="pm-profile-main-col">
                            {/* Hero Card */}
                            <div className="pm-hero-card pm-profile-overview-hero">
                                <div
                                    className="pm-hero-cover"
                                    style={
                                        profileData?.cover_photo_path
                                            ? { backgroundImage: `url(${profileData.cover_photo_path}), url(/images/pm-profile-overview-cover.webp)` }
                                            : undefined
                                    }
                                >
                                    <button type="button" className="pm-btn pm-btn-secondary pm-hero-cover-action"
                                        disabled={photoSaving} onClick={() => coverInputRef.current?.click()}
                                        aria-label={profileData.cover_photo_path ? 'Change cover photo' : 'Upload cover photo'}>
                                        <ImagePlus size={16} aria-hidden="true" />
                                        <span>{profileData.cover_photo_path ? 'Change cover photo' : 'Upload cover photo'}</span>
                                    </button>
                                </div>

                                <div className="pm-hero-body">
                                    <div className="pm-hero-avatar-wrap">
                                        <ProfileHeroPhoto name={profileData.name} src={profileData.avatar_path} />
                                        <button
                                            type="button"
                                            className="pm-hero-avatar-camera"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={photoSaving}
                                            aria-label="Update profile picture"
                                        >
                                            <Camera size={16} />
                                        </button>
                                    </div>

                                    <div className="pm-hero-name-row">
                                        <h2 className="pm-hero-name">{profileData.name}</h2>
                                        <span className="pm-member-plan-badge">{dashboardShell.plan !== 'free' && <Sparkle size={14} fill="currentColor" aria-hidden="true" />}{dashboardShell.plan === 'free' ? 'Free member' : dashboardShell.plan === 'pro' ? 'Pro member' : 'Plus member'}</span>
                                    </div>

                                    {overviewHeadline && <p className="pm-hero-headline">{overviewHeadline}</p>}
                                    {overviewLocation && (
                                        <div className="pm-hero-meta">
                                            <span className="pm-hero-location">
                                                <MapPin size={16} aria-hidden="true" /><span>{overviewLocation}</span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Every editable profile section, rendered from the saved editor records. */}
                            <ProfileOverviewSections profile={profileData} featuredProjectId={profileData.featured_project?.id}
                                onEdit={() => changeTab('edit')} />

                            {/* Learning & Contributions */}
                            <section className="pm-card" aria-labelledby="learning-head">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row">
                                        <h3 id="learning-head" className="pm-card-title">Learning & Contributions</h3>
                                        <Link href="/dashboard/features/achievements?view=record" className="pm-btn-ghost inline-flex items-center gap-1">
                                            View learning record <ChevronRight size={14} />
                                        </Link>
                                    </div>

                                    <p className="text-(length:--text-body) text-(color:--muted) m-0">
                                        Track completed learning activities, scenarios and measured PMP practice time.
                                    </p>

                                    <div className="pm-learning-triplet">
                                        <div className="pm-stat-box">
                                            <div className="pm-stat-num">{profileData.learning_stats.activities}</div>
                                            <div className="pm-stat-label">Scenarios & Activities</div>
                                        </div>
                                        <div className="pm-stat-box">
                                            <div className="pm-stat-num">{profileData.learning_stats.hours}</div>
                                            <div className="pm-stat-label">PMP Practice Hours</div>
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
                            {/* The percentage remains the existing server-calculated profile score. */}
                            <section className="pm-card pm-profile-completeness" aria-labelledby="profile-completeness-title">
                                <div className="pm-card-body">
                                    <div className="pm-profile-completeness-heading">
                                        <h3 id="profile-completeness-title" className="pm-card-title"><UserRound size={20} aria-hidden="true" /> Profile completeness</h3>
                                        <strong className="pm-profile-completeness-score">{profileData.completeness}%</strong>
                                    </div>
                                    <div className="pm-profile-completeness-track" role="progressbar" aria-labelledby="profile-completeness-title" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profileData.completeness}>
                                        <span style={{ width: `${Math.min(100, Math.max(0, profileData.completeness))}%` }} />
                                    </div>
                                    <p>{profileData.completeness === 100 ? 'Your profile is complete.' : 'Add your experience, skills and education to complete your profile.'}</p>
                                    {profileData.completeness < 100 && <button
                                        type="button"
                                        className="pm-btn pm-btn-primary pm-profile-completeness-action"
                                        onClick={() => changeTab(canUseAssistant ? 'assistant' : 'edit')}
                                    >
                                        {canUseAssistant && <Sparkles size={20} aria-hidden="true" />}
                                        {canUseAssistant ? 'Complete profile with AI' : 'Complete profile'}
                                    </button>}
                                </div>
                            </section>

                            <LatestBadgeCards badges={profileData.latest_badges ?? []} variant="profile-rail"/>

                            <ProfileCompletionReward reward={profileReward} variant="profile" />

                            {/* Visibility Widget */}
                            <div className="pm-card">
                                <div className="pm-card-body">
                                    <div className="pm-card-header-row mb-3">
                                        <h4 className="pm-card-title">Profile visibility</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-(length:--text-ui) font-semibold text-(color:--muted) uppercase block mb-1">
                                                Who can see your profile
                                            </label>
                                            <select
                                                className="pm-select py-2"
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
                                            <span className="text-(length:--text-body) text-(color:--ink)">
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
                                            <span className="text-(length:--text-body) text-(color:--ink)">Contact details</span>
                                            <span className="text-(length:--text-sm) text-(color:--muted) font-semibold">Private</span>
                                        </div>

                                        <button
                                            type="button"
                                            className="text-(length:--text-ui) text-(color:--blue) font-semibold hover:underline block pt-1"
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
                                        <h4 className="pm-card-title">Resume</h4>
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
                                        <h4 className="pm-card-title">Profile insights</h4>
                                    </div>

                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-(length:--text-stat) font-bold text-(color:--ink)">{profileData.insights.views}</span>
                                        <span className="text-(length:--pm-guide-text-meta) text-(color:--pm-guide-muted) font-semibold">
                                            {profileData.insights.change} {profileData.insights.period}
                                        </span>
                                    </div>

                                    <p className="text-(length:--text-body) text-(color:--muted) mb-3">
                                        Recorded profile views in the last 30 days.
                                    </p>

                                    <div className="p-3 bg-(color:--pm-tone-eff6ff) border border-(color:--pm-tone-bfdbfe) rounded-lg">
                                        <div className="text-(length:--text-ui) font-semibold text-(color:--pm-tone-1e40af) mb-1 flex items-center gap-1.5">
                                            <Sparkles size={14} /> Pro member insight
                                        </div>
                                        <p className="text-(length:--text-body) text-(color:--pm-tone-1e3a8a) m-0">
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
                    <ProfileEditorPrototype
                        profile={{
                            ...profileData,
                            experiences: profileData.experiences.map(item => ({ ...item })),
                            projects: profileData.projects.map(item => ({ ...item })),
                            educations: profileData.educations.map(item => ({ ...item })),
                            certifications: profileData.certifications.map(item => ({ ...item })),
                        }}
                        onImport={() => changeTab('imports')}
                        onCancel={() => changeTab('overview')}
                    />
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

                {/* Tab 4: Prototype privacy fields, using the existing member header/footer. */}
                {currentTab === 'privacy' && (
                    <ProfilePrivacyTab
                        groups={privacyFieldGroups}
                        initialVisibility={profileData.field_visibility}
                        globalVisibility={profileData.visibility}
                    />
                )}
            </div>
        </MemberDashboardLayout>
    );
}
