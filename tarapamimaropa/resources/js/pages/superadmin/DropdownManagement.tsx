import { Head } from '@inertiajs/react';
import { Pencil, Plus, Search, SearchX, Trash2, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import {
    DeleteDropdownOptionModal,
    DropdownOptionModal,
} from '@/components/modals/superadmin/DropDownManagement';
import type {
    DropdownCategoryGroup,
    DropdownOptionRow,
} from '@/components/modals/superadmin/DropDownManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { projectTypeMeta } from '@/constants/taraProjects';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { cn } from '@/lib/utils';

type Props = {
    categories: DropdownCategoryGroup[];
};

type SortKey = 'name' | 'usage';

type ModalState = {
    mode: 'add' | 'edit' | 'delete';
    category: DropdownCategoryGroup;
    option: DropdownOptionRow | null;
    defaultLabel?: string;
} | null;

const selectClassName =
    'border-input bg-background focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]';

const plural = (count: number, word: string) =>
    `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`;

const DropdownManagement = ({ categories }: Props) => {
    useFlashToast();

    const [activeValue, setActiveValue] = useState(categories[0]?.value ?? '');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SortKey>('name');
    const [modal, setModal] = useState<ModalState>(null);
    const deferredQuery = useDeferredValue(query);

    const active =
        categories.find((category) => category.value === activeValue) ??
        categories[0];

    const totalProjects = useMemo(
        () =>
            active?.options.reduce(
                (sum, option) => sum + option.projects_count,
                0,
            ) ?? 0,
        [active],
    );

    const maxUsage = useMemo(
        () =>
            Math.max(
                1,
                ...(active?.options.map((option) => option.projects_count) ??
                    []),
            ),
        [active],
    );

    const visibleOptions = useMemo(() => {
        const needle = deferredQuery.trim().toLowerCase();
        const matches = (active?.options ?? []).filter((option) =>
            option.label.toLowerCase().includes(needle),
        );

        return sort === 'usage'
            ? [...matches].sort(
                  (a, b) =>
                      b.projects_count - a.projects_count ||
                      a.label.localeCompare(b.label),
              )
            : [...matches].sort((a, b) => a.label.localeCompare(b.label));
    }, [active, deferredQuery, sort]);

    const switchCategory = (value: string) => {
        setActiveValue(value);
        setQuery('');
    };

    const closeModal = (open: boolean) => {
        if (!open) {
            setModal(null);
        }
    };

    if (!active) {
        return null;
    }

    const noun = active.label.toLowerCase();
    const trimmedQuery = query.trim();

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
                        Manage the option lists used in project forms, the Excel
                        template, and filters.
                    </p>
                </div>

                <section className="bg-card flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-xs">
                    <div className="flex flex-col gap-3 border-b px-4 pt-4 sm:flex-row sm:items-end sm:justify-between">
                        <div
                            role="tablist"
                            aria-label="Dropdown lists"
                            className="-mb-px flex gap-1"
                        >
                            {categories.map((category) => {
                                const selected =
                                    category.value === active.value;

                                return (
                                    <button
                                        key={category.value}
                                        type="button"
                                        role="tab"
                                        id={`tab-${category.value}`}
                                        aria-selected={selected}
                                        aria-controls="dropdown-options-panel"
                                        onClick={() =>
                                            switchCategory(category.value)
                                        }
                                        className={cn(
                                            'focus-visible:ring-ring/50 flex items-center gap-2 border-b-2 px-3 pb-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]',
                                            selected
                                                ? 'border-primary text-foreground'
                                                : 'text-muted-foreground hover:text-foreground border-transparent',
                                        )}
                                    >
                                        {category.label}
                                        <span
                                            className={cn(
                                                'rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums',
                                                selected
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {category.options.length}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <Button
                            size="sm"
                            className="mb-3 self-start sm:self-auto"
                            onClick={() =>
                                setModal({
                                    mode: 'add',
                                    category: active,
                                    option: null,
                                })
                            }
                        >
                            <Plus />
                            Add {noun}
                        </Button>
                    </div>

                    <div
                        id="dropdown-options-panel"
                        role="tabpanel"
                        aria-labelledby={`tab-${active.value}`}
                        className="flex min-h-0 flex-col"
                    >
                        <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <Search
                                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                                    aria-hidden
                                />
                                <Input
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={`Search ${noun} options…`}
                                    aria-label={`Search ${noun} options`}
                                    className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
                                />
                                {query ? (
                                    <button
                                        type="button"
                                        onClick={() => setQuery('')}
                                        aria-label="Clear search"
                                        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded"
                                    >
                                        <X className="size-4" />
                                    </button>
                                ) : null}
                            </div>
                            <label className="text-muted-foreground flex items-center gap-2 text-sm">
                                Sort
                                <select
                                    value={sort}
                                    onChange={(e) =>
                                        setSort(e.target.value as SortKey)
                                    }
                                    className={selectClassName}
                                >
                                    <option value="name">Name (A–Z)</option>
                                    <option value="usage">Most used</option>
                                </select>
                            </label>
                        </div>

                        <div className="text-muted-foreground grid grid-cols-[minmax(0,1fr)_7rem_4.5rem] items-center gap-3 border-b bg-muted/40 px-4 py-2 text-[11px] font-semibold tracking-wider uppercase sm:grid-cols-[minmax(0,1fr)_12rem_4.5rem]">
                            <span>Option</span>
                            <span>Projects</span>
                            <span className="sr-only">Actions</span>
                        </div>

                        {visibleOptions.length > 0 ? (
                            <ul className="max-h-[min(60vh,32rem)] divide-y overflow-y-auto overscroll-contain">
                                {visibleOptions.map((option) => (
                                    <li
                                        key={option.id}
                                        className="group hover:bg-muted/40 grid grid-cols-[minmax(0,1fr)_7rem_4.5rem] items-center gap-3 px-4 py-2 transition-colors sm:grid-cols-[minmax(0,1fr)_12rem_4.5rem]"
                                    >
                                        <span className="flex min-w-0 items-center gap-2.5">
                                            <span
                                                className="size-3 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15"
                                                style={{
                                                    backgroundColor:
                                                        option.color ??
                                                        (active.value === 'type'
                                                            ? projectTypeMeta(
                                                                  option.label,
                                                              ).color
                                                            : '#94a3b8'),
                                                }}
                                                title={
                                                    option.color ??
                                                    'Default color'
                                                }
                                                aria-hidden
                                            />
                                            <span
                                                className="truncate text-sm font-medium"
                                                title={option.label}
                                            >
                                                {option.label}
                                            </span>
                                        </span>

                                        <div className="flex items-center gap-2">
                                            <div
                                                className="bg-muted hidden h-1.5 flex-1 overflow-hidden rounded-full sm:block"
                                                aria-hidden
                                            >
                                                <div
                                                    className="bg-primary/70 h-full rounded-full"
                                                    style={{
                                                        width: `${(option.projects_count / maxUsage) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                            <span
                                                className={cn(
                                                    'w-10 text-right text-xs tabular-nums sm:w-12',
                                                    option.projects_count === 0
                                                        ? 'text-muted-foreground/60'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {option.projects_count.toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="flex justify-end gap-0.5 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="size-8"
                                                aria-label={`Edit ${option.label}`}
                                                onClick={() =>
                                                    setModal({
                                                        mode: 'edit',
                                                        category: active,
                                                        option,
                                                    })
                                                }
                                            >
                                                <Pencil />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive size-8"
                                                aria-label={`Remove ${option.label}`}
                                                onClick={() =>
                                                    setModal({
                                                        mode: 'delete',
                                                        category: active,
                                                        option,
                                                    })
                                                }
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                                <SearchX
                                    className="text-muted-foreground/60 size-8"
                                    aria-hidden
                                />
                                {trimmedQuery ? (
                                    <>
                                        <p className="text-sm">
                                            No {noun} matches “{trimmedQuery}”.
                                        </p>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setQuery('')}
                                            >
                                                Clear search
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    setModal({
                                                        mode: 'add',
                                                        category: active,
                                                        option: null,
                                                        defaultLabel:
                                                            trimmedQuery,
                                                    })
                                                }
                                            >
                                                <Plus />
                                                Add “{trimmedQuery}”
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        No {noun} options yet. Add one to make
                                        it available in project forms.
                                    </p>
                                )}
                            </div>
                        )}

                        <div
                            className="text-muted-foreground flex items-center justify-between gap-3 border-t px-4 py-2.5 text-xs"
                            aria-live="polite"
                        >
                            <span>
                                {visibleOptions.length === active.options.length
                                    ? plural(active.options.length, 'option')
                                    : `Showing ${visibleOptions.length} of ${plural(active.options.length, 'option')}`}
                            </span>
                            <span>
                                {plural(totalProjects, 'project')} tagged
                            </span>
                        </div>
                    </div>
                </section>
            </div>

            <DropdownOptionModal
                open={modal?.mode === 'add' || modal?.mode === 'edit'}
                onOpenChange={closeModal}
                category={modal?.category ?? null}
                option={modal?.mode === 'edit' ? modal.option : null}
                defaultLabel={modal?.defaultLabel}
            />
            <DeleteDropdownOptionModal
                open={modal?.mode === 'delete'}
                onOpenChange={closeModal}
                category={modal?.category ?? null}
                option={modal?.mode === 'delete' ? modal.option : null}
            />
        </>
    );
};

export default DropdownManagement;
