import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import PstoSidebar from '@/components/layout/PstoSidebar';
import type { PropsWithChildren } from 'react';
import { useSeiTheme } from '@/hooks/use-sei-theme';

export default function PstoLayout({ children }: PropsWithChildren) {
    useSeiTheme();

    return (
        <AppShell variant="sidebar">
            <PstoSidebar />
            <AppContent
                variant="sidebar"
                className="min-w-0 overflow-x-clip md:overflow-hidden"
            >
                {children}
            </AppContent>
        </AppShell>
    );
}
