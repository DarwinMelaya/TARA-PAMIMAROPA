import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import RegionSidebar from '@/components/layout/RegionSidebar';
import type { PropsWithChildren } from 'react';
import { useSeiTheme } from '@/hooks/use-sei-theme';

export default function RegionLayout({ children }: PropsWithChildren) {
    useSeiTheme();

    return (
        <AppShell variant="sidebar">
            <RegionSidebar />
            <AppContent
                variant="sidebar"
                className="min-w-0 overflow-x-clip md:overflow-hidden"
            >
                {children}
            </AppContent>
        </AppShell>
    );
}
