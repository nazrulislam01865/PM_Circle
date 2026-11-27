import { PMDropdown } from '@/components/pm/PMDropdown';
import { BadgeMedal } from '@/components/achievements/AchievementCards';
import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { memberBadge, requirement, statusLabel, type Badge, type PublishStatus } from './types';
export function Dropdown({id, value, set, options, label}: {id: string; value: string; set: (v:string)=>void; options: {value:string;label:string;disabled?:boolean}[]; label:string}) {
    return <PMDropdown id={id} value={value} onValueChange={set} options={options} placeholder={label} aria-label={label} required/>;
}
export const options = (values: string[]) => values.map(value => ({ value, label:value }));
export function Status({status}: {status: PublishStatus}) { return <span className={`pm-badge-status is-${status}`}>• {statusLabel[status]}</span>; }
export function Medal({badge}: {badge:Badge}) {return <BadgeMedal badge={memberBadge(badge)}/>;}
export function BadgeCell({badge}: {badge:Badge}) { return <div className="pm-badge-cell"><Medal badge={badge}/><div><strong>{badge.name}</strong><p className="pm-badge-muted">{badge.category}</p></div></div>; }
/** Shared read-only card for the editor and activity preview. Never issues an award. */
export function BadgePreviewCard({badge, showDescription = false}: {badge:Badge;showDescription?:boolean}) {
    return <article className="pm-badge-live">
        <Medal badge={badge}/>
        <div className="pm-badge-preview-identity"><p className="pm-badge-muted">{badge.category}</p><h3>{badge.name}</h3>{showDescription && badge.description && <p className="pm-badge-muted">{badge.description}</p>}</div>
        <div className="pm-badge-preview-rule"><span className="pm-badge-muted">Earn by</span><strong>{requirement(badge)}</strong></div>
        <Status status={badge.publishStatus}/>
    </article>;
}
export function Panel({title, description, action, children}: {title:string;description?:string;action?:ReactNode;children:ReactNode}) {return <section className="pm-admin-panel pm-badge-panel"><div className="pm-course-admin-heading"><div><h2>{title}</h2>{description && <p className="pm-badge-muted">{description}</p>}</div>{action}</div>{children}</section>;}
export function Step({n,title,description}: {n:number;title:string;description:string}) {return <div><div className="pm-badge-step"><span>{n}</span><h2>{title}</h2></div><p className="pm-badge-muted">{description}</p></div>;}
export function Modal({title,children,close}: {title:string;children:ReactNode;close:()=>void}) {return <Dialog open onOpenChange={open=>{if(!open)close();}}><DialogContent className="pm-badge-dialog" showCloseButton={false} onPointerDownOutside={e=>e.preventDefault()} aria-describedby={undefined}><div className="pm-badge-between"><DialogTitle>{title}</DialogTitle><button type="button" className="pm-admin-button" onClick={close} aria-label="Close"><X size={16}/></button></div>{children}</DialogContent></Dialog>;}
