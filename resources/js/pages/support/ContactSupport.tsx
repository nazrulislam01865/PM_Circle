import { requestKey as newRequestKey } from '@/lib/request-key';
import { Link, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { AccountPage } from '@/components/account/AccountPage';
import { FormField } from '@/components/pm/FormField';
import { PMDropdown } from '@/components/pm/PMDropdown';
import { ProgressBar } from '@/components/pm/ProgressBar';
import { ArrowLeft } from 'lucide-react';
export default function ContactSupport({topics}:{topics:string[]}) {
    const [submissionKey] = useState(() => newRequestKey());
    const form=useForm({topic:topics[0]??'',subject:'',details:'',screenshot:null as File|null,submission_key:submissionKey});
    const sending=useRef(false);
    return <AccountPage title="Contact support" description="Tell us what happened so we can help."><Link className="pm-account-back" href="/help-center/guides"><ArrowLeft aria-hidden="true"/> Help Centre</Link><form className="pm-account-card pm-account-stack" onSubmit={e=>{e.preventDefault();if(sending.current)return;sending.current=true;form.post('/help-center/requests',{forceFormData:true,onFinish:()=>{sending.current=false;}});}}>
        <FormField label="Topic" htmlFor="topic" error={form.errors.topic}><PMDropdown id="topic" invalid={Boolean(form.errors.topic)} aria-describedby={form.errors.topic ? "topic-error" : undefined} value={form.data.topic} onValueChange={v=>form.setData('topic',v)} options={topics.map(t=>({value:t,label:t}))} placeholder="Select a topic" required/></FormField>
        <FormField label="Subject" htmlFor="subject" error={form.errors.subject}><input id="subject" aria-invalid={Boolean(form.errors.subject)} aria-describedby={form.errors.subject ? "subject-error" : undefined} required maxLength={100} value={form.data.subject} onChange={e=>form.setData('subject',e.target.value)}/></FormField>
        <FormField label="Describe the issue" htmlFor="details" error={form.errors.details}><textarea id="details" aria-invalid={Boolean(form.errors.details)} aria-describedby={form.errors.details ? "details-error" : undefined} className="pm-textarea" rows={5} required maxLength={5000} value={form.data.details} onChange={e=>form.setData('details',e.target.value)}/></FormField>
        <FormField label="Screenshot (optional)" htmlFor="screenshot" error={form.errors.screenshot} hint="JPG, PNG or WebP, up to 5 MB. Remove passwords, payment details and other sensitive information before uploading."><input id="screenshot" aria-invalid={Boolean(form.errors.screenshot)} aria-describedby={form.errors.screenshot ? "screenshot-hint screenshot-error" : "screenshot-hint"} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>form.setData('screenshot',e.target.files?.[0]??null)}/></FormField>
        {form.errors.submission_key&&<p className="pm-error" role="alert">{form.errors.submission_key}</p>}{form.progress&&<ProgressBar label="Upload progress" value={form.progress.percentage??0}/>}
        <div><button type="submit" className="pm-button" disabled={form.processing}>{form.processing?'Submitting…':'Submit request'}</button></div>
    </form></AccountPage>;
}
