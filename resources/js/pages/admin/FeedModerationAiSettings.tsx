import { Head, Link, useForm } from '@inertiajs/react';
import { FileText, ShieldCheck, Clock3, Info } from 'lucide-react';
import { useRef, useState } from 'react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { useDiagnosticTest } from '@/components/admin/ai/useDiagnosticTest';
import { AdminChoice } from '@/components/admin/AdminChoice';
import { Actions, CheckField, ConnectionPanel, FixedChoice, Notices, Panel, Preview, PreviewRow, type Connection } from '@/components/admin/ai/SettingsShared';

type Props = {settings:{hold_clean_content:boolean}; enabled:boolean; provider:string; connection:Connection};
export default function FeedModerationAiSettings({settings,enabled,provider,connection}:Props) {
    const form=useForm({hold_clean_content:settings.hold_clean_content});
    const dialog=useRef<HTMLDialogElement>(null);
    const { busy: testing, retrySeconds, begin, finish, rateLimited } = useDiagnosticTest();
    const [testError,setTestError]=useState('');
    const [result,setResult]=useState<{decision:string;category:string;action:string}|null>(null);
    async function testModeration() {
        if(provider!=='omni'){dialog.current?.showModal();return;}
        if (!begin()) return;
        setTestError('');
        try {
            const response=await fetch('/admin/ai/feed-moderation/test',{method:'POST',credentials:'same-origin',headers:{Accept:'application/json','X-CSRF-TOKEN':document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content??'','X-Requested-With':'XMLHttpRequest'}});
            if(rateLimited(response)) return;
            if(!response.ok){const error=await response.json().catch(()=>null);throw new Error(error?.message??'Unable to test moderation.');}
            setResult(await response.json());
        }catch(e){setTestError(e instanceof Error?e.message:'Unable to test moderation.');}finally{finish();}
    }
    return <AdminLayout title="Feed Moderation AI settings" subtitle="Configure AI-powered moderation for community posts, comments and media." active="/admin/ai/feed-moderation" headingAction={<Actions form="feed-ai-settings" processing={form.processing}><button type="button" className="pm-admin-button pm-admin-button-quiet" onClick={testModeration} disabled={testing || retrySeconds > 0 || (provider==='omni' && !enabled)}>{testing?'Testing…':retrySeconds > 0 ? `Retry in ${retrySeconds}s` : 'Test moderation'}</button></Actions>}>
        <Head title="Feed Moderation AI settings | PM Circle"/>
        <form id="feed-ai-settings" className="pm-career-settings pm-feature-settings" onSubmit={e=>{e.preventDefault();form.put('/admin/ai/feed-moderation',{preserveScroll:true});}}>
            <Notices saved={form.recentlySuccessful} errors={form.errors}/>
            {!enabled&&<p role="status" className="pm-admin-notice">The AI checker is disabled in server configuration. Saved review settings apply when the checker is enabled.</p>}
            <div className="pm-career-settings-grid"><div className="pm-career-settings-column">
                <Panel title="Moderation scope"><CheckField checked={true}>Posts</CheckField><CheckField checked={true}>Comments and replies</CheckField><CheckField checked={true}>Media (images, screenshots)</CheckField><CheckField checked={true}>Links (within submitted content)</CheckField></Panel>
                <Panel title="Moderation rules">
                    <FixedChoice id="feed-level" label="Moderation level" value={provider==='omni'?'OpenAI Omni safety policy':'Context-aware safety policy'}/>
                    <FixedChoice id="feed-violations" label="Action for violations" value="Restrict confirmed violations"/>
                    <FixedChoice id="feed-sensitivity" label="Sensitivity" value="Existing provider policy"/>
                    <CheckField checked={true}>Detect inappropriate or harmful content</CheckField>
                    <CheckField checked={provider==='responses'}>Detect spam and fraudulent promotions</CheckField>
                    <CheckField checked={false}>Detect off-topic or low-quality posts</CheckField>
                    <CheckField checked={true}>Detect policy violations (hate, abuse, harassment)</CheckField>
                    <p className="pm-admin-hint">Mandatory safety checks cannot be disabled here. Omni does not independently classify commercial spam or off-topic content.</p>
                </Panel>
            </div><div className="pm-career-settings-column">
                <ConnectionPanel feature="feed-moderation" connection={connection} detail="Dedicated moderation key" dialogRef={dialog}/>
                <Panel title="Review & actions">
                    <AdminChoice id="feed-action" label="Auto action" value={form.data.hold_clean_content?'hold':'publish'} options={[{value:'hold',label:'Hold clean posts for review'},{value:'publish',label:'Publish clean posts automatically'}]} onChange={v=>form.setData('hold_clean_content',v==='hold')} error={form.errors.hold_clean_content}/>
                    <FixedChoice id="feed-uncertain" label="Flagged content" value="Hold uncertain posts for review"/>
                    <p className="pm-admin-hint">Comments and replies are checked automatically: clean content is published, violations and uncertain results stay hidden. Uncertain results do not count as strikes.</p>
                    <FixedChoice id="feed-retention" label="Retention" value="Existing records retained"/>
                    <Link href="/admin/post-reports" className="pm-admin-hint">Open community moderation queue</Link>
                </Panel>
                <Panel title="Moderation preview"><Preview><PreviewRow icon={<ShieldCheck/>} label="Sample content result" value={result?.decision??'Clean content (example)'}/><PreviewRow icon={<FileText/>} label="Detected issues" value={result?.category??'None (example)'}/><PreviewRow icon={<Clock3/>} label="Action" value={result?.decision==='Restricted'?'Restrict':result?.decision==='Needs review'||form.data.hold_clean_content?'Hold for review':'Publish automatically'}/></Preview><p className="pm-feature-info"><Info size={15}/> {provider==='omni'?(result?'Synthetic moderation test completed. No community records were created.':'Test moderation sends a safe synthetic sample; the preview otherwise shows an example.'):'Responses mode: Test moderation opens a model-access check, not a live moderation request.'}</p>{testError&&<p role="alert" className="pm-admin-error">{testError}</p>}{retrySeconds > 0 && <p role="status" className="pm-admin-hint">Moderation test limit reached. Retry in {retrySeconds}s.</p>}</Panel>
            </div></div>
        </form>
    </AdminLayout>;
}
