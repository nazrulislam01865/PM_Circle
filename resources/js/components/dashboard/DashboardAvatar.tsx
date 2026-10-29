import { Avatar } from '@/components/pm/Avatar';

/** Reuse the shared avatar component, with the higher-resolution approved dashboard sample. */
export function DashboardAvatar({ name, size, demo = false }: { name: string; size: number; demo?: boolean }) {
    const portraits: Record<string, string> = { 'Sara Ahmed': 'sara', 'Priya Nair': 'priya', 'Daniel Chen': 'daniel' };
    if (!demo || !portraits[name]) return <Avatar name={name} size={size}/>;
    return <span className="pm-avatar" aria-label={name} style={{ width: size, height: size }}><img src={`/images/dashboard/${portraits[name]}.webp`} alt="" width={size} height={size} style={{width:'100%',height:'100%',objectFit:'cover'}}/></span>;
}
