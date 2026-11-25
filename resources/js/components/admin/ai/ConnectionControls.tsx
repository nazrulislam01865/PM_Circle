import { Link } from '@inertiajs/react';
import { Bot, ExternalLink } from 'lucide-react';
import { AdminChoice } from '@/components/admin/AdminChoice';
import type { ReactNode } from 'react';

export type ConnectionDisplay = {
    code?: string | null; credential_health_code?: string | null; credential_checked_at?: string | null; label?: string; credential_name?: string | null; routing_target?: string; model: string | null; connected: boolean; checked_at: string | null;
    message: string; pending?: boolean; verification?: 'generation' | 'moderation' | 'model' | 'responses';
};
export function ConnectionStatus({ connection }: { connection: ConnectionDisplay }) {
    const text = connection.pending ? 'Testing…' : connection.connected
        ? (connection.verification === 'model' ? 'Model access verified' : 'Connected') : connection.code === 'NOT_TESTED' ? 'Not tested' : connection.code === 'FEATURE_DISABLED' ? 'Disabled' : 'Disconnected';
    return <span className={`pm-career-settings-status ${connection.pending || connection.code === 'NOT_TESTED' ? '' : connection.connected ? 'is-configured' : 'is-disconnected'}`}><i aria-hidden="true"/>{text}</span>;
}
function CredentialHealth({ connection }: { connection: ConnectionDisplay }) {
    if (!connection.credential_name) return null;
    const code = connection.credential_health_code;
    return <small className="pm-admin-hint">Workspace credential: {connection.credential_name} · {code === 'OPERATION_VERIFIED' ? 'Operation verified' : code === 'RUNTIME_RECOVERED' ? 'Runtime recovered' : code ? code.replaceAll('_', ' ').toLowerCase() : 'Not tested'}{connection.credential_checked_at ? ` · ${new Date(connection.credential_checked_at).toLocaleString()}` : ''}</small>;
}
export function IntegrationCard({ connection, provider, onManage, detail, unsaved }: { connection: ConnectionDisplay; provider: string; onManage: () => void; detail?: string; unsaved?: boolean }) {
    return <div className="pm-career-settings-integration">
        <div className="pm-career-settings-provider-icon">{provider === 'openai' ? <img src="/images/admin/career-trends-openai.webp" alt="" width={44} height={44}/> : <Bot aria-hidden="true" size={32}/>}</div>
        <div className="pm-career-settings-provider"><strong>{connection.label ?? 'OpenAI'}</strong><ConnectionStatus connection={connection}/>
            <small className="pm-admin-hint">{connection.model ?? 'No model configured'}</small>
            <CredentialHealth connection={connection}/>{connection.checked_at && <small className="pm-admin-hint">Checked {new Date(connection.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>}
            {!connection.connected && <small className={connection.pending ? 'pm-admin-hint' : 'pm-admin-error'}>{connection.message}</small>}
            {detail && <small className="pm-admin-hint">{detail}</small>}{unsaved && <small className="pm-admin-hint">Unsaved provider selection</small>}
        </div>
        <button type="button" className="pm-career-settings-connection" onClick={onManage}>Manage connection <ExternalLink size={18} aria-hidden="true"/></button>
    </div>;
}
export function ConnectionDialogContent({ id, provider, options, onChange, connection, portalContainer, testing, retrySeconds, error, onTest, onClose, hint, fixed = false, children, routingBusy = false }: {
    id: string; provider: string; options: {value: string; label: string}[]; onChange: (value: string) => void;
    connection: ConnectionDisplay; portalContainer: HTMLElement | null; testing: boolean; retrySeconds: number; error: string;
    onTest: () => void; onClose: () => void; hint: ReactNode; fixed?: boolean; children?: ReactNode; routingBusy?: boolean;
}) {
    return <>
        {fixed ? <div className="pm-admin-field"><label>AI provider</label><strong>{connection.label ?? provider}</strong></div> : <AdminChoice id={id} label="AI provider" portalContainer={portalContainer} disabled={testing || routingBusy} value={provider} options={options} onChange={onChange}/>}
        {children}
        <p><strong>{connection.label ?? 'OpenAI'}</strong> · {connection.model ?? 'No model configured'}</p>
        <div className="pm-admin-hint">Credential: {connection.credential_name ?? 'Not configured'} · <Link href={`/admin/ai/workspace/keys?${connection.routing_target ? `slot=${encodeURIComponent(connection.routing_target)}` : `provider=${provider}`}`}>Manage API keys</Link> · <Link href="/admin/ai/workspace/features">Configure feature routing</Link></div>
        <CredentialHealth connection={connection}/>
        <ConnectionStatus connection={connection}/>
        <p role="status">{connection.message}</p>{connection.checked_at && <p className="pm-admin-hint">Last checked: {new Date(connection.checked_at).toLocaleString()}</p>}
        {error && <p className="pm-admin-error" role="alert">{error}</p>}{retrySeconds > 0 && <p className="pm-admin-hint" role="status">Connection test limit reached. Retry in {retrySeconds}s.</p>}
        <p className="pm-admin-hint">{hint}</p>
        <div className="pm-career-settings-dialog-actions"><button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={testing || retrySeconds > 0 || routingBusy} onClick={onTest}>{testing ? 'Testing…' : retrySeconds > 0 ? `Retry in ${retrySeconds}s` : 'Test connection'}</button><button type="button" className="pm-admin-button pm-admin-button-primary" onClick={onClose}>{fixed ? 'Close' : 'Use selection'}</button></div>
    </>;
}
