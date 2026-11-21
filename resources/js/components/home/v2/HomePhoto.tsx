import { useState } from 'react';
import { photoFallbacks, referencePhotos, type ReferencePhotoKey } from './reference';

const REFERENCE_PHOTO_PATH = '/images/home/prototype/';

/** Uses self-hosted photography cropped from the supplied reference screenshots, with safe fallback. */
export function HomePhoto({ photo, alt, className = '', eager = false, source }: {
    photo: ReferencePhotoKey; alt: string; className?: string; eager?: boolean; source?: string | null;
}) {
    const desired = source || `${REFERENCE_PHOTO_PATH}${referencePhotos[photo]}`;
    const [failed, setFailed] = useState<string | null>(null);
    return <img src={failed === desired ? photoFallbacks[photo] : desired} alt={alt} className={className}
        loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined}
        decoding="async" onError={() => setFailed(desired)} />;
}
