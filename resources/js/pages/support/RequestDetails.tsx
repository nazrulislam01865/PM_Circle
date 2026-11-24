import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { AccountPage } from '@/components/account/AccountPage';
import { TicketThread, type TicketDetail, type Reply, type Paginated } from '@/components/account/SupportTicket';
export default function RequestDetails({ticket,replies}:{ticket:TicketDetail;replies:Paginated<Reply>}){return <AccountPage title="Support request"><Link href="/help-center/requests" className="pm-account-back"><ArrowLeft aria-hidden="true"/> My support requests</Link><TicketThread ticket={ticket} replies={replies} base="/help-center/requests"/></AccountPage>;}
