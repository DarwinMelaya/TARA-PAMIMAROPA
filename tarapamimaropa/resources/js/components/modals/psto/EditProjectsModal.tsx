import { Form } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import ProjectController from '@/actions/App/Http/Controllers/Psto/ProjectController';
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
    projectStatusLabel,
    projectType,
    projectYear,
    type Province,
    type TaraProject,
} from '@/constants/taraProjects';
import { cn } from '@/lib/utils';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lockedProvince: Province;
    project: TaraProject | null;
};

const selectClassName =
    'border-input bg-background focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]';

const moneyDefault = (value: number | null | undefined): string => {
    if (value == null || Number.isNaN(value)) return '';
    return String(value);
};

const EditProjectsModal = ({
    open,
    onOpenChange,
    lockedProvince,
    project,
}: Props) => {
    if (!project?.db_id) {
        return null;
    }

    const statusValue = projectStatusLabel(project);
    const typeValue = projectType(project);
    const statusOptions = PROJECT_STATUS_LABELS.includes(
        statusValue as (typeof PROJECT_STATUS_LABELS)[number],
    )
        ? PROJECT_STATUS_LABELS
        : ([statusValue, ...PROJECT_STATUS_LABELS] as string[]);
    const typeOptions = TARA_TYPES.includes(
        typeValue as (typeof TARA_TYPES)[number],
    )
        ? TARA_TYPES
        : ([typeValue, ...TARA_TYPES] as string[]);
    const sectorOptions =
        project.sector &&
        !SECTORS.includes(project.sector as (typeof SECTORS)[number])
            ? [project.sector, ...SECTORS]
            : [...SECTORS];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="bg-slate-950/45 backdrop-blur-md" />
                <DialogPrimitive.Content
                    className={cn(
                        'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid max-h-[min(92vh,900px)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border p-6 shadow-lg duration-200 sm:max-w-2xl',
                    )}
                >
                    <DialogHeader>
                        <DialogTitle>Edit project</DialogTitle>
                        <DialogDescription>
                            Update project details for {lockedProvince}.
                        </DialogDescription>
                    </DialogHeader>

                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                        aria-label="Close"
                    >
                        <XIcon className="size-4" />
                    </button>

                    <Form
                        key={project.db_id}
                        {...ProjectController.update.form(project.db_id)}
                        options={{ preserveScroll: true }}
                        className="grid gap-4 sm:grid-cols-2"
                        onSuccess={() => onOpenChange(false)}
                    >
                        {({ processing, errors }) => (
                            <>
                                <input
                                    type="hidden"
                                    name="province"
                                    value={lockedProvince}
                                />

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="edit-project-name">
                                        Project name
                                    </Label>
                                    <Input
                                        id="edit-project-name"
                                        name="name"
                                        required
                                        autoFocus
                                        defaultValue={project.name}
                                        placeholder="Project title"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-project-code">
                                        Code
                                    </Label>
                                    <Input
                                        id="edit-project-code"
                                        name="code"
                                        defaultValue={project.code ?? ''}
                                        placeholder="Optional unique code"
                                    />
                                    <InputError message={errors.code} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-project-year">
                                        Year approved
                                    </Label>
                                    <Input
                                        id="edit-project-year"
                                        name="year_approved"
                                        type="number"
                                        min={1990}
                                        max={2100}
                                        defaultValue={projectYear(project)}
                                    />
                                    <InputError
                                        message={errors.year_approved}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-project-type">
                                        Type
                                    </Label>
                                    <select
                                        id="edit-project-type"
                                        name="type"
                                        className={selectClassName}
                                        defaultValue={typeValue}
                                    >
                                        <option value="">Select type</option>
                                        {typeOptions.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.type} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-project-sector">
                                        Sector
                                    </Label>
                                    <select
                                        id="edit-project-sector"
                                        name="sector"
                                        className={selectClassName}
                                        defaultValue={project.sector || ''}
                                    >
                                        <option value="">Select sector</option>
                                        {sectorOptions.map((sector) => (
                                            <option key={sector} value={sector}>
                                                {sector}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.sector} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-project-status">
                                        Status
                                    </Label>
                                    <select
                                        id="edit-project-status"
                                        name="status"
                                        className={selectClassName}
                                        defaultValue={statusValue}
                                    >
                                        {statusOptions.map((status) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.status} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-project-row">
                                        Row #
                                    </Label>
                                    <Input
                                        id="edit-project-row"
                                        name="row_number"
                                        type="number"
                                        min={1}
                                        defaultValue={project.row_number ?? ''}
                                    />
                                    <InputError message={errors.row_number} />
                                </div>

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="edit-project-beneficiary">
                                        Beneficiaries
                                    </Label>
                                    <Input
                                        id="edit-project-beneficiary"
                                        name="beneficiary"
                                        defaultValue={project.beneficiary}
                                        placeholder="Beneficiary names / orgs"
                                    />
                                    <InputError message={errors.beneficiary} />
                                </div>

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="edit-project-collaborators">
                                        Collaborators
                                    </Label>
                                    <Input
                                        id="edit-project-collaborators"
                                        name="collaborators"
                                        defaultValue={
                                            project.collaborators ??
                                            project.partner_agency ??
                                            ''
                                        }
                                        placeholder="Partner agencies"
                                    />
                                    <InputError
                                        message={errors.collaborators}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-project-province">
                                        Province
                                    </Label>
                                    <Input
                                        id="edit-project-province"
                                        value={lockedProvince}
                                        disabled
                                        readOnly
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-project-city">
                                        City / Municipality
                                    </Label>
                                    <Input
                                        id="edit-project-city"
                                        name="city"
                                        defaultValue={project.municipality}
                                        placeholder="City or municipality"
                                    />
                                    <InputError message={errors.city} />
                                </div>

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="edit-project-district">
                                        District
                                    </Label>
                                    <Input
                                        id="edit-project-district"
                                        name="district"
                                        defaultValue={project.district ?? ''}
                                        placeholder="Optional district"
                                    />
                                    <InputError message={errors.district} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-project-cost">
                                        Project cost
                                    </Label>
                                    <Input
                                        id="edit-project-cost"
                                        name="project_cost"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        defaultValue={moneyDefault(
                                            project.budget,
                                        )}
                                    />
                                    <InputError message={errors.project_cost} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-project-due">
                                        Amount due
                                    </Label>
                                    <Input
                                        id="edit-project-due"
                                        name="amount_due"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        defaultValue={moneyDefault(
                                            project.amount_due,
                                        )}
                                    />
                                    <InputError message={errors.amount_due} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-project-refunded">
                                        Refunded
                                    </Label>
                                    <Input
                                        id="edit-project-refunded"
                                        name="refunded"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        defaultValue={moneyDefault(
                                            project.refunded,
                                        )}
                                    />
                                    <InputError message={errors.refunded} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-project-rate">
                                        Refund rate (%)
                                    </Label>
                                    <Input
                                        id="edit-project-rate"
                                        name="refund_rate"
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        defaultValue={moneyDefault(
                                            project.refund_rate,
                                        )}
                                    />
                                    <InputError message={errors.refund_rate} />
                                </div>

                                <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
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
                                        Save changes
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
};

export default EditProjectsModal;
