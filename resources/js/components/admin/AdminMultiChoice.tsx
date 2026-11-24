import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';

type Option = { value: string; label: string };

type Props = {
    id: string;
    label: string;
    options: Option[];
    value: string[];
    onChange: (next: string[]) => void;
    maxSelections: number;
    hint?: string;
    error?: string;
    inlineTags?: boolean;
};

/** Central admin multi-choice, using existing Radix primitives and design tokens. */
export function AdminMultiChoice({ id, label, options, value, onChange, maxSelections, hint, error, inlineTags = false }: Props) {
    const toggle = (choice: string) => {
        if (value.includes(choice)) {
            onChange(value.filter(item => item !== choice));
        } else if (value.length < maxSelections) {
            onChange([...value, choice]);
        }
    };

    const tags = value.length > 0 && <div className="pm-admin-multi-tags">{value.map(item => <span className="pm-admin-multi-tag" key={item}>
        {options.find(option => option.value === item)?.label ?? item}
        <button type="button" onClick={() => toggle(item)} aria-label={`Remove ${options.find(option => option.value === item)?.label ?? item}`}>×</button>
    </span>)}</div>;
    const dropdown = <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger id={id} type="button" aria-labelledby={`${id}-label`} aria-invalid={!!error || undefined} className="pm-admin-choice-trigger">
                <span>{inlineTags && value.length ? null : value.length ? `${value.length} selected · ${value.map(item => options.find(option => option.value === item)?.label ?? item).join(', ')}` : 'Select one or more'}</span>
                <ChevronDown size={17} aria-hidden="true" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content align="start" sideOffset={4} className="pm-admin-choice-content pm-admin-multi-content" aria-label={label}>
                    <p className="pm-admin-multi-menu-caption">Choose up to {maxSelections}. Selections stay open while you choose.</p>
                    <div className="pm-admin-multi-options">
                        {options.map(option => <DropdownMenu.CheckboxItem
                            key={option.value}
                            checked={value.includes(option.value)}
                            disabled={!value.includes(option.value) && value.length >= maxSelections}
                            onCheckedChange={() => toggle(option.value)}
                            onSelect={event => event.preventDefault()}
                            className="pm-admin-multi-item"
                        >
                            <span className="pm-admin-multi-check" aria-hidden="true">{value.includes(option.value) && <Check size={15}/>}</span>
                            <span>{option.label}</span>
                        </DropdownMenu.CheckboxItem>)}
                        {!options.length && <p className="pm-admin-hint">No active options. Add values in Master Data.</p>}
                    </div>
                    <div className="pm-admin-multi-menu-footer">
                        <span>{value.length} of {maxSelections}</span>
                        <DropdownMenu.Item className="pm-admin-multi-done">Done</DropdownMenu.Item>
                    </div>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>;
    return <div className={`pm-admin-field pm-admin-multi-choice${inlineTags ? ' pm-admin-multi-inline' : ''}`}>
        <label id={`${id}-label`}>{label}</label>
        {inlineTags ? <div className="pm-admin-multi-inline-control">{tags}{dropdown}</div> : <>{dropdown}{tags}</>}
        {hint && <small className="pm-admin-hint">{hint}</small>}
        {error && <small className="pm-error" role="alert">{error}</small>}
    </div>;
}
