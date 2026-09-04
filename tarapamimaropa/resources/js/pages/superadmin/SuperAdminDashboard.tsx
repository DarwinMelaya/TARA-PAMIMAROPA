import { Head } from '@inertiajs/react';

const SuperAdminDashboard = () => {
    return (
        <>
            <Head title="Super Admin Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Super Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Overview for TARAPAMIMAROPA system administration.
                    </p>
                </div>
            </div>
        </>
    );
};

export default SuperAdminDashboard;
