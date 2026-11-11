import { Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, ClipboardList, FileText, UsersRound, CalendarClock, AlertCircle } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';

type Props = {
    homepage: { configured: boolean; updatedAt: string | null; updatedBy: string | null; visibleSections: number };
    stats: { publishedScenarios: number; publicPosts: number; publicMembers: number };
};

export default function Dashboard({ homepage, stats }: Props) {
    const cards = [
        { label: 'Published scenarios', value: stats.publishedScenarios, Icon: ClipboardList },
        { label: 'Public posts', value: stats.publicPosts, Icon: FileText },
        { label: 'Public members', value: stats.publicMembers, Icon: UsersRound },
        { label: 'Visible homepage sections', value: homepage.visibleSections, Icon: CheckCircle2 },
    ];
    return <AdminLayout title="Admin dashboard" subtitle="Manage the public homepage without changing the member workspace." active="/admin">
        <div className="pm-admin-stats">{cards.map(({ label, value, Icon }) => <article className="pm-admin-stat pm-admin-panel" key={label}>
            <div className="pm-admin-stat-head"><span>{label}</span><Icon size={20} aria-hidden="true"/></div>
            <strong className="pm-admin-stat-number">{value.toLocaleString()}</strong>
        </article>)}</div>
        <section className="pm-admin-panel pm-admin-dashboard-action">
            <div><span className="pm-admin-kicker">HOMEPAGE MANAGEMENT</span><h2>Homepage control</h2>
                <p>Edit the public hero, career pathway, daily challenge labels, community cards, skills and career highlights. All changes are saved in the existing homepage content record.</p>
                <div className="pm-admin-meta"><CalendarClock size={17} aria-hidden="true"/>
                    {homepage.updatedAt ? `Last saved ${new Date(homepage.updatedAt).toLocaleString()}${homepage.updatedBy ? ` by ${homepage.updatedBy}` : ''}` : 'Not configured yet'}
                </div>
                {!homepage.configured && <p className="pm-admin-alert"><AlertCircle size={17}/> Run the existing HomePageContentSeeder before editing.</p>}
            </div><Link href="/admin/homepage" className="pm-admin-button pm-admin-button-primary">Manage homepage <ArrowRight size={17}/></Link>
        </section>
        <p className="pm-admin-guidance">Only accounts explicitly granted administrator access may open this area. Public pages and member dashboard permissions remain separate.</p>
    </AdminLayout>;
}
