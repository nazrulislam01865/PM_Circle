import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { CourseWorkspace } from '@/components/learning/CourseWorkspace';
import { courseLearningRoot, type CourseCertificate } from '@/types/learning';

function CertificateSheet({ certificate }: { certificate: CourseCertificate }) {
    return <article className="pm-course-certificate-sheet"><p className="pm-course-certificate-brand">PM Circle by ITQAN</p><h1>Certificate of Completion</h1><p>This certifies that</p><h2>{certificate.memberName}</h2><p>has completed the course</p><h3>{certificate.courseTitle}</h3><p>Issued {certificate.issuedAt}</p><p className="pm-learn-v3-meta">Certificate reference: {certificate.reference}</p><p className="pm-learn-v3-meta">PM Circle course completion · Not a professional certification.</p></article>;
}
export default function CertificateShow({ certificate, print }: { certificate: CourseCertificate; print: boolean }) {
    const root = courseLearningRoot(usePage().url);
    useEffect(() => { if (!print) return; let active = true; void document.fonts.ready.then(() => { if (active) window.print(); }); return () => { active = false; }; }, [print]);
    if (print) return <div className="pm-app pm-guide-public-shell pm-course-certificate-print"><Head title={`Certificate · ${certificate.courseTitle}`}/><div className="pm-course-print-actions"><button type="button" className="pm-guide-button" onClick={() => window.print()}>Print / Save as PDF</button><p>Choose Save as PDF in the print dialog.</p></div><CertificateSheet certificate={certificate}/></div>;
    return <CourseWorkspace title="Certificate" description={certificate.courseTitle}><Head title="Course certificate"/><div className="pm-course-workspace-actions"><Link href={`${root}/certificates`} className="pm-guide-button is-outline">Back to certificates</Link><a className="pm-guide-button" href={`${root}/certificates/${certificate.reference}?print=1`} target="_blank" rel="noopener noreferrer">Download PDF</a></div><CertificateSheet certificate={certificate}/></CourseWorkspace>;
}
