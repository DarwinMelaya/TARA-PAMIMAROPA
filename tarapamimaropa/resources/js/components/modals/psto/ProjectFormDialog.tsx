import { Form } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertCircle, XIcon } from 'lucide-react';
import { useState } from 'react';
import type { ComponentProps, ReactNode, WheelEvent } from 'react';
import ProjectCoordinatePicker from '@/components/maps/ProjectCoordinatePicker';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    PROJECT_STATUS_LABELS,
    SECTORS,
    TARA_TYPES,
    buildProjectCode,
    projectStatusLabel,
    projectType,
    projectYear,
    type Province,
    type TaraProject,
} from '@/constants/taraProjects';
import { useBarangays, useMunicipalities } from '@/hooks/use-ph-locations';
import { cn } from '@/lib/utils';
import type { RouteFormDefinition } from '@/wayfinder';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    province: Province;
    idPrefix: string;
    title: string;
    description: string;
    submitLabel: string;
    form: RouteFormDefinition<'post'>;
    /** Present when editing; absent when creating (code is then previewed, not editable). */
    project?: TaraProject;
    nextCodeSequence?: number;
};

type FieldErrors = Partial<Record<string, string>>;

const selectClassName =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]';

const readOnlyClassName =
    'bg-muted/50 text-foreground flex h-9 items-center rounded-md border border-dashed px-3 text-sm';

const withCurrent = (options: readonly string[], current?: string | null) =>
    current && !options.includes(current)
        ? [current, ...options]
        : [...options];

const toInputValue = (value: number | null | undefined): string =>
    value == null || Number.isNaN(value) ? '' : String(value);

const initialYear = (project?: TaraProject): string => {
    if (!project) return String(new Date().getFullYear());
    const year = projectYear(project);
    return Number.isFinite(year) ? String(year) : '';
};

const blurOnWheel = (event: WheelEvent<HTMLInputElement>) =>
    event.currentTarget.blur();

const Section = ({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) => (
    <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
            {title}
        </legend>
        {children}
    </fieldset>
);

const Field = ({
    id,
    label,
    error,
    hint,
    required,
    wide,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
    wide?: boolean;
    children: ReactNode;
}) => (
    <div className={cn('grid content-start gap-2', wide && 'sm:col-span-2')}>
        <Label htmlFor={id}>
            {label}
            {required ? (
                <span className="text-destructive" aria-hidden="true">
                    *
                </span>
            ) : null}
        </Label>
        {children}
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
        <InputError message={error} />
    </div>
);

const AffixNumberInput = ({
    prefix,
    suffix,
    className,
    ...props
}: ComponentProps<typeof Input> & { prefix?: string; suffix?: string }) => (
    <div className="relative">
        {prefix ? (
            <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">
                {prefix}
            </span>
        ) : null}
        <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0.00"
            onWheel={blurOnWheel}
            className={cn(
                'tabular-nums',
                prefix && 'pl-7',
                suffix && 'pr-8',
                className,
            )}
            {...props}
        />
        {suffix ? (
            <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm">
                {suffix}
            </span>
        ) : null}
    </div>
);

const LocationSelect = ({
    id,
    label,
    name,
    list,
    value,
    onChange,
    placeholder,
    idleText,
    error,
}: {
    id: string;
    label: string;
    name: string;
    list: ReturnType<typeof useMunicipalities>;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    idleText?: string;
    error?: string;
}) => {
    if (list.status === 'error') {
        return (
            <Field
                id={id}
                label={label}
                hint="Could not load the list. Type the name instead."
                error={error}
            >
                <Input
                    id={id}
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={label}
                    aria-invalid={error ? true : undefined}
                />
            </Field>
        );
    }

    const disabled = list.status !== 'ready';
    const emptyLabel =
        list.status === 'loading'
            ? 'Loading…'
            : list.status === 'idle'
              ? (idleText ?? placeholder)
              : placeholder;

    return (
        <Field id={id} label={label} error={error}>
            <select
                id={id}
                name={name}
                className={selectClassName}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                aria-busy={list.status === 'loading'}
                aria-invalid={error ? true : undefined}
            >
                <option value="">{emptyLabel}</option>
                {withCurrent(
                    list.options.map((option) => option.name),
                    value,
                ).map((optionName) => (
                    <option key={optionName} value={optionName}>
                        {optionName}
                    </option>
                ))}
            </select>
            {disabled ? (
                <input type="hidden" name={name} value={value} />
            ) : null}
        </Field>
    );
};

const CityBarangayFields = ({
    idPrefix,
    province,
    project,
    errors,
}: {
    idPrefix: string;
    province: Province;
    project?: TaraProject;
    errors: FieldErrors;
}) => {
    const [city, setCity] = useState(project?.municipality ?? '');
    const [barangay, setBarangay] = useState(project?.barangay ?? '');

    const municipalities = useMunicipalities(province);
    const cityCode =
        municipalities.options.find((option) => option.name === city)?.code ??
        null;
    const barangays = useBarangays(cityCode);
    const barangayList =
        municipalities.status === 'error' ? municipalities : barangays;

    return (
        <>
            <LocationSelect
                id={`${idPrefix}-city`}
                label="City / Municipality"
                name="city"
                list={municipalities}
                value={city}
                onChange={(next) => {
                    setCity(next);
                    setBarangay('');
                }}
                placeholder={`Select municipality in ${province}`}
                error={errors.city}
            />
            <LocationSelect
                id={`${idPrefix}-barangay`}
                label="Barangay"
                name="barangay"
                list={barangayList}
                value={barangay}
                onChange={setBarangay}
                placeholder="Select barangay"
                idleText="Select a municipality first"
                error={errors.barangay}
            />
        </>
    );
};

const ProjectFormBody = ({
    onOpenChange,
    province,
    idPrefix,
    submitLabel,
    form,
    project,
    nextCodeSequence = 1,
}: Omit<Props, 'open' | 'title' | 'description'>) => {
    const [yearApproved, setYearApproved] = useState(() =>
        initialYear(project),
    );
    const [district, setDistrict] = useState(project?.district ?? '');
    const [latitude, setLatitude] = useState(
        project?.has_coordinates ? String(project.latitude) : '',
    );
    const [longitude, setLongitude] = useState(
        project?.has_coordinates ? String(project.longitude) : '',
    );

    const yearNum = Number(yearApproved);
    const previewCode = buildProjectCode(
        province,
        yearApproved !== '' && Number.isFinite(yearNum) ? yearNum : null,
        district,
        nextCodeSequence,
    );

    const statusValue = project ? projectStatusLabel(project) : 'On-going';
    const typeValue = project ? projectType(project) : '';
    const sectorValue = project?.sector ?? '';

    const id = (name: string) => `${idPrefix}-${name}`;
    const invalid = (errors: FieldErrors, name: string) =>
        errors[name] ? true : undefined;

    return (
        <Form
            {...form}
            options={{ preserveScroll: true }}
            className="flex min-h-0 flex-1 flex-col"
            onSuccess={() => onOpenChange(false)}
        >
            {({ processing, errors }) => {
                const errorCount = Object.keys(errors).length;

                return (
                    <>
                        <div className="grid min-h-0 flex-1 gap-8 overflow-y-auto px-6 py-5">
                            <input
                                type="hidden"
                                name="province"
                                value={province}
                            />

                            {errorCount > 0 ? (
                                <div
                                    role="alert"
                                    className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                                >
                                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                                    {errorCount === 1
                                        ? '1 field needs attention.'
                                        : `${errorCount} fields need attention.`}
                                </div>
                            ) : null}

                            <Section title="Project details">
                                <Field
                                    id={id('name')}
                                    label="Project name"
                                    error={errors.name}
                                    required
                                    wide
                                >
                                    <Input
                                        id={id('name')}
                                        name="name"
                                        required
                                        autoFocus
                                        maxLength={255}
                                        defaultValue={project?.name}
                                        placeholder="Project title"
                                        aria-invalid={invalid(errors, 'name')}
                                    />
                                </Field>

                                {project ? (
                                    <Field
                                        id={id('code')}
                                        label="Project code"
                                        error={errors.code}
                                    >
                                        <Input
                                            id={id('code')}
                                            name="code"
                                            defaultValue={project.code ?? ''}
                                            placeholder="QR-TTC-C5-1-17-0391"
                                            className="font-mono"
                                            aria-invalid={invalid(
                                                errors,
                                                'code',
                                            )}
                                        />
                                    </Field>
                                ) : (
                                    <Field
                                        id={id('code')}
                                        label="Project code"
                                        hint="Generated from year and district. Final number is assigned on save."
                                        error={errors.code}
                                    >
                                        <output
                                            id={id('code')}
                                            aria-live="polite"
                                            className={cn(
                                                readOnlyClassName,
                                                'font-mono',
                                            )}
                                        >
                                            {previewCode}
                                        </output>
                                    </Field>
                                )}

                                <Field
                                    id={id('year')}
                                    label="Year approved"
                                    error={errors.year_approved}
                                >
                                    <Input
                                        id={id('year')}
                                        name="year_approved"
                                        type="number"
                                        inputMode="numeric"
                                        min={1990}
                                        max={2100}
                                        value={yearApproved}
                                        onChange={(e) =>
                                            setYearApproved(e.target.value)
                                        }
                                        onWheel={blurOnWheel}
                                        aria-invalid={invalid(
                                            errors,
                                            'year_approved',
                                        )}
                                    />
                                </Field>

                                <Field
                                    id={id('type')}
                                    label="Type"
                                    error={errors.type}
                                >
                                    <select
                                        id={id('type')}
                                        name="type"
                                        className={selectClassName}
                                        defaultValue={typeValue}
                                        aria-invalid={invalid(errors, 'type')}
                                    >
                                        <option value="">Select type</option>
                                        {withCurrent(TARA_TYPES, typeValue).map(
                                            (type) => (
                                                <option key={type} value={type}>
                                                    {type}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </Field>

                                <Field
                                    id={id('sector')}
                                    label="Sector"
                                    error={errors.sector}
                                >
                                    <select
                                        id={id('sector')}
                                        name="sector"
                                        className={selectClassName}
                                        defaultValue={sectorValue}
                                        aria-invalid={invalid(errors, 'sector')}
                                    >
                                        <option value="">Select sector</option>
                                        {withCurrent(SECTORS, sectorValue).map(
                                            (sector) => (
                                                <option
                                                    key={sector}
                                                    value={sector}
                                                >
                                                    {sector}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </Field>

                                <Field
                                    id={id('status')}
                                    label="Status"
                                    error={errors.status}
                                >
                                    <select
                                        id={id('status')}
                                        name="status"
                                        className={selectClassName}
                                        defaultValue={statusValue}
                                        aria-invalid={invalid(errors, 'status')}
                                    >
                                        {withCurrent(
                                            PROJECT_STATUS_LABELS,
                                            statusValue,
                                        ).map((status) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field
                                    id={id('row')}
                                    label="Row #"
                                    error={errors.row_number}
                                >
                                    <Input
                                        id={id('row')}
                                        name="row_number"
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        defaultValue={project?.row_number ?? ''}
                                        placeholder="Optional"
                                        onWheel={blurOnWheel}
                                        aria-invalid={invalid(
                                            errors,
                                            'row_number',
                                        )}
                                    />
                                </Field>

                                <Field
                                    id={id('beneficiary')}
                                    label="Beneficiaries"
                                    error={errors.beneficiary}
                                    wide
                                >
                                    <Input
                                        id={id('beneficiary')}
                                        name="beneficiary"
                                        maxLength={500}
                                        defaultValue={project?.beneficiary}
                                        placeholder="Beneficiary names or organizations"
                                        aria-invalid={invalid(
                                            errors,
                                            'beneficiary',
                                        )}
                                    />
                                </Field>

                                <Field
                                    id={id('collaborators')}
                                    label="Collaborators"
                                    error={errors.collaborators}
                                    wide
                                >
                                    <Input
                                        id={id('collaborators')}
                                        name="collaborators"
                                        maxLength={2000}
                                        defaultValue={
                                            project
                                                ? (project.collaborators ??
                                                  project.partner_agency ??
                                                  '')
                                                : undefined
                                        }
                                        placeholder="Partner agencies"
                                        aria-invalid={invalid(
                                            errors,
                                            'collaborators',
                                        )}
                                    />
                                </Field>
                            </Section>

                            <Section title="Location">
                                <Field id={id('province')} label="Province">
                                    <output
                                        id={id('province')}
                                        className={readOnlyClassName}
                                    >
                                        {province}
                                    </output>
                                </Field>

                                <CityBarangayFields
                                    idPrefix={idPrefix}
                                    province={province}
                                    project={project}
                                    errors={errors}
                                />

                                <Field
                                    id={id('district')}
                                    label="District"
                                    error={errors.district}
                                >
                                    <Input
                                        id={id('district')}
                                        name="district"
                                        value={district}
                                        onChange={(e) =>
                                            setDistrict(e.target.value)
                                        }
                                        placeholder="e.g. 1st or 1"
                                        aria-invalid={invalid(
                                            errors,
                                            'district',
                                        )}
                                    />
                                </Field>

                                <ProjectCoordinatePicker
                                    idPrefix={idPrefix}
                                    province={province}
                                    latitude={latitude}
                                    longitude={longitude}
                                    onChange={(next) => {
                                        setLatitude(next.latitude);
                                        setLongitude(next.longitude);
                                    }}
                                    errors={{
                                        latitude: errors.latitude,
                                        longitude: errors.longitude,
                                    }}
                                />
                            </Section>

                            <Section title="Financials">
                                <Field
                                    id={id('cost')}
                                    label="Project cost"
                                    error={errors.project_cost}
                                >
                                    <AffixNumberInput
                                        id={id('cost')}
                                        name="project_cost"
                                        prefix="₱"
                                        defaultValue={toInputValue(
                                            project?.budget,
                                        )}
                                        aria-invalid={invalid(
                                            errors,
                                            'project_cost',
                                        )}
                                    />
                                </Field>

                                <Field
                                    id={id('due')}
                                    label="Amount due"
                                    error={errors.amount_due}
                                >
                                    <AffixNumberInput
                                        id={id('due')}
                                        name="amount_due"
                                        prefix="₱"
                                        defaultValue={toInputValue(
                                            project?.amount_due,
                                        )}
                                        aria-invalid={invalid(
                                            errors,
                                            'amount_due',
                                        )}
                                    />
                                </Field>

                                <Field
                                    id={id('refunded')}
                                    label="Refunded"
                                    error={errors.refunded}
                                >
                                    <AffixNumberInput
                                        id={id('refunded')}
                                        name="refunded"
                                        prefix="₱"
                                        defaultValue={toInputValue(
                                            project?.refunded,
                                        )}
                                        aria-invalid={invalid(
                                            errors,
                                            'refunded',
                                        )}
                                    />
                                </Field>

                                <Field
                                    id={id('rate')}
                                    label="Refund rate"
                                    error={errors.refund_rate}
                                >
                                    <AffixNumberInput
                                        id={id('rate')}
                                        name="refund_rate"
                                        suffix="%"
                                        max={100}
                                        defaultValue={toInputValue(
                                            project?.refund_rate,
                                        )}
                                        aria-invalid={invalid(
                                            errors,
                                            'refund_rate',
                                        )}
                                    />
                                </Field>
                            </Section>
                        </div>

                        <div className="bg-muted/30 flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={processing}
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? <Spinner /> : null}
                                {submitLabel}
                            </Button>
                        </div>
                    </>
                );
            }}
        </Form>
    );
};

const ProjectFormDialog = ({ open, title, description, ...props }: Props) => (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
        <DialogPortal>
            <DialogOverlay className="bg-slate-950/45 backdrop-blur-md" />
            <DialogPrimitive.Content
                onInteractOutside={(event) => event.preventDefault()}
                className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 flex max-h-[min(92vh,900px)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-lg border shadow-lg duration-200 sm:max-w-2xl"
            >
                <DialogHeader className="border-b px-6 pt-6 pr-14 pb-4">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <ProjectFormBody
                    key={props.project?.db_id ?? 'new'}
                    {...props}
                />

                <DialogPrimitive.Close
                    className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/50 absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-[3px]"
                    aria-label="Close"
                >
                    <XIcon className="size-4" />
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPortal>
    </Dialog>
);

export default ProjectFormDialog;
