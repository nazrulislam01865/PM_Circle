import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ActionButton({ children, forward = false, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; forward?: boolean }) {
    return <button className={cn('pm-button', className)} {...props}>{children}{forward && <ArrowRight size={19} strokeWidth={2} />}</button>;
}
