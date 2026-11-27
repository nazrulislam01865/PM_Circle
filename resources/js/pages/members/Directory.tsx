import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { LinkedPagination } from '@/components/pm/Pagination';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Check, Crown, Search, UsersRound, Zap, Plus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
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
    can_follow?: boolean;
};
type Filters = { role: string; industry: string; location: string; tab: 'all' | 'following'; sort: 'recent' | 'name' | 'followers' };
type Props = {
    members: { data: Member[]; total: number; links: { url: string | null; label: string; active: boolean }[]; next_page_url: string | null; prev_page_url: string | null };
    search: string;
    filters: Filters;
    filterOptions: { roles: string[]; industries: string[]; locations: PMDropdownOption[] };
};

/** Directory controls deliberately submit search on Enter, avoiding focus-loss while typing. */
export default function Directory({ members, search, filters, filterOptions }: Props) {
    const [term, setTerm] = useState(search);
    const [submittingMember, setSubmittingMember] = useState<number | null>(null);
    const [followStates, setFollowStates] = useState<Record<number, { following: boolean; followers: number }>>({});
    const [followError, setFollowError] = useState('');
    useEffect(() => { setFollowStates({}); setFollowError(''); }, [members.data]);
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
    const toggleFollowing = async (member: Member) => {
        if (!viewer) { router.visit('/login'); return; }
        if (submittingMember !== null || member.id === viewer.id) return;
        const current = followStates[member.id] ?? { following: member.is_following, followers: member.followers_count };
        if (!current.following && member.can_follow === false) return;
        setSubmittingMember(member.id);
        setFollowError('');
        try {
            const response = await fetch(`/members/${member.id}/follow`, {
                method: current.following ? 'DELETE' : 'POST', credentials: 'same-origin',
                headers: {
                    Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
            });
            if (response.redirected) throw new Error('Complete your member setup before following other members.');
            if (!response.ok) {
                throw new Error(response.status === 419 ? 'Session expired. Refresh and try again.'
                    : response.status === 429 ? 'Too many requests. Please try again shortly.'
                    : 'Could not update following. Please try again.');
            }
            const result = await response.json() as { following: boolean };
            setFollowStates(previous => ({ ...previous, [member.id]: {
                following: result.following,
                followers: Math.max(0, current.followers + (result.following === current.following ? 0 : result.following ? 1 : -1)),
            } }));
        } catch (reason) {
            setFollowError(reason instanceof Error ? reason.message : 'Could not update following.');
        } finally { setSubmittingMember(null); }
    };
    const isFiltered = Boolean(search || filters.role || filters.industry || filters.location || filters.tab === 'following');
    const displayed = filters.tab === 'following' ? members.data.filter(member => (followStates[member.id]?.following ?? member.is_following)) : members.data;
    const visibleTotal = filters.tab === 'following' ? Math.max(0, members.total - members.data.filter(member => member.is_following && followStates[member.id]?.following === false).length) : members.total;

    return <PublicLayout banner={{title: 'Members', description: 'Find and follow project professionals in PM Circle.'}}>
        <Head title="Members" />
        <div className="pm-container pm-members-page" id="members-directory">
            <LegacyPageHeading><header className="pm-members-intro">
                <h1>Members</h1>
                <p>Find and follow project professionals in PM Circle.</p>
            </header></LegacyPageHeading>

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
                <span>{visibleTotal.toLocaleString()} {visibleTotal === 1 ? 'member' : 'members'}</span>
                <div className="pm-members-sort"><span>Sort:</span>
                    <PMDropdown id="members-sort" aria-label="Sort members" placeholder="Recently joined" value={filters.sort}
                        onValueChange={(sort) => visit({ sort: sort as Filters['sort'] })}
                        options={[{ value: 'recent', label: 'Recently joined' }, { value: 'name', label: 'Name A–Z' }, { value: 'followers', label: 'Most followers' }]}/>
                </div>
            </div>

            {followError && <p className="pm-members-error" role="alert">{followError}</p>}
            {displayed.length ? <div className="pm-members-list">
                {displayed.map((member) => <article key={member.id} className="pm-members-row">
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
                    <div className="pm-members-counts"><span>{(followStates[member.id]?.followers ?? member.followers_count).toLocaleString()} followers</span><span aria-hidden="true">·</span><span>{member.contributions_count.toLocaleString()} contributions</span></div>
                    <div className="pm-members-actions">
                        {viewer?.id !== member.id ? <button type="button"
                            className={`pm-members-follow${(followStates[member.id]?.following ?? member.is_following) ? ' is-following' : ''}`}
                            disabled={submittingMember === member.id || (!(followStates[member.id]?.following ?? member.is_following) && member.can_follow === false)}
                            aria-pressed={followStates[member.id]?.following ?? member.is_following}
                            aria-label={`${(followStates[member.id]?.following ?? member.is_following) ? 'Unfollow' : 'Follow'} ${member.name}`}
                            onClick={() => { void toggleFollowing(member); }}>
                            {(followStates[member.id]?.following ?? member.is_following) ? <Check size={16} aria-hidden="true"/> : <Plus size={16} aria-hidden="true"/>}
                            {(followStates[member.id]?.following ?? member.is_following) ? 'Following' : member.can_follow === false ? 'Not accepting follows' : 'Follow'}
                        </button> : <span className="pm-members-follow-placeholder" aria-hidden="true" />}
                        <Link className="pm-members-profile-button" href={`/members/${member.id}`}>View profile</Link>
                    </div>
                </article>)}
            </div> : <section className="pm-members-empty" role="status">
                <strong>{filters.tab === 'following' ? 'No followed members yet' : 'No public members found'}</strong>
                <p>{filters.tab === 'following' ? 'Follow members to see them here.' : 'Try clearing the search or selecting different filters.'}</p>
                {isFiltered && <Link href="/members" className="pm-members-profile-button">View all members</Link>}
            </section>}

            <LinkedPagination links={members.links} label="Member pages"/>
            <p className="pm-members-privacy"><UsersRound size={16} aria-hidden="true"/>Only public profile details are shown.</p>
        </div>
    </PublicLayout>;
}
