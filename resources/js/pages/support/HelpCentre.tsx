import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, ChevronRight, Search, UserRound, BookOpen, ClipboardCheck, Sparkles, UsersRound, CreditCard } from 'lucide-react';
import { AccountPage } from '@/components/account/AccountPage';
import { FormField } from '@/components/pm/FormField';
import { helpGuides, searchHelpGuides } from '@/components/account/helpGuides';

const icons = [UserRound, BookOpen, ClipboardCheck, Sparkles, UsersRound, CreditCard];

function SupportPanel() {
    return <section className="pm-account-card pm-account-hero pm-account-row">
        <div><h2 className="pm-account-card-title">Still need help?</h2><p>Send us a message about your issue.</p></div>
        <div className="pm-account-actions">
            <Link className="pm-button" href="/help-center/contact">Contact support</Link>
            <Link className="pm-button pm-button-outline" href="/help-center/requests">My support requests</Link>
        </div>
    </section>;
}

export default function HelpCentre() {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<{topic: string; article: string} | null>(null);
    const topic = helpGuides.find(g => g.id === selected?.topic);
    const article = topic?.articles.find(a => a.id === selected?.article);
    const matches = searchHelpGuides(query);
    const count = matches.reduce((total, g) => total + g.articles.length, 0);
    const choose = (topic: string, article: string) => {
        setSelected({topic, article});
        window.scrollTo({top: 0});
    };
    return <AccountPage title={article?.title ?? 'Help Centre'} description={article ? topic?.name : 'Find answers and step-by-step guides for your PM Circle account.'}>
        {article && topic ? <>
            <button type="button" className="pm-account-link pm-account-back" onClick={() => { setSelected(null); window.scrollTo({top: 0}); }}><ArrowLeft aria-hidden="true"/> Help Centre</button>
            <article className="pm-account-card">
                <div className="pm-account-quick-answer"><h2 className="pm-account-card-title">Quick answer</h2><p>{article.quickAnswer}</p></div>
                <h2>Step by step</h2>
                <ol className="pm-account-steps" role="list">{article.steps.map((step, i) => <li key={i}><span className="pm-account-step-number" aria-hidden="true">{i + 1}</span><span>{step}</span></li>)}</ol>
            </article>
            <section className="pm-account-card">
                <h2 className="pm-account-card-title">Related guides</h2>
                <ul className="pm-account-guide-list">{topic.articles.filter(a => a.id !== article.id).map(a => <li key={a.id}><button type="button" className="pm-account-link pm-account-guide" onClick={() => choose(topic.id, a.id)}>{a.title}<ChevronRight aria-hidden="true"/></button></li>)}</ul>
            </section>
        </> : <>
            <div className="pm-account-search">
                <FormField label="Search for help" htmlFor="help-search">
                    <div className="pm-account-search-row">
                        <div className="pm-account-search-control"><Search className="pm-account-search-icon" aria-hidden="true"/><input id="help-search" className="pm-input" type="search" placeholder="Search for help" value={query} onChange={e => setQuery(e.target.value)}/></div>
                        {query && <button type="button" className="pm-button pm-button-outline" onClick={() => setQuery('')}>Clear search</button>}
                    </div>
                </FormField>
            </div>
            <div className="pm-account-row"><h2>{query.trim() ? 'Search results' : 'Browse by topic'}</h2><p className="pm-account-meta" role="status" aria-live="polite">{query.trim() ? `${count} ${count === 1 ? 'guide' : 'guides'} found` : `${count} guides`}</p></div>
            <div className="pm-account-grid">{matches.map(g => {
                const Icon = icons[helpGuides.findIndex(t => t.id === g.id)];
                return <section key={g.id} className="pm-account-card pm-account-topic">
                    <Icon className="pm-account-icon" aria-hidden="true"/><h3>{g.name}</h3>
                    <ul className="pm-account-guide-list">{g.articles.map(a => <li key={a.id}><button type="button" className="pm-account-link pm-account-guide" onClick={() => choose(g.id, a.id)}>{a.title}<ChevronRight aria-hidden="true"/></button></li>)}</ul>
                </section>;
            })}</div>
            {!matches.length && <section className="pm-account-card"><h3>No guides found</h3><p>Try another search or contact support.</p><button type="button" className="pm-button pm-button-outline" onClick={() => setQuery('')}>Clear search</button></section>}
        </>}
        <SupportPanel/>
    </AccountPage>;
}
