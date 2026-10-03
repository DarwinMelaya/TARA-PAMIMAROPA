import { Head, usePage } from '@inertiajs/react';
import { useDeferredValue, useMemo, useState } from 'react';
import { HiFunnel, HiMapPin, HiXMark } from 'react-icons/hi2';
import Maps from '@/components/maps/Maps';
import {
  PROGRAM_META,
  projectStatusLabel,
  projectTypeLabel,
  projectTypeOptions,
  type TaraProject,
} from '@/constants/taraProjects';
import {
  useDashboardProjectStream,
  type ProjectStreamMeta,
} from '@/hooks/use-dashboard-project-stream';
import { useTheme } from '@/theme/ThemeProvider';

type PageProps = {
  projects?: TaraProject[];
  projectStream?: ProjectStreamMeta | null;
  lockedProvince?: string | null;
};

const PstoDashboard = () => {
  const {
    projects: seed = [],
    projectStream = null,
    lockedProvince = null,
  } = usePage<PageProps>().props;
  const { projects } = useDashboardProjectStream(seed, projectStream);
  const { isDark, theme } = useTheme();
  const [typeFilter, setTypeFilter] = useState<string | 'all'>('all');
  const typeOptions = useMemo(() => projectTypeOptions(projects), [projects]);
  const filteredProjects = useMemo(
    () =>
      typeFilter === 'all'
        ? projects
        : projects.filter((p) => projectTypeLabel(p) === typeFilter),
    [projects, typeFilter],
  );
  const deferredProjects = useDeferredValue(filteredProjects);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId
    ? (deferredProjects.find((p) => p.id === selectedId) ?? null)
    : null;

  if (!lockedProvince) {
    return (
      <>
        <Head title="PSTO Dashboard" />
        <div className="flex h-full flex-1 flex-col gap-4 p-4">
          <h1 className="text-xl font-semibold tracking-tight">
            PSTO Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 max-w-prose text-sm">
            This PSTO account has no province assigned. Ask a super admin to set
            the province so the project map can load.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head title={`PSTO · ${lockedProvince}`} />
      <div
        className={[
          'relative flex h-[calc(100dvh-1rem)] min-h-[28rem] flex-1 flex-col overflow-hidden rounded-xl border',
          theme === 'light'
            ? 'border-[#d5dce5] bg-[#f4f6f9]'
            : 'border-white/10 bg-[#030A17]',
        ].join(' ')}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex items-start justify-between gap-3 p-3 sm:p-4">
          <div
            className={[
              'pointer-events-auto rounded-xl border px-3 py-2 shadow-lg backdrop-blur-md',
              theme === 'light'
                ? 'border-[#d5dce5] bg-white/90'
                : 'border-white/15 bg-[#030A17]/85',
            ].join(' ')}
          >
            <p
              className={[
                'text-[10px] font-medium tracking-[0.22em] uppercase',
                theme === 'light' ? 'text-[#1D4ED8]' : 'text-[#93C5FD]',
              ].join(' ')}
            >
              Provincial map
            </p>
            <h1
              className={[
                'font-sei-display text-sm font-extrabold uppercase tracking-wide sm:text-base',
                theme === 'light' ? 'text-[#030A17]' : 'text-[#f1f1f1]',
              ].join(' ')}
            >
              {lockedProvince}
            </h1>
            <p
              className={[
                'mt-0.5 text-[11px]',
                theme === 'light' ? 'text-[#4b5563]' : 'text-[#a3acbd]',
              ].join(' ')}
            >
              {deferredProjects.length} project
              {deferredProjects.length === 1 ? '' : 's'} · 3D map
            </p>
            <div className="relative mt-2">
              <HiFunnel
                className={[
                  'pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2',
                  theme === 'light' ? 'text-[#1D4ED8]' : 'text-[#93C5FD]',
                ].join(' ')}
                aria-hidden
              />
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setSelectedId(null);
                }}
                aria-label="Filter by project type"
                className={[
                  'min-h-9 w-full cursor-pointer rounded-lg border py-1.5 pr-3 pl-7 text-xs font-semibold outline-none transition-colors focus-visible:ring-2',
                  theme === 'light'
                    ? 'border-[#d5dce5] bg-white text-[#030A17] hover:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/30'
                    : 'border-white/15 bg-[#050c1a] text-[#f1f1f1] hover:border-[#60A5FA] focus-visible:ring-[#60A5FA]/30',
                  typeFilter !== 'all'
                    ? theme === 'light'
                      ? 'border-[#1D4ED8]'
                      : 'border-[#60A5FA]'
                    : '',
                ].join(' ')}
              >
                <option value="all">All types</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <Maps
            projects={deferredProjects}
            selectedId={selectedId}
            baseLayer="street"
            viewMode="3d"
            isDark={isDark}
            perfLite={false}
            onViewProject={(project) => setSelectedId(project.id)}
          />
        </div>

        {selected ? (
          <div
            className={[
              'absolute inset-x-3 bottom-3 z-[500] mx-auto max-w-lg rounded-xl border p-3 shadow-xl backdrop-blur-md sm:inset-x-auto sm:right-3 sm:left-auto sm:w-80',
              theme === 'light'
                ? 'border-[#d5dce5] bg-white/95'
                : 'border-white/15 bg-[#070F1F]/90',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className="text-[10px] font-semibold tracking-wide uppercase"
                  style={{
                    color: PROGRAM_META[selected.program]?.color ?? undefined,
                  }}
                >
                  {PROGRAM_META[selected.program]?.short ?? selected.program}
                </p>
                <h2
                  className={[
                    'mt-0.5 truncate text-sm font-semibold',
                    theme === 'light' ? 'text-[#030A17]' : 'text-[#f1f1f1]',
                  ].join(' ')}
                >
                  {selected.name}
                </h2>
                <p
                  className={[
                    'mt-1 flex items-center gap-1 text-[11px]',
                    theme === 'light' ? 'text-[#4b5563]' : 'text-[#a3acbd]',
                  ].join(' ')}
                >
                  <HiMapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">
                    {selected.municipality}, {selected.province}
                  </span>
                </p>
                <p
                  className={[
                    'mt-1 text-[11px]',
                    theme === 'light' ? 'text-[#4b5563]' : 'text-[#a3acbd]',
                  ].join(' ')}
                >
                  {projectStatusLabel(selected)} · {selected.progress}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className={[
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition',
                  theme === 'light'
                    ? 'text-[#4b5563] hover:bg-[#eff4ff] hover:text-[#030A17]'
                    : 'text-[#a3acbd] hover:bg-white/[0.06] hover:text-white',
                ].join(' ')}
                aria-label="Close"
              >
                <HiXMark className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default PstoDashboard;
