import { ArrowRight, Info, ShoppingCart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type CreditPackage = {
    id: number;
    code: string;
    title: string;
    credits: number;
    price_minor: number;
    currency: string;
    expires_after_days: number | null;
};

type PackagesResponse = {
    enabled: boolean;
    provider: 'bkash' | 'nagad' | null;
    packages: CreditPackage[];
};

type CheckoutResponse = { checkout_url?: string; code?: string };

function priceLabel(amountMinor: number, currency: string): string {
    return new Intl.NumberFormat('en-BD', {
        style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(amountMinor / 100);
}

/** Only server-configured, active packs can be purchased; the server owns all prices and settlement. */
export function PmpAiRefillPanel({ eligible }: { eligible: boolean }) {
    const [catalog, setCatalog] = useState<PackagesResponse | null>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const checkoutRequest = useRef<{ packageId: number; key: string } | null>(null);

    useEffect(() => {
        if (!eligible) {
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        fetch('/billing/ai-packages', {
            credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        }).then(async response => {
            if (!response.ok) throw new Error('AI credit packages could not be loaded.');
            const data = await response.json() as PackagesResponse;
            if (!Array.isArray(data.packages)) throw new Error('Invalid AI credit package data.');
            if (controller.signal.aborted) return;
            setCatalog(data);
            setSelected(data.enabled && data.packages.length ? data.packages[0].id : null);
        }).catch((reason: unknown) => {
            if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not load packages.');
        }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [eligible]);

    const pack = catalog?.packages.find(item => item.id === selected);
    const enabled = Boolean(eligible && catalog?.enabled && pack && catalog?.provider);
    const providerName = catalog?.provider === 'bkash' ? 'bKash' : catalog?.provider === 'nagad' ? 'Nagad' : null;

    const checkout = async () => {
        if (!enabled || !pack || submitting) return;
        // Reuse the key for an uncertain retry so the server cannot create two orders.
        const key = checkoutRequest.current?.packageId === pack.id
            ? checkoutRequest.current.key : crypto.randomUUID();
        checkoutRequest.current = { packageId: pack.id, key };
        setSubmitting(true);
        setError('');
        try {
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const response = await fetch('/billing/ai-checkout', {
                method: 'POST', credentials: 'same-origin',
                headers: {
                    Accept: 'application/json', 'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': token,
                },
                body: JSON.stringify({ package_id: pack.id, client_request_key: key }),
            });
            const result = await response.json() as CheckoutResponse;
            if (!response.ok) throw new Error(response.status === 419
                ? 'Your session expired. Reload the page before checkout.'
                : response.status === 403 ? 'Your current plan cannot purchase AI credits.'
                : 'Checkout is unavailable. No purchase has been confirmed.');
            if (!result.checkout_url || !result.checkout_url.startsWith('https://')) {
                throw new Error('The payment link is unavailable. Check your order before trying again.');
            }
            // The backend validates the provider's HTTPS checkout domain before returning this URL.
            window.location.assign(result.checkout_url);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Checkout could not be started.');
            setSubmitting(false);
        }
    };

    return <div className="pm-pmp-panel pm-pmp-refill" aria-labelledby="pm-pmp-refill-title">
        <div className="pm-pmp-refill-heading"><span className="pm-pmp-icon-tile" aria-hidden="true"><ShoppingCart/></span>
            <h2 id="pm-pmp-refill-title">Refill AI credits</h2></div>
        <p className="pm-pmp-refill-description">Add credits for eligible AI assistance through PM Circle's verified checkout.</p>
        {loading ? <p className="pm-pmp-muted" role="status">Loading available packs…</p>
            : !eligible ? <p className="pm-pmp-refill-unavailable" role="status">AI credit purchases require an active paid Plus or Pro subscription.</p>
            : !catalog?.enabled || !catalog.packages.length || !providerName
                ? <p className="pm-pmp-refill-unavailable" role="status">AI credit refills are not currently available. Your existing allocation is unchanged.</p>
                : <>
                    <fieldset><legend>Choose a credit pack</legend>
                        <div className="pm-pmp-refill-options">
                            {catalog.packages.map(item => <label key={item.id} className={selected === item.id ? 'is-selected' : ''}>
                                <input type="radio" name="pm-pmp-credit-pack" value={item.id}
                                    checked={selected === item.id} onChange={() => { setSelected(item.id); setError(''); }}/>
                                <span><strong>{item.credits.toLocaleString('en-US')} credits</strong>
                                    <span className="pm-pmp-refill-pack-title">{item.title}{item.expires_after_days ? ` · Valid ${item.expires_after_days} days` : ''}</span></span>
                                <b>{priceLabel(item.price_minor, item.currency)}</b>
                            </label>)}
                        </div>
                    </fieldset>
                    <fieldset><legend>Choose a payment method</legend>
                        <div className="pm-pmp-refill-options"><label className="is-selected">
                            <input type="radio" name="pm-pmp-payment-provider" checked readOnly/>
                            <strong>{providerName}</strong><small>Secure checkout · BDT</small>
                        </label></div>
                    </fieldset>
                    <div className="pm-pmp-refill-total"><strong>Total</strong><span>
                        <b>{pack ? priceLabel(pack.price_minor, pack.currency) : '—'}</b>
                        <small>Verified at checkout</small>
                    </span></div>
                    <button type="button" className="pm-pmp-primary" disabled={!enabled || submitting}
                        onClick={() => void checkout()}>{submitting ? 'Opening checkout…' : 'Continue to payment'} <ArrowRight size={17}/></button>
                </>}
        {error && <p className="pm-pmp-action-error" role="alert">{error}</p>}
        <p className="pm-pmp-refill-note"><Info size={14} aria-hidden="true"/>
            Credit purchases do not increase the separately enforced monthly PMP token limit.</p>
    </div>;
}
