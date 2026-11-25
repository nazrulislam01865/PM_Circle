import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { EventEditor, type EditableEvent } from '@/components/events/EventEditor';
export default function AdminEventEditor({ event }: { event: EditableEvent | null }) {
    return <AdminLayout title={event ? 'Edit event' : 'Create event'} subtitle="Manage event details and participation." active="/admin/events"><EventEditor event={event} admin/></AdminLayout>;
}
