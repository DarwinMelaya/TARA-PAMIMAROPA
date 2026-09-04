import { Head } from '@inertiajs/react';

const SuperAdminUsers = () => {
    return (
        <>
            <Head title="Users" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Users
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage PSTO, Regional Office, and Super Admin accounts.
                    </p>
                </div>
            </div>
        </>
    );
};

export default SuperAdminUsers;
