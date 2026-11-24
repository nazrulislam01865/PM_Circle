import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { AccountPage } from '@/components/account/AccountPage';
import { TicketList, type Ticket, type Paginated } from '@/components/account/SupportTicket';
export default function Requests({tickets}:{tickets:Paginated<Ticket>}){return <AccountPage title="My support requests" description="View the status and replies to your requests."><div className="pm-account-row pm-account-toolbar"><Link className="pm-account-back" href="/help-center/guides"><ArrowLeft aria-hidden="true"/> Help Centre</Link><Link className="pm-button" href="/help-center/contact">New request</Link></div><TicketList tickets={tickets} base="/help-center/requests"/></AccountPage>;}
