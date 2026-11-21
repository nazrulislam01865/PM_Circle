import { Link } from '@inertiajs/react';
import { ArrowUpFromLine, FileText, Pencil, Save } from 'lucide-react';
import type { HomeContent, HomeAiFeaturesContent } from '@/types/home';
import { HomePhoto } from './HomePhoto';
import { HomeAction, HomeSectionTitle } from './HomeUi';
import { homeAiCards, referenceText } from './reference';

const steps = [
    { title: 'Import résumé', description: 'Upload your résumé to create and prefill your PM Circle profile.', Icon: ArrowUpFromLine },
    { title: 'Edit details', description: 'Update your experience, skills and achievements.', Icon: Pencil },
    { title: 'AI improvement report', description: 'See what’s missing and get specific suggestions to improve it.', Icon: FileText },
    { title: 'Save & Export', description: 'Save your updated résumé and export a copy.', Icon: Save },
];

export function HomeAiPractice({ content }: { content?: HomeAiFeaturesContent }) {
    return <section className="pm-v2-section pm-v2-container pm-v2-ai-section" id="pm-v2-ai" aria-labelledby="pm-v2-ai-title">
        <HomeSectionTitle id="pm-v2-ai-title" title={referenceText(content?.heading, 'How AI helps you on PM Circle', 'How AI helps you practise')}
            description="Get help with exam preparation, learning and your next career step."
            action={referenceText(content?.button_label, 'Explore Plus plans', 'Explore AI tools')}
            href={content?.button_url && content.button_url !== '/pricing' ? content.button_url : '/learning'}/>
        <div className="pm-v2-ai-grid">{homeAiCards.map((card, i) => {
            // Map the original four admin controls to their corresponding cards.
            const indexMap: Record<number, number> = { 0: 0, 3: 1, 7: 2, 4: 3 };
            const admin = content?.cards?.[indexMap[i]];
            const defaultTitles = ['Ask AI about any question', 'A new AI challenge every day', 'AI helps keep the feed safe', 'Learn with AI support'];
            const defaultDescriptions = [
                'After your mock, ask follow-up questions in Question Review.',
                'Get AI feedback on your response and improve your reasoning.',
                'AI checks every post. Admins make the final call.',
                'Get AI guidance as you learn and practise.',
            ];
            const editedTitle = admin && admin.title !== defaultTitles[indexMap[i]] ? admin.title : card.title;
            const editedDescription = admin && admin.description !== defaultDescriptions[indexMap[i]] ? admin.description : card.description;
            return <Link href={card.href} className="pm-v2-image-card pm-v2-ai-card" key={card.title}>
                <HomePhoto photo={card.photo} alt="" className="pm-v2-card-image" source={admin?.image}/>
                <div className="pm-v2-card-content"><h3>{editedTitle}</h3><p>{editedDescription}</p></div>
            </Link>;
        })}</div>
    </section>;
}

export function HomeResume({ content }: { content?: HomeContent['careers'] }) {
    const title = referenceText(content?.resume?.title, 'Your experience deserves a clearer resume.', 'AI Resume Assistant');
    const description = referenceText(content?.resume?.description, 'Turn projects, responsibilities and outcomes into a focused PM resume.', 'Build your PM Circle profile and improve your résumé in one place.');
    return <section className="pm-v2-resume-section" aria-labelledby="pm-v2-resume-title"><div className="pm-v2-container pm-v2-resume-grid">
        <div className="pm-v2-resume-panel"><div className="pm-v2-resume-icon">{content?.resume?.icon_image ? <img src={content.resume.icon_image} alt=""/> : <FileText aria-hidden="true"/>}</div>
            <h2 id="pm-v2-resume-title">{title}</h2><p>{description}</p>
            <span>One starter AI review with free tokens</span>
            <HomeAction href={content?.resume?.button_url || '/register'} primary>{referenceText(content?.resume?.button_label, 'Explore AI resume assistant', 'Explore Resume Assistant')}</HomeAction>
        </div>
        <div className="pm-v2-resume-flow"><h3>How it works</h3><div className="pm-v2-resume-steps">
            {steps.map(({ title: stepTitle, description: stepDescription, Icon }) => <div className="pm-v2-resume-step" key={stepTitle}>
                <div className="pm-v2-resume-step-icon"><Icon aria-hidden="true"/></div><div><strong>{stepTitle}</strong><p>{stepDescription}</p></div>
            </div>)}
        </div></div>
    </div></section>;
}
