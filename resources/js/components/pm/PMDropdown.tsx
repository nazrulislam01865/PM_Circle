import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

/** Shared PM Circle single-select control. Options can be supplied by Admin Master Data. */
const CLEAR_VALUE = '__pm_circle_dropdown_clear_selection__';
export type PMDropdownOption = {
    value: string;
    label: string;
    disabled?: boolean;
};

export type PMDropdownProps = {
    id: string;
    value: string;
    onValueChange: (value: string) => void;
    options: readonly PMDropdownOption[];
    placeholder: string;
    name?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    className?: string;
    'aria-describedby'?: string;
    'aria-label'?: string;
};

export function PMDropdown({
    id,
    value,
    onValueChange,
    options,
    placeholder,
    name,
    disabled = false,
    required = false,
    invalid = false,
    className = '',
    'aria-describedby': describedBy,
    'aria-label': ariaLabel,
}: PMDropdownProps) {
    // A Radix item cannot have an empty value; empty means the placeholder.
    const availableOptions = options.filter((option) => option.value !== '' && option.value !== CLEAR_VALUE);

    return (
        <Select.Root
            name={name}
            value={value}
            onValueChange={(next) => onValueChange(next === CLEAR_VALUE ? '' : next)}
            disabled={disabled || availableOptions.length === 0}
            required={required}
        >
            <Select.Trigger
                id={id}
                className={`pm-dropdown-trigger ${className}`.trim()}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                aria-label={ariaLabel}
            >
                <Select.Value placeholder={placeholder} />
                <Select.Icon className="pm-dropdown-chevron">
                    <ChevronDown aria-hidden="true" />
                </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
                <Select.Content
                    className="pm-dropdown-content"
                    position="popper"
                    side="bottom"
                    sideOffset={4}
                    align="start"
                    collisionPadding={8}
                >
                    <Select.ScrollUpButton className="pm-dropdown-scroll-control">
                        <ChevronUp aria-hidden="true" />
                    </Select.ScrollUpButton>
                    <Select.Viewport className="pm-dropdown-viewport">
                        {!required && value !== '' && (
                            <Select.Item value={CLEAR_VALUE} className="pm-dropdown-option pm-dropdown-clear">
                                <Select.ItemText>Clear selection</Select.ItemText>
                            </Select.Item>
                        )}
                        {availableOptions.map((option) => (
                            <Select.Item
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                                className="pm-dropdown-option"
                            >
                                <Select.ItemText>{option.label}</Select.ItemText>
                                <Select.ItemIndicator className="pm-dropdown-indicator">
                                    <Check aria-hidden="true" />
                                </Select.ItemIndicator>
                            </Select.Item>
                        ))}
                    </Select.Viewport>
                    <Select.ScrollDownButton className="pm-dropdown-scroll-control">
                        <ChevronDown aria-hidden="true" />
                    </Select.ScrollDownButton>
                </Select.Content>
            </Select.Portal>
        </Select.Root>
    );
}
