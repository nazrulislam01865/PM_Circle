import { BookOpen, BriefcaseBusiness, MessagesSquare } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';

/** Positions follow the supplied homepage orbit diagram. */
const faces = [
    ['Community Hero', 112], ['Community Top', 66], ['Community Right', 74],
    ['Community Bottom', 68], ['Community Lower Right', 62],
] as const;
export function CommunityOrbit() {
    return <div className="pm-people-graphic" aria-label="Project professionals learning, discussing and growing together">
        <div className="pm-people-orbit" />
        {faces.map(([name, size], i) => <div className={`pm-person p${i + 1}`} key={name}><Avatar name={name} size={size}/></div>)}
        <div className="pm-people-caption learn"><BookOpen/> <span>Learn<br/>&amp; practise</span></div>
        <div className="pm-people-caption discuss"><MessagesSquare/> <span>Discuss<br/>&amp; share</span></div>
        <div className="pm-people-caption career"><BriefcaseBusiness/> <span>Grow<br/>your career</span></div>
        <span className="pm-dot one"/><span className="pm-dot two"/><span className="pm-dot three"/>
    </div>;
}
