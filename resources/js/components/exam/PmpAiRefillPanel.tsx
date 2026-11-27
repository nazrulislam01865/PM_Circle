import { ArrowRight, Info, ShoppingCart } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

type CreditPackage = {
    id: number;
    code: string;
    title: string;
    credits: number;
    price_minor: number;
    currency: 'BDT';
    expires_after_days: number | null;
};
type Provider = 'bkash' | 'sslcommerz';
type PackagesResponse = { enabled: boolean; providers: Provider[]; packages: CreditPackage[] };
type CheckoutResponse = { checkout_url?: string; code?: string };
const methods: { id: Provider; label: string }[] = [{ id: 'bkash', label: 'bKash' }, { id: 'sslcommerz', label: 'SSLCommerz' }];
const priceLabel = (minor: number) => new Intl.NumberFormat('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(minor / 100) + ' BDT';

/** The central credit wallet and verified billing pipeline own all prices and settlement. */
export function PmpAiRefillPanel({ eligible }: { eligible: boolean }) {
    const group = useId();
    const [catalog, setCatalog] = useState<PackagesResponse | null>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [provider, setProvider] = useState<Provider | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const checkoutKeys = useRef(new Map<string, string>());
    const checkoutBusy = useRef(false);

    useEffect(() => {
        const controller = new AbortController();
        fetch('/billing/ai-packages', {
            credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        }).then(async response => {
            if (!response.ok) throw new Error('AI credit packages could not be loaded.');
            const data = await response.json() as PackagesResponse;
            if (!Array.isArray(data.packages) || !Array.isArray(data.providers)) throw new Error('Invalid AI credit package data.');
            if (controller.signal.aborted) return;
            setCatalog(data);
            setSelected(data.packages[0]?.id ?? null);
            setProvider(methods.find(method => data.providers.includes(method.id))?.id ?? null);
        }).catch((reason: unknown) => {
            if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not load packages.');
        }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, []);

    const pack = catalog?.packages.find(item => item.id === selected);
    const enabled = Boolean(eligible && catalog?.enabled && pack && provider && catalog.providers.includes(provider));
    const checkout = async () => {
        if (!enabled || !pack || !provider || checkoutBusy.current) return;
        checkoutBusy.current = true;
        setSubmitting(true);
        setError('');
        try {
            // Keep the same key even if the member temporarily selects another pack or method.
            const intent = `${pack.id}:${provider}`;
            const key = checkoutKeys.current.get(intent) ?? crypto.randomUUID();
            checkoutKeys.current.set(intent, key);
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const response = await fetch('/billing/ai-checkout', {
                method: 'POST', credentials: 'same-origin',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': token },
                body: JSON.stringify({ package_id: pack.id, client_request_key: key, provider }),
            });
            const result = await response.json() as CheckoutResponse;
            if (!response.ok) throw new Error(response.status === 419
                ? 'Your session expired. Reload the page before checkout.'
                : response.status === 403 ? 'Your current plan cannot purchase AI credits.'
                : response.status === 404 ? 'This package is no longer available. Reopen AI Usage to refresh the options.'
                : 'Checkout is unavailable. No purchase has been confirmed.');
            if (!result.checkout_url || !result.checkout_url.startsWith('https://')) {
                throw new Error('The payment link is unavailable. Check your order before trying again.');
            }
            // The backend validates the provider's HTTPS checkout domain before returning this URL.
            window.location.assign(result.checkout_url);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Checkout could not be started.');
            setSubmitting(false);
            checkoutBusy.current = false;
        }
    };

    return <section className="pm-pmp-panel pm-pmp-refill" aria-labelledby="pm-pmp-refill-title">
        <div className="pm-pmp-refill-heading"><span className="pm-pmp-icon-tile" aria-hidden="true"><ShoppingCart/></span>
            <h2 id="pm-pmp-refill-title">Refill AI credits</h2></div>
        <p className="pm-pmp-refill-description">Add more AI credits for eligible explanations, follow-up questions and study assistance.</p>
        {loading ? <p className="pm-pmp-muted" role="status">Loading available packs…</p> : <>
            <fieldset disabled={submitting}><legend>Choose a credit pack</legend>
                <div className="pm-pmp-refill-options">
                    {catalog?.packages.map(item => <label key={item.id} className={selected === item.id ? 'is-selected' : ''}>
                        <input type="radio" name={`${group}-pack`} value={item.id} checked={selected === item.id} onChange={() => { setSelected(item.id); setError(''); }}/>
                        <span><strong>{Number(item.credits).toLocaleString('en-BD')} credits</strong>
                            <span className="pm-pmp-refill-pack-title">{item.title}{item.expires_after_days ? ` · Valid ${item.expires_after_days} days` : ''}</span></span>
                        <b>{priceLabel(item.price_minor)}</b>
                    </label>)}
                    {!catalog?.packages.length && <p className="pm-pmp-muted">No refill packs are currently available.</p>}
                </div>
            </fieldset>
            <fieldset disabled={submitting}><legend>Choose a payment method</legend>
                <div className="pm-pmp-refill-options">{methods.map(method => {
                    const available = Boolean(catalog?.enabled && catalog.providers.includes(method.id));
                    return <label key={method.id} className={`${provider === method.id && available ? 'is-selected' : ''}${available ? '' : ' is-unavailable'}`}>
                        <input type="radio" name={`${group}-provider`} value={method.id} checked={provider === method.id && available} disabled={!available} onChange={() => {setProvider(method.id); setError('');}}/>
                        <strong>{method.label} · BDT</strong>{!available && <small>Unavailable</small>}
                    </label>;
                })}</div>
            </fieldset>
            <div className="pm-pmp-refill-total"><strong>Total</strong><b>{pack ? priceLabel(pack.price_minor) : '—'}</b></div>
            <button type="button" className="pm-pmp-primary" disabled={!enabled || submitting}
                onClick={() => void checkout()}>{submitting ? 'Opening checkout…' : 'Continue to payment'} <ArrowRight size={17}/></button>
            {!eligible ? <p className="pm-pmp-refill-unavailable" role="status">An active paid Plus or Pro subscription is required to purchase credits.</p>
                : !catalog?.enabled && <p className="pm-pmp-refill-unavailable" role="status">Payment is not currently available.</p>}
        </>}
        {error && <p className="pm-pmp-action-error" role="alert">{error}</p>}
        <p className="pm-pmp-refill-note"><Info size={14} aria-hidden="true"/> Purchased credits do not increase the monthly PMP token limit.</p>
    </section>;
}
