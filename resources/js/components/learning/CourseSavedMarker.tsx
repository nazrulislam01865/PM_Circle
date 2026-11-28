import { Bookmark } from 'lucide-react';

export function CourseSavedMarker({ title, onRemove, busy = false }: { title: string; onRemove?: () => void; busy?: boolean }) {
    const icon = <Bookmark size={19} fill="currentColor" aria-hidden="true" />;
    return onRemove
        ? <button type="button" className="pm-course-saved-marker pm-home-action" disabled={busy} onClick={onRemove} aria-label={`Remove ${title} from saved courses`} title="Remove saved course">{icon}</button>
        : <span className="pm-course-saved-marker" role="img" aria-label="Saved course" title="Saved course">{icon}</span>;
}
