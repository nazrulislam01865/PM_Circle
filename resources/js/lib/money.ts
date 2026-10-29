export function taka(amountMinor: number): string { return `৳${(amountMinor / 100).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`; }
