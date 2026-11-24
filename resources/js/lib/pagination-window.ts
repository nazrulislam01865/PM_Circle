/** Bounded page numbers keep long lists from flooding narrow viewports. */
export function paginationWindow(current: number, last: number): (number | '…')[] {
    if (last <= 5) return Array.from({ length: last }, (_, i) => i + 1);
    if (current <= 2) return [1, 2, 3, '…', last];
    if (current >= last - 1) return [1, '…', last - 2, last - 1, last];
    return [1, '…', current, '…', last];
}
