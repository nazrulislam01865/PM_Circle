import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

type Choice = { value: string; label: string };

type Props = {
    id: string;
    label: string;
    value: string;
    options: Choice[];
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    clearable?: boolean;
    error?: string;
    contentClassName?: string;
};

/** Shared PM Circle admin dropdown: keyboard accessible, consistently sized, and not OS-native. */
export function AdminChoice({ id, label, value, options, onChange, placeholder = 'Select an option', disabled = false, required = false, invalid = false, clearable = false, error, contentClassName }: Props) {
    const clearValue = '__pm_admin_choice_clear__';
    return <div className="pm-admin-field pm-admin-choice-field">
        <label htmlFor={id}>{label}</label>
        <SelectPrimitive.Root value={value} onValueChange={next => onChange(next === clearValue ? '' : next)} disabled={disabled || options.length === 0} required={required}>
            <SelectPrimitive.Trigger id={id} aria-label={label} aria-invalid={invalid || !!error || undefined} className="pm-admin-choice-trigger">
                <SelectPrimitive.Value placeholder={options.length ? placeholder : 'No active options available'}/>
                <SelectPrimitive.Icon asChild><ChevronDown size={17}/></SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>
            <SelectPrimitive.Portal>
                <SelectPrimitive.Content position="popper" sideOffset={4} align="start" className={['pm-admin-choice-content', contentClassName].filter(Boolean).join(' ')}>
                    <SelectPrimitive.ScrollUpButton className="pm-admin-choice-scroll"><ChevronUp size={16}/></SelectPrimitive.ScrollUpButton>
                    <SelectPrimitive.Viewport className="pm-admin-choice-viewport">
                        {clearable && value !== '' && <SelectPrimitive.Item value={clearValue} className="pm-admin-choice-item"><SelectPrimitive.ItemText>Clear selection</SelectPrimitive.ItemText></SelectPrimitive.Item>}
                        {options.map(option => <SelectPrimitive.Item key={option.value} value={option.value} className="pm-admin-choice-item">
                            <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                            <SelectPrimitive.ItemIndicator className="pm-admin-choice-indicator"><Check size={16}/></SelectPrimitive.ItemIndicator>
                        </SelectPrimitive.Item>)}
                    </SelectPrimitive.Viewport>
                    <SelectPrimitive.ScrollDownButton className="pm-admin-choice-scroll"><ChevronDown size={16}/></SelectPrimitive.ScrollDownButton>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
        {error && <small role="alert" className="pm-admin-error">{error}</small>}
    </div>;
}
