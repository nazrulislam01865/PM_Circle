export type RefillField = 'title' | 'credits' | 'price' | 'expiry' | 'reason';
export type RefillErrors = Partial<Record<RefillField, string>>;

type RefillInput = Record<RefillField, string> & { kind: 'add' | 'edit' | 'archive' };

const integerInRange = (value: string, max: number) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= max;

export function validateRefill(input: RefillInput): { errors: RefillErrors; priceMinor: number } {
    const errors: RefillErrors = {};
    let priceMinor = 0;
    if (input.kind !== 'archive') {
        if (!input.title.trim()) errors.title = 'Enter a package name.';
        else if (input.title.length > 120) errors.title = 'Package name must be 120 characters or fewer.';
        if (!input.credits.trim()) errors.credits = 'Enter the number of AI credits.';
        else if (!integerInRange(input.credits, 100000)) errors.credits = 'Enter a whole number from 1 to 100,000.';
        const [whole, fraction = ''] = input.price.split('.');
        priceMinor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
        if (!input.price.trim()) errors.price = 'Enter the total price in BDT.';
        else if (!/^\d+(\.\d{1,2})?$/.test(input.price) || !Number.isSafeInteger(priceMinor) || priceMinor < 1 || priceMinor > 100000000) {
            errors.price = 'Enter a price from 0.01 to 1,000,000 BDT, with at most two decimal places.';
        }
        if (input.expiry !== '' && !integerInRange(input.expiry, 3650)) errors.expiry = 'Enter a whole number from 1 to 3,650 days, or leave blank.';
    }
    if (!input.reason.trim()) errors.reason = 'Enter a change reason for the audit record.';
    else if (input.reason.length > 500) errors.reason = 'Change reason must be 500 characters or fewer.';
    return { errors, priceMinor };
}

export function refillServerErrors(errors: Record<string, string[]>): { fields: RefillErrors; general: string[] } {
    const aliases: Record<string, RefillField> = { title: 'title', credits: 'credits', price_minor: 'price', expires_after_days: 'expiry', reason: 'reason' };
    const fields: RefillErrors = {};
    const general: string[] = [];
    for (const [key, messages] of Object.entries(errors)) {
        if (Object.hasOwn(aliases, key)) fields[aliases[key]] = messages.join(' ');
        else general.push(...messages);
    }
    return { fields, general };
}
