import { Head, Link, router } from '@inertiajs/react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';

type Report = { id: number; post_id: number; post_body: string; reporter_name: string; reason: string; details: string | null; status: string; created_at: string };
type Pending = { id: number; body: string; topic: string; visibility: string; created_at: string; author?: { name: string } };
type Props = { reports: { data: Report[]; links: { label: string; url: string | null; active: boolean }[] }; pendingPosts: Pending[] };

export default function PostModeration({ reports, pendingPosts }: Props) {
    const busy = (postId: number, decision: 'approve' | 'reject') => {
        router.post(`/admin/post-reviews/${postId}`, { decision }, { preserveScroll: true });
    };
    return <AdminLayout title="Community moderation" subtitle="Review reported and anonymous community posts." active="/admin/post-reports">
        <Head title="Community moderation" />
        <section className="pm-admin-moderation-section"><h2>Posts awaiting publication ({pendingPosts.length})</h2>
            {pendingPosts.length === 0 && <p className="muted">No posts awaiting review.</p>}
            {pendingPosts.map(post => <article key={post.id} className="pm-admin-moderation-card"><div><strong>Anonymous {post.topic} · Author: {post.author?.name ?? "Member"} (admin only)</strong><p>{post.body}</p><small>{post.visibility} · {new Date(post.created_at).toLocaleDateString()}</small></div><div className="pm-admin-moderation-actions"><button type="button" className="pm-button" onClick={() => busy(post.id, 'approve')}>Publish</button><button type="button" className="pm-button pm-button-outline" onClick={() => busy(post.id, 'reject')}>Reject</button></div></article>)}
        </section>
        <section className="pm-admin-moderation-section"><h2>Community reports</h2>
            {reports.data.length === 0 && <p className="muted">No reports have been submitted.</p>}
            {reports.data.map(report => <article key={report.id} className="pm-admin-moderation-card"><div><strong>{report.reason.replaceAll('_', ' ')} · {report.status}</strong><p>{report.post_body}</p>{report.details && <p className="muted">Details: {report.details}</p>}<small>Reported by {report.reporter_name} · {new Date(report.created_at).toLocaleDateString()}</small></div>
                {report.status === 'pending' && <div className="pm-admin-moderation-actions"><button type="button" className="pm-button" onClick={() => router.patch(`/admin/post-reports/${report.id}`, { status: 'reviewed' }, { preserveScroll: true })}>Mark reviewed</button><button type="button" className="pm-button pm-button-outline" onClick={() => router.patch(`/admin/post-reports/${report.id}`, { status: 'dismissed' }, { preserveScroll: true })}>Dismiss</button></div>}
            </article>)}
            <nav className="pm-admin-moderation-pager" aria-label="Report pages">{reports.links.map((link, index) => link.url ? <Link key={index} href={link.url} className={link.active ? 'is-active' : ''} children={link.label.replace(/&laquo;|&raquo;/g, '')} /> : <span key={index}>{link.label.replace(/&laquo;|&raquo;/g, '')}</span>)}</nav>
        </section>
    </AdminLayout>;
}
