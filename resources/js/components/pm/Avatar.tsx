/** Demo portraits are extracted from the supplied UI reference. Real members get initials until upload. */
const swatches = ['#d7e4f6', '#d7e8e5', '#f2e1df', '#e6e1f2', '#f4e6cd'];
const portraitByName: Record<string, string> = {
    'Community Hero': 'community-hero',
    'Community Top': 'community-top',
    'Community Right': 'community-right',
    'Community Bottom': 'community-bottom',
    'Community Lower Right': 'community-lower-right',
    'Nadia Rahman': 'nadia', 'Arif Hasan': 'arif', 'Sarah Chen': 'sarah-chen',
    'Omar Farooq': 'omar', 'Priya Nair': 'priya', 'Marcus Lee': 'marcus',
    'Alex Rivera': 'alex', 'Fatima Khan': 'fatima', 'Sara Ahmed': 'sara',
    'Daniel Chen': 'daniel', 'Meera Das': 'meera',
};
export function Avatar({ name, size = 42 }: { name: string; size?: number }) {
    const index = Array.from(name).reduce((value, char) => value + char.charCodeAt(0), 0) % swatches.length;
    const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    const portrait = portraitByName[name];
    return <span aria-label={name} title={name} className="pm-avatar" style={{ width: size, height: size, background: swatches[index], fontSize: Math.max(11, size * 0.28) }}>
        {portrait ? <img src={`/images/demo/${portrait}.webp`} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : initials}
    </span>;
}
