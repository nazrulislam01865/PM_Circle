import { Link } from '@inertiajs/react';
import { ArrowRight, Check, Clock3, Copy, Gift } from 'lucide-react';
import { useState } from 'react';
import type { ProfileRewardData, RewardPromotionData } from '@/types/reward';

/** Identical reward states on both profile and member-dashboard sidebars. */
export function ProfileCompletionReward({ reward, variant = 'dashboard' }: { reward: ProfileRewardData | null; variant?: 'dashboard' | 'profile' }) {
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState('');
    if (!reward) return null;

    const ready = reward.status === 'ready' && Boolean(reward.code);
    const title = ready ? 'Your profile reward is ready' : reward.status === 'expired' ? 'Your profile reward has expired' : reward.status === 'redeemed' ? 'Your profile reward was used' : 'Profile reward';

    async function copyCode() {
        if (!ready || !reward?.code) return;
        try {
            await navigator.clipboard.writeText(reward.code);
            setCopied(true);
            setCopyError('');
        } catch {
            setCopied(false);
            setCopyError('Unable to copy automatically. Select and copy your code.');
        }
    }

    return <section className={`pm-profile-reward-card pm-profile-reward-${variant}`} aria-label="Profile completion reward">
        <div className="pm-profile-reward-content">
            <span className="pm-profile-reward-icon" aria-hidden="true"><Gift size={20} strokeWidth={1.7} /></span>
            <div className="pm-profile-reward-main">
                {variant === 'profile' ? <div className="pm-profile-reward-heading">
                    <h2>{title}</h2>
                    {reward.status === 'pending' && <span className="pm-profile-reward-locked">Locked</span>}
                </div> : <h2>{title}</h2>}
                <p>{ready ? `Use your code for ${reward.discountLabel} your next eligible purchase.`
                    : reward.status === 'pending' ? (variant === 'profile' ? `Get ${reward.discountLabel} an eligible Exam Simulator when your profile reaches 100%.` : `Complete your profile to get ${reward.discountLabel} your next eligible purchase.`)
                    : reward.status === 'redeemed' ? 'Your one-time reward has already been redeemed.'
                    : 'Your one-time reward is no longer valid.'}</p>
                {variant === 'profile' && reward.status === 'pending' && <p className="pm-profile-reward-availability">Available at 100%</p>}
                {variant === 'dashboard' && reward.status === 'pending' && <Link className="pm-profile-reward-complete" href="/settings/profile?tab=edit">Complete profile <ArrowRight size={15} aria-hidden="true" /></Link>}
                {ready && <>
                    <div className="pm-profile-reward-code-row"><span className="pm-profile-reward-code" aria-label="Coupon code">{reward.code}</span><button type="button" className="pm-profile-reward-copy" onClick={copyCode} aria-label={copied ? 'Coupon code copied' : 'Copy coupon code'}>{copied ? <Check size={15} aria-hidden="true"/> : <Copy size={15} aria-hidden="true"/>}{copied ? 'Copied' : 'Copy code'}</button></div>
                    {copyError && <p className="pm-profile-reward-error" role="alert">{copyError}</p>}
                    {reward.expiresAt && <p className="pm-profile-reward-expiry" title={`Expires ${new Date(reward.expiresAt).toLocaleString()}`}><Clock3 size={14} aria-hidden="true"/>Valid for {reward.validityDays} days</p>}
                </>}
            </div>
        </div>
    </section>;
}

/** Promotional strip in the homepage's existing exam carousel; no fabricated checkout. */
export function ProfileRewardPromotion({ promotion, isMember }: { promotion: RewardPromotionData | null; isMember: boolean }) {
    if (!promotion) return null;
    return <div className="pm-profile-reward-promotion">
        <Gift size={20} strokeWidth={1.8} aria-hidden="true" />
        <span>{isMember ? 'Complete your profile to 100%' : 'Sign up and complete your profile to 100%'} to get a code for {promotion.discountLabel} eligible simulator plans.</span>
        <Link href={isMember ? '/settings/profile' : '/register'}>{isMember ? 'View profile' : 'Join for free'}<ArrowRight size={17} aria-hidden="true"/></Link>
    </div>;
}
