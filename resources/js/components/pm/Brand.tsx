import { Link } from '@inertiajs/react';

export function Brand({ small = false }: { small?: boolean }) {
    return (
        <Link href="/" className="pm-brand" aria-label="PM Circle home">
            <span className={`pm-brand-icon ${small ? 'pm-brand-icon-small' : ''}`} aria-hidden="true"><span /></span>
            <span className="pm-brand-copy"><strong>PM Circle</strong>{!small && <small>by ITQAN</small>}</span>
        </Link>
    );
}
