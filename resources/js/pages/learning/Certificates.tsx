import { Head, usePage } from '@inertiajs/react';
import { CertificateCard, CourseWorkspace, CourseWorkspaceEmpty } from '@/components/learning/CourseWorkspace';
import { courseLearningRoot, type CourseCertificate } from '@/types/learning';

export default function Certificates({ certificates, isMember }: { certificates: CourseCertificate[]; isMember: boolean }) {
    const root = courseLearningRoot(usePage().url);
    return <CourseWorkspace title="Certificates" description="View and download certificates for your completed courses."><Head title="Certificates"/>
        {certificates.length ? <div className="pm-course-workspace-grid">{certificates.map(certificate => <CertificateCard certificate={certificate} key={certificate.reference} root={root}/>)}</div> : <CourseWorkspaceEmpty isMember={isMember} title={isMember ? 'No certificates yet' : 'Sign in to view your certificates'} description={isMember ? 'Complete all lessons in an enrolled course to earn a course completion certificate.' : 'Your earned certificates are private to your account.'}/>}
    </CourseWorkspace>;
}
