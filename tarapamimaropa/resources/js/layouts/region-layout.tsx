import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import RegionSidebar from '@/components/layout/RegionSidebar';
import type { PropsWithChildren } from 'react';

export default function RegionLayout({ children }: PropsWithChildren) {
    return (
        <AppShell variant="sidebar">
            <RegionSidebar />
            <AppContent variant="sidebar" className="min-w-0 overflow-x-clip">
                {children}
            </AppContent>
        </AppShell>
    );
}
