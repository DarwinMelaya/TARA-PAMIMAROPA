import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import SuperAdminSidebar from '@/components/layout/SuperAdminSidebar';
import type { PropsWithChildren } from 'react';

export default function SuperAdminLayout({ children }: PropsWithChildren) {
    return (
        <AppShell variant="sidebar">
            <SuperAdminSidebar />
            <AppContent variant="sidebar" className="min-w-0 overflow-x-clip">
                {children}
            </AppContent>
        </AppShell>
    );
}
