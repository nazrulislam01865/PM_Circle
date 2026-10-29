import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 48 48" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="21" fill="white" />
            <circle cx="24" cy="24" r="10" fill="#0869e5" />
            <path d="M24 3v11M24 34v11M3 24h11M34 24h11" stroke="#0869e5" strokeWidth="3" />
        </svg>
    );
}
