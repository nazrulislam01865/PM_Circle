/** A single, presentation-only date formatter shared by the homepage previews. */
export function homeRelativeDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const elapsed = Math.max(0, Date.now() - date.getTime());
    const days = Math.floor(elapsed / 86_400_000);
    if (days === 0) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
