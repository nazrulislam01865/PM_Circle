import { Link } from '@inertiajs/react';
import { BookOpen, Trophy } from 'lucide-react';
import { ContentPage, FeatureEmpty } from '@/components/pm/ContentPage';
export default function Achievements({ completedActivities, paths }: { completedActivities: number; paths: { id: number; title: string; slug: string; completedActivities: number }[] }) {
    return <ContentPage title="Achievements & learning record" subtitle="Track your own learning activity and progress towards future PM Circle achievements.">
        <section className="pm-panel pm-feature-section"><h2><Trophy size={22} className="inline-block"/> Your learning progress</h2><p>{completedActivities} practice activities completed.</p>
            {paths.length ? <div className="pm-feature-progress-grid">{paths.map(path => <Link href={`/learning/${path.slug}`} className="pm-feature-progress-card" key={path.id}><BookOpen size={20}/><strong>{path.title}</strong><small>{path.completedActivities} activities completed</small></Link>)}</div> : <FeatureEmpty title="No learning paths yet" description="Once learning paths are published, your progress will appear here." href="/learning" linkLabel="Explore learning"/>}
        </section>
        <section className="pm-panel pm-feature-section"><h2>Earned badges</h2><FeatureEmpty title="No issued badges yet" description="Badges require a verified achievement rule and award record. Completing an activity is not itself an issued certification." href="/learning" linkLabel="Continue learning"/></section>
        <p className="pm-feature-privacy">PM Circle learning achievements are platform recognition, not official PMP or Scrum certifications.</p>
    </ContentPage>;
}
