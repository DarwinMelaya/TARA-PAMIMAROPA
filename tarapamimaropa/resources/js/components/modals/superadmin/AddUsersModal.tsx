import { Form } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { useState } from 'react';
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

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    roles: Option[];
    provinces: Option[];
};

const selectClassName =
    'border-input bg-background focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]';

const AddUsersModal = ({ open, onOpenChange, roles, provinces }: Props) => {
    const [role, setRole] = useState('');
    const isPsto = role === 'psto';

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) setRole('');
                onOpenChange(next);
            }}
        >
            <DialogPortal>
                <DialogOverlay className="bg-slate-950/45 backdrop-blur-md" />
                <DialogPrimitive.Content
                    className={cn(
                        'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
                    )}
                >
                    <DialogHeader>
                        <DialogTitle>Create user</DialogTitle>
                        <DialogDescription>
                            Account can sign in immediately with the password
                            you set. PSTO accounts must pick a province.
                        </DialogDescription>
                    </DialogHeader>

                    <Form
                        {...UserController.store.form()}
                        resetOnSuccess={[
                            'name',
                            'email',
                            'password',
                            'password_confirmation',
                            'role',
                            'province',
                        ]}
                        options={{ preserveScroll: true }}
                        className="grid gap-4 sm:grid-cols-2"
                        onSuccess={() => {
                            setRole('');
                            onOpenChange(false);
                        }}
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="add-user-name">Name</Label>
                                    <Input
                                        id="add-user-name"
                                        name="name"
                                        required
                                        autoFocus
                                        autoComplete="name"
                                        placeholder="Full name"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="add-user-email">
                                        Email
                                    </Label>
                                    <Input
                                        id="add-user-email"
                                        type="email"
                                        name="email"
                                        required
                                        autoComplete="email"
                                        placeholder="email@example.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="add-user-role">Role</Label>
                                    <select
                                        id="add-user-role"
                                        name="role"
                                        required
                                        value={role}
                                        onChange={(e) =>
                                            setRole(e.target.value)
                                        }
                                        className={selectClassName}
                                    >
                                        <option value="" disabled>
                                            Select role
                                        </option>
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
                                        <Label htmlFor="add-user-province">
                                            Province (PSTO)
                                        </Label>
                                        <select
                                            id="add-user-province"
                                            name="province"
                                            required
                                            defaultValue=""
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
                                    <Label htmlFor="add-user-password">
                                        Password
                                    </Label>
                                    <PasswordInput
                                        id="add-user-password"
                                        name="password"
                                        required
                                        autoComplete="new-password"
                                        placeholder="Password"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="add-user-password-confirm">
                                        Confirm password
                                    </Label>
                                    <PasswordInput
                                        id="add-user-password-confirm"
                                        name="password_confirmation"
                                        required
                                        autoComplete="new-password"
                                        placeholder="Confirm password"
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
                                        Save user
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

export default AddUsersModal;
