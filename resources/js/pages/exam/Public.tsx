import type { Thresholds } from '@/components/exam/PmpExamResultReport';
import { Head, usePage } from '@inertiajs/react';
import {
    PmpPublicBenefits, PmpPublicFaq, PmpPublicHero, PmpPublicPlans,
    PmpPublicSampleStudy, PmpPublicTestimonials, PmpPublicVideoStories,
} from '@/components/exam/PmpPublicSections';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { ExamQuestion } from '@/components/exam/ExamShared';
import type { PmpPublicContent } from '@/types/pmp-public';
import type { RewardPromotionData } from '@/types/reward';

export default function PublicPmpExam({ content, sampleQuestion, sampleQuestions, sampleDurationSeconds, readinessThresholds }: { content: PmpPublicContent; sampleQuestion: ExamQuestion | null; sampleQuestions: ExamQuestion[]; sampleDurationSeconds: number; readinessThresholds: Thresholds }) {
    const { auth, rewardPromotion } = usePage<{ auth?: { user?: { is_admin?: boolean } | null }; rewardPromotion?: RewardPromotionData | null }>().props;
    const destination = auth?.user?.is_admin ? '/admin' : auth?.user ? '/membership' : '/register';

    return <PublicLayout siteLayout homePrototype guideLayout active="/exam-simulator/pmp" homeOfferLabel={rewardPromotion?.discountLabel} pmpFooterContent={content.sections.footer ? content.footer : undefined} hideFooter={!content.sections.footer} banner={{title: content.sections.hero ? content.hero.title : 'PMP Exam Simulator', description: content.sections.hero ? content.hero.description : undefined, parents: [{label: 'Exam Simulator', href: '/exam-simulator/pmp'}], titleId: 'pm-pmp-public-title'}}>
        <Head title="PMP Exam Simulator | PM Circle">
            <meta name="description" content="Explore PMP-style practice, a free sample question, simulator plan comparisons and study resources from PM Circle."/>
        </Head>
        <div className="pm-pmp-public-page">
            <div className="pm-pmp-public-container">
                {content.sections.hero && <PmpPublicHero content={content.hero}/>}
                {content.sections.benefits && <PmpPublicBenefits content={content.benefits}/>}
                {(content.sections.sample || content.sections.ai) && <PmpPublicSampleStudy sample={content.sections.sample ? content.sample : null} ai={content.sections.ai ? content.ai : null} sampleQuestion={sampleQuestion} sampleQuestions={sampleQuestions} sampleDurationSeconds={sampleDurationSeconds} readinessThresholds={readinessThresholds}/>}
                {content.sections.plans && <PmpPublicPlans content={content.plans} destination={destination}/>}
                {content.sections.faq && <PmpPublicFaq content={content.faq}/>}
                {content.sections.video && <PmpPublicVideoStories content={content.video}/>}
                {content.sections.testimonials && <PmpPublicTestimonials content={content.testimonials}/>}
            </div>
        </div>
    </PublicLayout>;
}
