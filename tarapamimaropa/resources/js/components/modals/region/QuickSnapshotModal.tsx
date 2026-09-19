import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useMemo } from 'react';
import { XIcon } from 'lucide-react';
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    PROVINCES,
    formatCompact,
    projectStatusClass,
    projectStatusLabel,
    projectType,
    type Province,
    type TaraProject,
} from '@/constants/taraProjects';
import { useTheme } from '@/theme/ThemeProvider';
import { cn } from '@/lib/utils';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projects: TaraProject[];
    provinceFilter?: Province | 'all';
    statusFilter?: string | 'all';
    onProvinceFilter?: (next: Province | 'all') => void;
    onStatusFilter?: (next: string | 'all') => void;
};

const QuickSnapshotModal = ({
    open,
    onOpenChange,
    projects,
    provinceFilter = 'all',
    statusFilter = 'all',
    onProvinceFilter,
    onStatusFilter,
}: Props) => {
    const { theme, isDark } = useTheme();
    const statusMode = isDark ? 'dark' : 'light';
    const light = theme === 'light';

    const scoped = useMemo(
        () =>
            provinceFilter === 'all'
                ? projects
                : projects.filter((p) => p.province === provinceFilter),
        [projects, provinceFilter],
    );

    const byProvince = useMemo(() => {
        const rows = PROVINCES.map((province) => {
            const items = projects.filter((p) => p.province === province);
            return {
                province,
                count: items.length,
                budget: items.reduce((s, p) => s + p.budget, 0),
            };
        }).filter((r) => r.count > 0);
        const max = Math.max(1, ...rows.map((r) => r.count));
        return { rows, max };
    }, [projects]);

    const byStatus = useMemo(() => {
        const counts = new Map<string, number>();
        for (const p of scoped) {
            const label = projectStatusLabel(p);
            counts.set(label, (counts.get(label) ?? 0) + 1);
        }
        const rows = [...counts.entries()]
            .map(([status, count]) => ({ status, count }))
            .sort((a, b) => b.count - a.count);
        const max = Math.max(1, ...rows.map((r) => r.count));
        return { rows, max };
    }, [scoped]);

    const byType = useMemo(() => {
        const counts = new Map<string, { count: number; budget: number }>();
        for (const p of scoped) {
            const type = projectType(p);
            const prev = counts.get(type) ?? { count: 0, budget: 0 };
            counts.set(type, {
                count: prev.count + 1,
                budget: prev.budget + p.budget,
            });
        }
        const rows = [...counts.entries()]
            .map(([type, data]) => ({ type, ...data }))
            .sort((a, b) => b.count - a.count);
        const max = Math.max(1, ...rows.map((r) => r.count));
        return { rows, max };
    }, [scoped]);

    const card = light
        ? 'border-slate-200 bg-white'
        : 'border-slate-700 bg-slate-900';
    const heading = light ? 'text-slate-900' : 'text-white';
    const muted = 'text-slate-500';
    const body = light ? 'text-slate-700' : 'text-slate-300';
    const track = light ? 'bg-slate-200' : 'bg-slate-800';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay />
                <DialogPrimitive.Content
                    className={cn(
                        'fixed top-1/2 left-1/2 z-50 flex max-h-[min(90vh,720px)] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border p-0 shadow-lg outline-none',
                        light
                            ? 'border-slate-200 bg-white'
                            : 'border-slate-700 bg-slate-950',
                    )}
                >
                    <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <DialogTitle className={heading}>
                                    Quick snapshot
                                </DialogTitle>
                                <DialogDescription className="mt-0.5 text-xs text-slate-500">
                                    PSTO · status · type
                                    {provinceFilter !== 'all'
                                        ? ` · ${provinceFilter}`
                                        : ' · MIMAROPA'}
                                    {' · '}
                                    {scoped.length} project
                                    {scoped.length === 1 ? '' : 's'}
                                </DialogDescription>
                            </div>
                            <DialogPrimitive.Close
                                className={cn(
                                    'rounded-lg p-1.5 transition',
                                    light
                                        ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                        : 'text-slate-400 hover:bg-slate-900 hover:text-white',
                                )}
                                aria-label="Close"
                            >
                                <XIcon className="h-4 w-4" />
                            </DialogPrimitive.Close>
                        </div>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                        <div className={cn('rounded-xl border p-4', card)}>
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <p className={cn('text-sm font-medium', heading)}>
                                    Projects per PSTO
                                </p>
                                <span className={cn('text-xs', muted)}>
                                    Tap to focus map
                                </span>
                            </div>
                            {byProvince.rows.length === 0 ? (
                                <p className="text-xs text-slate-500">No projects.</p>
                            ) : (
                                <div className="space-y-2">
                                    {byProvince.rows.map((row) => {
                                        const active =
                                            provinceFilter === row.province;
                                        const pct = Math.round(
                                            (row.count / byProvince.max) * 100,
                                        );
                                        return (
                                            <button
                                                key={row.province}
                                                type="button"
                                                onClick={() =>
                                                    onProvinceFilter?.(
                                                        active
                                                            ? 'all'
                                                            : row.province,
                                                    )
                                                }
                                                className={cn(
                                                    'w-full rounded-lg border p-2.5 text-left transition',
                                                    active
                                                        ? 'border-blue-500 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-600/10'
                                                        : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800',
                                                )}
                                            >
                                                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                                                    <span
                                                        className={cn(
                                                            'font-medium',
                                                            body,
                                                        )}
                                                    >
                                                        {row.province}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            'shrink-0',
                                                            muted,
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                'font-semibold',
                                                                heading,
                                                            )}
                                                        >
                                                            {row.count}
                                                        </span>{' '}
                                                        ·{' '}
                                                        {formatCompact(
                                                            row.budget,
                                                        )}
                                                    </span>
                                                </div>
                                                <div
                                                    className={cn(
                                                        'h-2 overflow-hidden rounded-full',
                                                        track,
                                                    )}
                                                >
                                                    <div
                                                        className="h-full rounded-full bg-blue-500"
                                                        style={{
                                                            width: `${pct}%`,
                                                        }}
                                                    />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className={cn('rounded-xl border p-4', card)}>
                                <p
                                    className={cn(
                                        'mb-3 text-sm font-medium',
                                        heading,
                                    )}
                                >
                                    By status
                                </p>
                                {byStatus.rows.length === 0 ? (
                                    <p className="text-xs text-slate-500">
                                        No projects.
                                    </p>
                                ) : (
                                    <div className="space-y-2.5">
                                        {byStatus.rows.map((row) => {
                                            const pct = Math.round(
                                                (row.count / byStatus.max) *
                                                    100,
                                            );
                                            const sample = scoped.find(
                                                (p) =>
                                                    projectStatusLabel(p) ===
                                                    row.status,
                                            );
                                            const badgeClass = sample
                                                ? projectStatusClass(
                                                      sample,
                                                      statusMode,
                                                  )
                                                : light
                                                  ? 'border border-slate-400 bg-slate-200 text-slate-900 ring-0'
                                                  : 'bg-slate-800 text-slate-200 ring-slate-500';
                                            const active =
                                                statusFilter === row.status;
                                            return (
                                                <button
                                                    key={row.status}
                                                    type="button"
                                                    onClick={() =>
                                                        onStatusFilter?.(
                                                            active
                                                                ? 'all'
                                                                : row.status,
                                                        )
                                                    }
                                                    className="w-full text-left"
                                                >
                                                    <div className="mb-1 flex items-center justify-between text-xs">
                                                        <span
                                                            className={cn(
                                                                'rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
                                                                badgeClass,
                                                            )}
                                                        >
                                                            {row.status}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                'font-semibold',
                                                                heading,
                                                            )}
                                                        >
                                                            {row.count}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={cn(
                                                            'h-2 overflow-hidden rounded-full',
                                                            track,
                                                        )}
                                                    >
                                                        <div
                                                            className="h-full rounded-full bg-blue-500"
                                                            style={{
                                                                width: `${pct}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className={cn('rounded-xl border p-4', card)}>
                                <p
                                    className={cn(
                                        'mb-3 text-sm font-medium',
                                        heading,
                                    )}
                                >
                                    By type
                                </p>
                                {byType.rows.length === 0 ? (
                                    <p className="text-xs text-slate-500">
                                        No projects.
                                    </p>
                                ) : (
                                    <div className="space-y-2.5">
                                        {byType.rows.map((row) => {
                                            const pct = Math.round(
                                                (row.count / byType.max) * 100,
                                            );
                                            return (
                                                <div key={row.type}>
                                                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                                        <span
                                                            className={cn(
                                                                'min-w-0 truncate font-medium',
                                                                body,
                                                            )}
                                                        >
                                                            {row.type}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                'shrink-0',
                                                                muted,
                                                            )}
                                                        >
                                                            <span
                                                                className={cn(
                                                                    'font-semibold',
                                                                    heading,
                                                                )}
                                                            >
                                                                {row.count}
                                                            </span>{' '}
                                                            ·{' '}
                                                            {formatCompact(
                                                                row.budget,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={cn(
                                                            'h-2 overflow-hidden rounded-full',
                                                            track,
                                                        )}
                                                    >
                                                        <div
                                                            className="h-full rounded-full bg-blue-500"
                                                            style={{
                                                                width: `${pct}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
};

export default QuickSnapshotModal;
