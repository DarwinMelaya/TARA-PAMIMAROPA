import { Head } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import AddUsersModal from '@/components/modals/superadmin/AddUsersModal';
import EditUserModal from '@/components/modals/superadmin/EditUserModal';
import { Button } from '@/components/ui/button';
import { useFlashToast } from '@/hooks/use-flash-toast';

type RoleOption = {
    value: string;
    label: string;
};

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    role: string;
    role_label: string;
    created_at: string | null;
};

type Props = {
    users: ManagedUser[];
    roles: RoleOption[];
};

const formatDate = (value: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const SuperAdminUsers = ({ users, roles }: Props) => {
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<ManagedUser | null>(null);
    useFlashToast();

    return (
        <>
            <Head title="Users" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            Users
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            View every account and create PSTO, Regional
                            Office, or Super Admin users.
                        </p>
                    </div>
                    <Button type="button" onClick={() => setCreateOpen(true)}>
                        Create user
                    </Button>
                </div>

                <div className="border-border bg-card overflow-hidden rounded-xl border shadow-xs">
                    <div className="border-border flex items-center justify-between border-b px-4 py-3">
                        <p className="text-sm font-medium">
                            All users{' '}
                            <span className="text-muted-foreground font-normal">
                                ({users.length})
                            </span>
                        </p>
                    </div>

                    {users.length === 0 ? (
                        <p className="text-muted-foreground p-8 text-center text-sm">
                            No users yet. Create the first account.
                        </p>
                    ) : (
                        <>
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full min-w-[640px] text-left text-sm">
                                    <thead>
                                        <tr className="border-border text-muted-foreground border-b text-[11px] uppercase tracking-wide">
                                            <th className="px-4 py-2.5 font-semibold">
                                                Name
                                            </th>
                                            <th className="px-4 py-2.5 font-semibold">
                                                Email
                                            </th>
                                            <th className="px-4 py-2.5 font-semibold">
                                                Role
                                            </th>
                                            <th className="px-4 py-2.5 font-semibold">
                                                Created
                                            </th>
                                            <th className="px-4 py-2.5 text-right font-semibold">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr
                                                key={user.id}
                                                className="border-border border-b last:border-b-0"
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    {user.name}
                                                </td>
                                                <td className="text-muted-foreground px-4 py-3">
                                                    {user.email}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-muted inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold">
                                                        {user.role_label}
                                                    </span>
                                                </td>
                                                <td className="text-muted-foreground px-4 py-3 tabular-nums">
                                                    {formatDate(
                                                        user.created_at,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            setEditing(user)
                                                        }
                                                    >
                                                        <Pencil className="size-3.5" />
                                                        Edit
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <ul className="divide-border divide-y md:hidden">
                                {users.map((user) => (
                                    <li
                                        key={user.id}
                                        className="flex flex-col gap-2 px-4 py-3"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-medium">
                                                {user.name}
                                            </p>
                                            <span className="bg-muted shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                                                {user.role_label}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground text-xs">
                                            {user.email}
                                        </p>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-muted-foreground text-[11px]">
                                                {formatDate(user.created_at)}
                                            </p>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setEditing(user)
                                                }
                                            >
                                                <Pencil className="size-3.5" />
                                                Edit
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            </div>

            <AddUsersModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                roles={roles}
            />

            <EditUserModal
                open={editing !== null}
                onOpenChange={(open) => {
                    if (!open) setEditing(null);
                }}
                roles={roles}
                user={editing}
            />
        </>
    );
};

export default SuperAdminUsers;
