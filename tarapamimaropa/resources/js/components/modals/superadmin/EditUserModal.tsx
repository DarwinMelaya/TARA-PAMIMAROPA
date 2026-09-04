import { Form } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import UserController from '@/actions/App/Http/Controllers/SuperAdmin/UserController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
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
import { cn } from '@/lib/utils';

type Option = {
    value: string;
    label: string;
};

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    role: string;
    province: string | null;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    roles: Option[];
    provinces: Option[];
    user: ManagedUser | null;
};

const selectClassName =
    'border-input bg-background focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]';

const EditUserModal = ({
    open,
    onOpenChange,
    roles,
    provinces,
    user,
}: Props) => {
    const [role, setRole] = useState(user?.role ?? '');

    useEffect(() => {
        setRole(user?.role ?? '');
    }, [user]);

    if (!user) {
        return null;
    }

    const isPsto = role === 'psto';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="bg-slate-950/45 backdrop-blur-md" />
                <DialogPrimitive.Content
                    className={cn(
                        'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
                    )}
                >
                    <DialogHeader>
                        <DialogTitle>Edit user</DialogTitle>
                        <DialogDescription>
                            Update account details. Leave password blank to keep
                            the current password. PSTO accounts need a province.
                        </DialogDescription>
                    </DialogHeader>

                    <Form
                        key={`${user.id}-${user.role}-${user.province ?? ''}`}
                        {...UserController.update.form(user)}
                        options={{ preserveScroll: true }}
                        className="grid gap-4 sm:grid-cols-2"
                        onSuccess={() => onOpenChange(false)}
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-user-name">Name</Label>
                                    <Input
                                        id="edit-user-name"
                                        name="name"
                                        required
                                        autoFocus
                                        autoComplete="name"
                                        defaultValue={user.name}
                                        placeholder="Full name"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-user-email">
                                        Email
                                    </Label>
                                    <Input
                                        id="edit-user-email"
                                        type="email"
                                        name="email"
                                        required
                                        autoComplete="email"
                                        defaultValue={user.email}
                                        placeholder="email@example.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="edit-user-role">Role</Label>
                                    <select
                                        id="edit-user-role"
                                        name="role"
                                        required
                                        value={role}
                                        onChange={(e) =>
                                            setRole(e.target.value)
                                        }
                                        className={selectClassName}
                                    >
                                        {roles.map((item) => (
                                            <option
                                                key={item.value}
                                                value={item.value}
                                            >
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.role} />
                                </div>

                                {isPsto ? (
                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label htmlFor="edit-user-province">
                                            Province (PSTO)
                                        </Label>
                                        <select
                                            id="edit-user-province"
                                            name="province"
                                            required
                                            defaultValue={user.province ?? ''}
                                            className={selectClassName}
                                        >
                                            <option value="" disabled>
                                                Select province
                                            </option>
                                            {provinces.map((item) => (
                                                <option
                                                    key={item.value}
                                                    value={item.value}
                                                >
                                                    {item.label}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={errors.province} />
                                    </div>
                                ) : null}

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-user-password">
                                        New password
                                    </Label>
                                    <PasswordInput
                                        id="edit-user-password"
                                        name="password"
                                        autoComplete="new-password"
                                        placeholder="Leave blank to keep"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-user-password-confirm">
                                        Confirm password
                                    </Label>
                                    <PasswordInput
                                        id="edit-user-password-confirm"
                                        name="password_confirmation"
                                        autoComplete="new-password"
                                        placeholder="Confirm if changing"
                                    />
                                    <InputError
                                        message={errors.password_confirmation}
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 sm:col-span-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        Save changes
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>

                    <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                        <XIcon />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
};

export default EditUserModal;
