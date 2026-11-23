import { Link } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Gift, X } from 'lucide-react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const OfferDialogContext = createContext<(() => void) | null>(null);

/** Open the one shared public offer dialog from the header or a simulator offer card. */
export function useRewardOfferDialog(): (() => void) | null {
    return useContext(OfferDialogContext);
}

const offerSteps = [
    { title: 'Create your free account', description: 'Register and verify your email.' },
    { title: 'Complete your profile', description: 'Fill in the required details until your profile reaches 100%.' },
    { title: 'Find your discount code', description: 'Copy the discount code from your profile.' },
    { title: 'Apply it at checkout', description: 'Enter the code when purchasing a PM Circle Exam Simulator.' },
] as const;

/** Presentation only. The server remains responsible for issuing and validating rewards. */
function RewardOfferDialog({ open, onOpenChange, discountLabel, isMember }: {
    open: boolean;
    onOpenChange: (next: boolean) => void;
    discountLabel: string;
    isMember: boolean;
}) {
    return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="pm-reward-offer-overlay" />
            <DialogPrimitive.Content className="pm-reward-offer-dialog" aria-describedby="pm-reward-offer-description">
                <DialogPrimitive.Close className="pm-reward-offer-close" aria-label="Close discount offer">
                    <X aria-hidden="true" />
                </DialogPrimitive.Close>
                <div className="pm-reward-offer-heading">
                    <span className="pm-reward-offer-gift" aria-hidden="true"><Gift /></span>
                    <div className="pm-reward-offer-heading-copy">
                        <DialogPrimitive.Title>Get {discountLabel} off your Exam Simulator</DialogPrimitive.Title>
                        <DialogPrimitive.Description id="pm-reward-offer-description">
                            Complete your PM Circle profile to unlock a discount code.
                        </DialogPrimitive.Description>
                    </div>
                </div>
                <ol className="pm-reward-offer-steps">
                    {offerSteps.map((step, index) => <li key={step.title} className="pm-reward-offer-step">
                        <span className="pm-reward-offer-number" aria-hidden="true">{index + 1}</span>
                        <div><h3>{step.title}</h3><p>{step.description}</p></div>
                    </li>)}
                </ol>
                <div className="pm-reward-offer-actions">
                    <Link className="pm-reward-offer-primary" href={isMember ? '/settings/profile?tab=edit' : '/register'}>
                        {isMember ? 'Complete your profile' : 'Register & complete profile'}
                    </Link>
                    {!isMember && <p>Already a member? <Link href="/login">Log in</Link></p>}
                </div>
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    </DialogPrimitive.Root>;
}

/** Mount once in the shared public shell; no extra request or duplicated dialog per card. */
export function RewardOfferProvider({ children, discountLabel, isMember }: {
    children: ReactNode;
    discountLabel: string;
    isMember: boolean;
}) {
    const [open, setOpen] = useState(false);
    const openOffer = useCallback(() => setOpen(true), []);
    return <OfferDialogContext.Provider value={openOffer}>
        {children}
        <RewardOfferDialog open={open} onOpenChange={setOpen} discountLabel={discountLabel} isMember={isMember} />
    </OfferDialogContext.Provider>;
}
