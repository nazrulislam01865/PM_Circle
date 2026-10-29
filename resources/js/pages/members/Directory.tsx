import { Link, router } from '@inertiajs/react';
import { Search, UsersRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Avatar } from '@/components/pm/Avatar';
import { ContentPage, FeatureEmpty } from '@/components/pm/ContentPage';

type Member = { id: number; name: string; profile?: { role?: string; headline?: string } | null };
type Props = { members: { data: Member[]; next_page_url: string | null; prev_page_url: string | null }; search: string };
export default function Directory({ members, search }: Props) {
    const [term, setTerm] = useState(search);
    const submit = (event: FormEvent) => { event.preventDefault(); router.get('/members', term.trim() ? { search: term.trim() } : {}); };
    return <ContentPage title="Meet the members" subtitle="Get to know project managers and professionals in the PM Circle community.">
        <form className="pm-feature-search" role="search" onSubmit={submit}><Search size={19}/><input aria-label="Search members" value={term} onChange={event => setTerm(event.target.value)} placeholder="Search members or professional roles" maxLength={80}/><button className="pm-button pm-button-sm" type="submit">Search</button></form>
        {members.data.length ? <div className="pm-member-directory-grid">{members.data.map(member => <Link className="pm-panel pm-member-directory-item" href={`/members/${member.id}`} key={member.id}>
            <Avatar name={member.name} size={52}/><div><strong>{member.name}</strong><p>{member.profile?.role || 'Community member'}</p><small>{member.profile?.headline || 'View professional profile'}</small></div><span aria-hidden="true">›</span>
        </Link>)}</div> : <FeatureEmpty title="No public members found" description="Try another name or professional role. Only members with public profiles appear here." href="/members" linkLabel="See all members"/>}
        <nav className="pm-pager" aria-label="Member pages">{members.prev_page_url && <Link href={members.prev_page_url}>Previous</Link>}{members.next_page_url && <Link href={members.next_page_url}>Load more members</Link>}</nav>
        <p className="pm-feature-privacy"><UsersRound size={17}/> Only public profile details are shown. Private resumes and contact information are never displayed.</p>
    </ContentPage>;
}
