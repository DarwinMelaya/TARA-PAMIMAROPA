import { Head, usePage } from '@inertiajs/react';

const PstoPrograms = () => {
    const { auth } = usePage().props;
    const province = auth.user?.province ?? null;

    return (
        <>
            <Head title="PSTO Programs" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Programs
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {province
                            ? `Programs and projects for ${province}.`
                            : 'Programs and projects for this PSTO.'}
                    </p>
                </div>
            </div>
        </>
    );
};

export default PstoPrograms;
