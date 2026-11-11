import { BookOpen, BriefcaseBusiness, MessagesSquare } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';
import type { HomeContent, HomePerson } from '@/types/home';

/** Five-position orbit matches the homepage reference; portraits arrive from stored content. */
export function CommunityOrbit({ people, content }: { people: HomePerson[]; content?: HomeContent['hero'] }) {
    return <div className="pm-people-graphic" aria-label="Project professionals learning, discussing and growing together">
        <div className="pm-people-orbit" />
        {people.slice(0, 5).map((person, i) => <div className={`pm-person p${i + 1}`} key={person.name}>
            <Avatar name={person.name} src={person.avatar_path} size={[112, 66, 74, 68, 62][i]}/>
        </div>)}
        <div className="pm-people-caption learn"><BookOpen/> <span>{content?.caption_learn ?? 'Learn\n& practise'}</span></div>
        <div className="pm-people-caption discuss"><MessagesSquare/> <span>{content?.caption_discuss ?? 'Discuss\n& share'}</span></div>
        <div className="pm-people-caption career"><BriefcaseBusiness/> <span>{content?.caption_career ?? 'Grow\nyour career'}</span></div>
        <span className="pm-dot one"/><span className="pm-dot two"/><span className="pm-dot three"/>
    </div>;
}
