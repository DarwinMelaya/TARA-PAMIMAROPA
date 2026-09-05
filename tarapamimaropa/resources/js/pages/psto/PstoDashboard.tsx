import { Head, usePage } from '@inertiajs/react';

const PstoDashboard = () => {
    const { auth } = usePage().props;
    const province = auth.user?.province ?? null;

    return (
        <>
            <Head title="PSTO Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        PSTO Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {province
                            ? `Provincial Science and Technology Office — ${province}`
                            : 'Provincial Science and Technology Office overview.'}
                    </p>
                </div>
            </div>
        </>
    );
};

export default PstoDashboard;
