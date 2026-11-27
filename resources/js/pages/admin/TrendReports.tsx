import { Link } from '@inertiajs/react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LinkedPagination } from '@/components/pm/Pagination';
import type { PageResult } from '@/types/public-content';
type Row = {id: number; slug: string; title: string; category: string; status: string; listed: boolean; ai_generated: boolean};
export default function TrendReports({ reports }: { reports: PageResult<Row> }) {
    return <AdminLayout title="Trend reports" subtitle="Manage draft, published and archived reports, including approved AI articles." active="/admin/trend-reports">
        <div className="pm-event-editor-actions"><Link className="pm-admin-button pm-admin-button-primary" href="/admin/trend-reports/create">Create report</Link><Link className="pm-admin-button" href="/admin/public-pages/trends">Page settings</Link></div>
        <section className="pm-admin-panel"><div className="pm-course-admin-table-scroll"><table className="pm-course-admin-table"><thead><tr><th>Report</th><th>Topic</th><th>Status</th><th>Listed</th><th>Action</th></tr></thead><tbody>{reports.data.map(report => <tr key={report.id}><td>{report.title}{report.ai_generated && <small> · AI</small>}</td><td>{report.category}</td><td>{report.status}</td><td>{report.listed ? 'Yes' : 'No'}</td><td><div className="pm-course-admin-row-actions"><Link className="pm-admin-button" href={`/admin/trend-reports/${report.id}/edit`}>Edit</Link>{report.status === 'published' && <Link className="pm-admin-button" href={`/pm-trends/${report.slug}`}>View</Link>}</div></td></tr>)}</tbody></table></div>{!reports.data.length && <p>No reports yet.</p>}<LinkedPagination links={reports.links} label="Admin report pages"/></section>
    </AdminLayout>;
}
