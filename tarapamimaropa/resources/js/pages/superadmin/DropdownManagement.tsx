import { Head } from '@inertiajs/react';

const DropdownManagement = () => {
    return (
        <>
            <Head title="Dropdown Management" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
                <div>
                    <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                        System Settings
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                        Dropdown Management
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage the option lists used in project forms and
                        filters.
                    </p>
                </div>
            </div>
        </>
    );
};

export default DropdownManagement;
