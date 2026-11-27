import { useEffect, useState } from 'react';

type Order = { uuid: string; product_type: string; amount_minor: number; currency: string; provider: string; status: string; created_at: string };
type Result = { data: Order[]; page: number; hasMore: boolean };

export function PaymentHistory() {
    const [page, setPage] = useState(1);
    const [result, setResult] = useState<Result | null>(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError(false);
        fetch(`/settings/account/payments?page=${page}`, {signal: controller.signal, credentials: 'same-origin', cache: 'no-store', headers: {Accept: 'application/json'}})
            .then(response => { if (!response.ok) throw new Error('Payment history unavailable'); return response.json() as Promise<Result>; })
            .then(data => { if (!controller.signal.aborted) setResult(data); })
            .catch(() => { if (!controller.signal.aborted) setError(true); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [page, retry]);
    if (loading) return <p role="status">Loading payment history…</p>;
    if (error) return <div role="alert"><p>Payment history could not be loaded.</p><button type="button" className="pm-btn pm-btn-secondary" onClick={() => setRetry(value => value + 1)}>Retry</button></div>;
    if (!result) return null;
    const date = (value: string) => {
        const iso = value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
        const parsed = new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
        return Number.isFinite(parsed.valueOf()) ? new Intl.DateTimeFormat('en-GB', {dateStyle: 'medium', timeZone: 'Asia/Dhaka'}).format(parsed) : value;
    };
    const status = (value: string) => value.replaceAll('_', ' ');
    return <>
        {result.data.length ? <div className="pm-account-table-wrap" role="region" aria-label="Payment history" tabIndex={0}><table><thead><tr><th scope="col">Date / order</th><th scope="col">Product</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead><tbody>{result.data.map(order => <tr key={order.uuid}><td>{date(order.created_at)}<br/><small>{order.uuid}</small></td><td>{order.product_type === 'membership' ? 'Membership' : 'AI credits'}<br/><small>{order.provider}</small></td><td>{(Number(order.amount_minor) / 100).toLocaleString('en-BD', {minimumFractionDigits: 2, maximumFractionDigits: 2})} {order.currency}</td><td>{status(order.status)}</td></tr>)}</tbody></table></div> : <p>No payment orders on this page.</p>}
        <div className="pm-settings-dialog-actions"><button type="button" className="pm-btn pm-btn-secondary pm-btn-sm" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {result.page}</span><button type="button" className="pm-btn pm-btn-secondary pm-btn-sm" disabled={!result.hasMore} onClick={() => setPage(value => value + 1)}>Next</button></div>
    </>;
}
