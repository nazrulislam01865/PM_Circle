/** Server-issued, member-bound reward. No client-side eligibility or discount calculation. */
export type ProfileRewardData = {
    status: 'pending' | 'ready' | 'expired' | 'redeemed';
    discountLabel: string;
    code?: string | null;
    expiresAt?: string;
    validityDays?: number;
};

export type RewardPromotionData = {
    discountLabel: string;
    validityDays: number;
};
