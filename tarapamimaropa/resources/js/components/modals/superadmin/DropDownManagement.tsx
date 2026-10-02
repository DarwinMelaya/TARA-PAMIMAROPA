import { Form } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { useState } from 'react';
import DropdownOptionController from '@/actions/App/Http/Controllers/SuperAdmin/DropdownOptionController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export type DropdownOptionRow = {
    id: number;
    label: string;
    color: string | null;
    projects_count: number;
};

/** Dark enough for white text on badges, pins, and chart bars. */
export const OPTION_COLOR_PRESETS = [
    '#16823c',
    '#7f23d0',
    '#c9440b',
    '#a16207',
    '#be185d',
    '#1d51db',
    '#0e7490',
    '#4338ca',
    '#b91c1c',
    '#4d7c0f',
    '#475569',
    '#111827',
];

const OptionColorField = ({
    initial,
    error,
}: {
    initial: string;
    error?: string;
}) => {
    const [color, setColor] = useState(initial);

    return (
        <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm leading-none font-medium">
                Color
            </legend>
            <input type="hidden" name="color" value={color} />
            <div className="flex flex-wrap items-center gap-2">
                {OPTION_COLOR_PRESETS.map((preset) => {
                    const selected = preset === color;

                    return (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => setColor(preset)}
                            aria-label={`Use color ${preset}`}
                            aria-pressed={selected}
                            className={cn(
                                'focus-visible:ring-ring/50 grid size-8 place-items-center rounded-full text-white outline-none focus-visible:ring-[3px]',
                                selected &&
                                    'ring-foreground ring-offset-background ring-2 ring-offset-2',
                            )}
                            style={{ backgroundColor: preset }}
                        >
                            {selected ? <Check className="size-4" /> : null}
                        </button>
                    );
                })}
                <label
                    className="border-input relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed"
                    title="Custom color"
                >
                    <span className="sr-only">Custom color</span>
                    <span
                        className="text-muted-foreground text-xs font-semibold"
                        aria-hidden
                    >
                        +
                    </span>
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                    />
                </label>
            </div>
            <div className="flex items-center gap-2">
                <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: color }}
                >
                    Preview
                </span>
                <span className="text-muted-foreground font-mono text-xs uppercase">
                    {color}
                </span>
            </div>
            <InputError message={error} />
        </fieldset>
    );
};

const suggestColor = (category: DropdownCategoryGroup): string => {
    const used = new Set(category.options.map((option) => option.color));

    return (
        OPTION_COLOR_PRESETS.find((preset) => !used.has(preset)) ??
        OPTION_COLOR_PRESETS[0]
    );
};

export type DropdownCategoryGroup = {
    value: string;
    label: string;
    options: DropdownOptionRow[];
};

type OptionModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: DropdownCategoryGroup | null;
    /** When set, the modal renames this option instead of adding one. */
    option?: DropdownOptionRow | null;
    /** Prefills the name when adding (e.g. from an unmatched search). */
    defaultLabel?: string;
};

export const DropdownOptionModal = ({
    open,
    onOpenChange,
    category,
    option,
    defaultLabel = '',
}: OptionModalProps) => {
    if (!category) {
        return null;
    }

    const isEdit = Boolean(option);
    const formProps = option
        ? DropdownOptionController.update.form(option.id)
        : DropdownOptionController.store.form();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit
                            ? `Edit ${category.label.toLowerCase()}`
                            : `Add ${category.label.toLowerCase()}`}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit && option && option.projects_count > 0
                            ? `${option.projects_count} project${option.projects_count === 1 ? '' : 's'} using “${option.label}” will be renamed too.`
                            : `This option appears in the project form, Excel template, and filters.`}
                    </DialogDescription>
                </DialogHeader>

                <Form
                    key={`${category.value}-${option?.id ?? 'new'}`}
                    {...formProps}
                    options={{ preserveScroll: true }}
                    className="grid gap-4"
                    onSuccess={() => onOpenChange(false)}
                >
                    {({ processing, errors }) => (
                        <>
                            {!isEdit ? (
                                <input
                                    type="hidden"
                                    name="category"
                                    value={category.value}
                                />
                            ) : null}

                            <div className="grid gap-2">
                                <Label htmlFor="dropdown-option-label">
                                    {category.label} name
                                </Label>
                                <Input
                                    id="dropdown-option-label"
                                    name="label"
                                    required
                                    autoFocus
                                    maxLength={255}
                                    defaultValue={option?.label ?? defaultLabel}
                                    placeholder={`e.g. ${category.options[0]?.label ?? 'New option'}`}
                                />
                                <InputError
                                    message={errors.label ?? errors.category}
                                />
                            </div>

                            <OptionColorField
                                initial={
                                    option?.color ?? suggestColor(category)
                                }
                                error={errors.color}
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    {isEdit ? 'Save changes' : 'Add option'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
};

type DeleteModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: DropdownCategoryGroup | null;
    option: DropdownOptionRow | null;
};

export const DeleteDropdownOptionModal = ({
    open,
    onOpenChange,
    category,
    option,
}: DeleteModalProps) => {
    if (!category || !option) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Remove “{option.label}”?</DialogTitle>
                    <DialogDescription>
                        {option.projects_count > 0
                            ? `${option.projects_count} existing project${option.projects_count === 1 ? '' : 's'} will keep this ${category.label.toLowerCase()}, but it will no longer be offered for new entries.`
                            : `It will no longer be offered in the project form, Excel template, or filters.`}
                    </DialogDescription>
                </DialogHeader>

                <Form
                    {...DropdownOptionController.destroy.form(option.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
                >
                    {({ processing }) => (
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Remove
                            </Button>
                        </DialogFooter>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
};
