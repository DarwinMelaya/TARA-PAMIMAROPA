import { Head } from '@inertiajs/react';

const RegionPrograms = () => {
    return (
        <>
            <Head title="Programs" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Programs
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Regional programs and activities across MIMAROPA.
                    </p>
                </div>
            </div>
        </>
    );
};

export default RegionPrograms;
