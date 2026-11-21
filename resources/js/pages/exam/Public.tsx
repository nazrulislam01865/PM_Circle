import { Head, usePage } from '@inertiajs/react';
import {
    PmpPublicBenefits, PmpPublicFaq, PmpPublicHero, PmpPublicPlans,
    PmpPublicSampleStudy, PmpPublicTestimonials, PmpPublicVideoStories,
} from '@/components/exam/PmpPublicSections';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { ExamQuestion } from '@/components/exam/ExamShared';
import type { PmpPublicContent } from '@/types/pmp-public';

export default function PublicPmpExam({ content, sampleQuestion, sampleQuestions, sampleDurationSeconds }: { content: PmpPublicContent; sampleQuestion: ExamQuestion | null; sampleQuestions: ExamQuestion[]; sampleDurationSeconds: number }) {
    const { auth } = usePage<{ auth?: { user?: { is_admin?: boolean } | null } }>().props;
    const destination = auth?.user?.is_admin ? '/admin' : auth?.user ? '/membership' : '/register';

    return <PublicLayout siteLayout active="/exam-simulator/pmp" footerVariant={content.sections.footer ? "pmp" : undefined} pmpFooterContent={content.sections.footer ? content.footer : undefined} hideFooter={!content.sections.footer}>
        <Head title="PMP Exam Simulator | PM Circle">
            <meta name="description" content="Explore PMP-style practice, a free sample question, simulator plan comparisons and study resources from PM Circle."/>
        </Head>
        <div className="pm-pmp-public-page">
            <div className="pm-pmp-public-container">
                {content.sections.hero && <PmpPublicHero content={content.hero}/>}
                {content.sections.benefits && <PmpPublicBenefits content={content.benefits}/>}
                {(content.sections.sample || content.sections.ai) && <PmpPublicSampleStudy sample={content.sections.sample ? content.sample : null} ai={content.sections.ai ? content.ai : null} sampleQuestion={sampleQuestion} sampleQuestions={sampleQuestions} sampleDurationSeconds={sampleDurationSeconds}/>}
                {content.sections.plans && <PmpPublicPlans content={content.plans} destination={destination}/>}
                {content.sections.faq && <PmpPublicFaq content={content.faq}/>}
                {content.sections.video && <PmpPublicVideoStories content={content.video}/>}
                {content.sections.testimonials && <PmpPublicTestimonials content={content.testimonials}/>}
            </div>
        </div>
    </PublicLayout>;
}
