import { Head, Link, router, usePage } from '@inertiajs/react';
import { Check, Crown, Search, UsersRound, Zap, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Avatar } from '@/components/pm/Avatar';
import { PMDropdown, type PMDropdownOption } from '@/components/pm/PMDropdown';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

type Member = {
    id: number;
    name: string;
    profile: { role: string | null; headline: string | null; industry: string | null; city: string | null; country: string | null; avatar_path: string | null };
    plan: 'free' | 'plus' | 'pro';
    followers_count: number;
    contributions_count: number;
    is_following: boolean;
};
type Filters = { role: string; industry: string; location: string; tab: 'all' | 'following'; sort: 'recent' | 'name' | 'followers' };
type Props = {
    members: { data: Member[]; total: number; next_page_url: string | null; prev_page_url: string | null };
    search: string;
    filters: Filters;
    filterOptions: { roles: string[]; industries: string[]; locations: PMDropdownOption[] };
};

/** Directory controls deliberately submit search on Enter, avoiding focus-loss while typing. */
export default function Directory({ members, search, filters, filterOptions }: Props) {
    const [term, setTerm] = useState(search);
    const [submittingMember, setSubmittingMember] = useState<number | null>(null);
    const viewer = usePage<{ auth?: { user?: { id: number } | null } }>().props.auth?.user;

    const visit = (next: Partial<Filters> & { search?: string }) => {
        const params = { search: term.trim(), ...filters, ...next };
        const sanitized = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== ''));
        router.get('/members', sanitized, { preserveScroll: true, preserveState: true, replace: true });
    };
    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        visit({ search: term.trim() });
    };
    const toggleFollowing = (member: Member) => {
        if (!viewer) { router.visit('/login'); return; }
        if (submittingMember !== null || member.id === viewer.id) return;
        setSubmittingMember(member.id);
        const path = `/members/${member.id}/follow`;
        const options = { preserveScroll: true, onFinish: () => setSubmittingMember(null) };
        if (member.is_following) router.delete(path, options);
        else router.post(path, {}, options);
    };
    const isFiltered = Boolean(search || filters.role || filters.industry || filters.location || filters.tab === 'following');

    return <PublicLayout>
        <Head title="Members" />
        <div className="pm-container pm-members-page" id="members-directory">
            <header className="pm-members-intro">
                <h1>Members</h1>
                <p>Find and follow project professionals in PM Circle.</p>
            </header>

            <div className="pm-members-toolbar">
                <form role="search" className="pm-members-search" onSubmit={submitSearch}>
                    <Search size={18} aria-hidden="true" />
                    <input type="search" aria-label="Search members by name or role" value={term}
                        onChange={(event) => setTerm(event.target.value)} maxLength={80}
                        placeholder="Search by name or role" />
                </form>
                <div className="pm-members-filters" role="group" aria-label="Member filters">
                    <PMDropdown id="members-role" aria-label="Filter by role" placeholder="Role" value={filters.role}
                        onValueChange={(role) => visit({ role })} options={filterOptions.roles.map((role) => ({ value: role, label: role }))} />
                    <PMDropdown id="members-industry" aria-label="Filter by industry" placeholder="Industry" value={filters.industry}
                        onValueChange={(industry) => visit({ industry })} options={filterOptions.industries.map((industry) => ({ value: industry, label: industry }))} />
                    <PMDropdown id="members-location" aria-label="Filter by location" placeholder="Location" value={filters.location}
                        onValueChange={(location) => visit({ location })} options={filterOptions.locations} />
                </div>
            </div>

            <nav className="pm-members-tabs" aria-label="Member lists">
                <Link href="/members" preserveState preserveScroll className={filters.tab === 'all' ? 'is-active' : ''}
                    aria-current={filters.tab === 'all' ? 'page' : undefined}
                    onClick={(event) => { event.preventDefault(); visit({ tab: 'all' }); }}>All members</Link>
                <Link href={viewer ? '/members?tab=following' : '/login'} preserveState preserveScroll
                    className={filters.tab === 'following' ? 'is-active' : ''}
                    aria-current={filters.tab === 'following' ? 'page' : undefined}
                    onClick={viewer ? (event) => { event.preventDefault(); visit({ tab: 'following' }); } : undefined}>Following</Link>
            </nav>

            <div className="pm-members-subheading">
                <span>{members.total.toLocaleString()} {members.total === 1 ? 'member' : 'members'}</span>
                <div className="pm-members-sort"><span>Sort:</span>
                    <PMDropdown id="members-sort" aria-label="Sort members" placeholder="Recently joined" value={filters.sort}
                        onValueChange={(sort) => visit({ sort: sort as Filters['sort'] })}
                        options={[{ value: 'recent', label: 'Recently joined' }, { value: 'name', label: 'Name A–Z' }, { value: 'followers', label: 'Most followers' }]}/>
                </div>
            </div>

            {members.data.length ? <div className="pm-members-list">
                {members.data.map((member) => <article key={member.id} className="pm-members-row">
                    <div className="pm-members-person">
                        <Avatar name={member.name} src={member.profile.avatar_path} size={56} />
                        <div className="pm-members-person-info">
                            <div className="pm-members-name-line"><Link href={`/members/${member.id}`} className="pm-members-name">{member.name}</Link>
                                {member.plan !== 'free' && <span className={`pm-members-plan pm-members-plan-${member.plan}`}>
                                    {member.plan === 'pro' ? <Crown size={13} aria-hidden="true"/> : <Zap size={13} aria-hidden="true"/>}
                                    {member.plan === 'pro' ? 'Pro' : 'Plus'}
                                </span>}
                            </div>
                            <p className="pm-members-role">{member.profile.role || 'Community member'}</p>
                            <p className="pm-members-meta">{[member.profile.industry, [member.profile.city, member.profile.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || member.profile.headline || 'PM Circle member'}</p>
                        </div>
                    </div>
                    <div className="pm-members-counts"><span>{member.followers_count.toLocaleString()} followers</span><span aria-hidden="true">·</span><span>{member.contributions_count.toLocaleString()} contributions</span></div>
                    <div className="pm-members-actions">
                        {viewer?.id !== member.id && <button type="button" className="pm-members-follow" disabled={submittingMember === member.id}
                            aria-label={`${member.is_following ? 'Unfollow' : 'Follow'} ${member.name}`} onClick={() => toggleFollowing(member)}>
                            {member.is_following ? <Check size={16} aria-hidden="true"/> : <Plus size={16} aria-hidden="true"/>}
                            {member.is_following ? 'Following' : 'Follow'}
                        </button>}
                        <Link className="pm-members-profile-button" href={`/members/${member.id}`}>View profile</Link>
                    </div>
                </article>)}
            </div> : <section className="pm-members-empty" role="status">
                <strong>{filters.tab === 'following' ? 'No followed members yet' : 'No public members found'}</strong>
                <p>{filters.tab === 'following' ? 'Follow members to see them here.' : 'Try clearing the search or selecting different filters.'}</p>
                {isFiltered && <Link href="/members" className="pm-members-profile-button">View all members</Link>}
            </section>}

            {(members.prev_page_url || members.next_page_url) && <nav className="pm-members-pagination" aria-label="Member pages">
                {members.prev_page_url && <Link href={members.prev_page_url} preserveScroll>Previous</Link>}
                {members.next_page_url && <Link href={members.next_page_url} preserveScroll>Next</Link>}
            </nav>}
            <p className="pm-members-privacy"><UsersRound size={16} aria-hidden="true"/>Only public profile details are shown.</p>
        </div>
    </PublicLayout>;
}
