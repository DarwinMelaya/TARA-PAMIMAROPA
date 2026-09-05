import { Form } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
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
    buildProjectCode,
    type Province,
} from '@/constants/taraProjects';
import { cn } from '@/lib/utils';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lockedProvince: Province;
    nextCodeSequence?: number;
};

const selectClassName =
    'border-input bg-background focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]';

const AddProjectsModal = ({
    open,
    onOpenChange,
    lockedProvince,
    nextCodeSequence = 1,
}: Props) => {
    const currentYear = new Date().getFullYear();
    const [yearApproved, setYearApproved] = useState(String(currentYear));
    const [district, setDistrict] = useState('');

    const previewCode = useMemo(() => {
        const yearNum = Number(yearApproved);
        return buildProjectCode(
            lockedProvince,
            Number.isFinite(yearNum) ? yearNum : currentYear,
            district,
            nextCodeSequence,
        );
    }, [lockedProvince, yearApproved, district, nextCodeSequence, currentYear]);

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    setYearApproved(String(currentYear));
                    setDistrict('');
                }
                onOpenChange(next);
            }}
        >
            <DialogPortal>
                <DialogOverlay className="bg-slate-950/45 backdrop-blur-md" />
                <DialogPrimitive.Content
                    className={cn(
                        'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid max-h-[min(92vh,900px)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border p-6 shadow-lg duration-200 sm:max-w-2xl',
                    )}
                >
                    <DialogHeader>
                        <DialogTitle>Add project</DialogTitle>
                        <DialogDescription>
                            Create a project under {lockedProvince}. Code follows
                            the QR-TTC layout used by existing projects.
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
                        {...ProjectController.store.form()}
                        resetOnSuccess={[
                            'name',
                            'type',
                            'year_approved',
                            'beneficiary',
                            'collaborators',
                            'sector',
                            'city',
                            'district',
                            'status',
                            'row_number',
                            'project_cost',
                            'amount_due',
                            'refunded',
                            'refund_rate',
                        ]}
                        options={{ preserveScroll: true }}
                        className="grid gap-4 sm:grid-cols-2"
                        onSuccess={() => {
                            setYearApproved(String(currentYear));
                            setDistrict('');
                            onOpenChange(false);
                        }}
                    >
                        {({ processing, errors }) => (
                            <>
                                <input
                                    type="hidden"
                                    name="province"
                                    value={lockedProvince}
                                />

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="add-project-name">
                                        Project name
                                    </Label>
                                    <Input
                                        id="add-project-name"
                                        name="name"
                                        required
                                        autoFocus
                                        placeholder="Project title"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="add-project-code">
                                        Code
                                    </Label>
                                    <Input
                                        id="add-project-code"
                                        value={previewCode}
                                        readOnly
                                        disabled
                                        className="font-mono text-sm"
                                    />
                                    <p className="text-muted-foreground text-xs">
                                        Auto-generated like existing codes (e.g.
                                        QR-TTC-C5-1-17-0391). Updates with year
                                        and district.
                                    </p>
                                    <InputError message={errors.code} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="add-project-year">
                                        Year approved
                                    </Label>
                                    <Input
                                        id="add-project-year"
                                        name="year_approved"
                                        type="number"
                                        min={1990}
                                        max={2100}
                                        value={yearApproved}
                                        onChange={(e) =>
                                            setYearApproved(e.target.value)
                                        }
                                        placeholder={String(currentYear)}
                                    />
                                    <InputError
                                        message={errors.year_approved}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="add-project-type">
                                        Type
                                    </Label>
                                    <select
                                        id="add-project-type"
                                        name="type"
                                        className={selectClassName}
                                        defaultValue=""
                                    >
                                        <option value="">Select type</option>
                                        {TARA_TYPES.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.type} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="add-project-sector">
                                        Sector
                                    </Label>
                                    <select
                                        id="add-project-sector"
                                        name="sector"
                                        className={selectClassName}
                                        defaultValue=""
                                    >
                                        <option value="">Select sector</option>
                                        {SECTORS.map((sector) => (
                                            <option key={sector} value={sector}>
                                                {sector}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.sector} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="add-project-status">
                                        Status
                                    </Label>
                                    <select
                                        id="add-project-status"
                                        name="status"
                                        className={selectClassName}
                                        defaultValue="On-going"
                                    >
                                        {PROJECT_STATUS_LABELS.map((status) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.status} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="add-project-row">
                                        Row #
                                    </Label>
                                    <Input
                                        id="add-project-row"
                                        name="row_number"
                                        type="number"
                                        min={1}
                                        placeholder="Optional"
                                    />
                                    <InputError message={errors.row_number} />
                                </div>

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="add-project-beneficiary">
                                        Beneficiaries
                                    </Label>
                                    <Input
                                        id="add-project-beneficiary"
                                        name="beneficiary"
                                        placeholder="Beneficiary names / orgs"
                                    />
                                    <InputError message={errors.beneficiary} />
                                </div>

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="add-project-collaborators">
                                        Collaborators
                                    </Label>
                                    <Input
                                        id="add-project-collaborators"
                                        name="collaborators"
                                        placeholder="Partner agencies"
                                    />
                                    <InputError
                                        message={errors.collaborators}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="add-project-province">
                                        Province
                                    </Label>
                                    <Input
                                        id="add-project-province"
                                        value={lockedProvince}
                                        disabled
                                        readOnly
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="add-project-city">
                                        City / Municipality
                                    </Label>
                                    <Input
                                        id="add-project-city"
                                        name="city"
                                        placeholder="City or municipality"
                                    />
                                    <InputError message={errors.city} />
                                </div>

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="add-project-district">
                                        District
                                    </Label>
                                    <Input
                                        id="add-project-district"
                                        name="district"
                                        value={district}
                                        onChange={(e) =>
                                            setDistrict(e.target.value)
                                        }
                                        placeholder="e.g. 1st or 1"
                                    />
                                    <InputError message={errors.district} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="add-project-cost">
                                        Project cost
                                    </Label>
                                    <Input
                                        id="add-project-cost"
                                        name="project_cost"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="0.00"
                                    />
                                    <InputError message={errors.project_cost} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="add-project-due">
                                        Amount due
                                    </Label>
                                    <Input
                                        id="add-project-due"
                                        name="amount_due"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="0.00"
                                    />
                                    <InputError message={errors.amount_due} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="add-project-refunded">
                                        Refunded
                                    </Label>
                                    <Input
                                        id="add-project-refunded"
                                        name="refunded"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="0.00"
                                    />
                                    <InputError message={errors.refunded} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="add-project-rate">
                                        Refund rate (%)
                                    </Label>
                                    <Input
                                        id="add-project-rate"
                                        name="refund_rate"
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        placeholder="0.00"
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
                                        Save project
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

export default AddProjectsModal;
