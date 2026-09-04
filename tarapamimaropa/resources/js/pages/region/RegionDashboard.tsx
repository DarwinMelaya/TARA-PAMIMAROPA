import { Head } from '@inertiajs/react';

const RegionDashboard = () => {
    return (
        <>
            <Head title="Region Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Region Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        MIMAROPA Regional Office overview.
                    </p>
                </div>
            </div>
        </>
    );
};

export default RegionDashboard;
