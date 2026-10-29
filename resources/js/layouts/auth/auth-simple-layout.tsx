import type { AuthLayoutProps } from '@/types';
import { Brand } from '@/components/pm/Brand';
export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return <div className="pm-app pm-auth-shell"><header className="pm-auth-header"><Brand/></header><main className="pm-auth-main"><section className="pm-auth-card"><div className="pm-auth-intro"><h1>{title}</h1><p>{description}</p></div>{children}</section><p className="pm-auth-bottom">Learn together. Practise daily. Grow your career.</p></main></div>;
}
