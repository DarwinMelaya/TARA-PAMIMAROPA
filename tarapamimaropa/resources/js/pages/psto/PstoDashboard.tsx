import { Head, usePage } from '@inertiajs/react';
import { useDeferredValue, useEffect, useState } from 'react';
import { HiMapPin, HiXMark } from 'react-icons/hi2';
import Maps from '@/components/maps/Maps';
import {
  PROGRAM_META,
  projectStatusLabel,
  type TaraProject,
} from '@/constants/taraProjects';

type PageProps = {
  projects?: TaraProject[];
  lockedProvince?: string | null;
};

const PstoDashboard = () => {
  const { projects = [], lockedProvince = null } = usePage<PageProps>().props;
  const deferredProjects = useDeferredValue(projects);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [perfLite, setPerfLite] = useState(false);

  useEffect(() => {
    const coarse =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse), (max-width: 1023px)').matches;
    setPerfLite(coarse);
  }, []);

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
      <div className="relative flex h-[calc(100dvh-1rem)] min-h-[28rem] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-950 dark:border-slate-800">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex items-start justify-between gap-3 p-3 sm:p-4">
          <div className="pointer-events-auto rounded-xl border border-slate-700/80 bg-slate-950/85 px-3 py-2 shadow-lg backdrop-blur-md">
            <p className="text-[10px] font-semibold tracking-wide text-cyan-300 uppercase">
              Provincial map
            </p>
            <h1 className="text-sm font-semibold text-white sm:text-base">
              {lockedProvince}
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {deferredProjects.length} project
              {deferredProjects.length === 1 ? '' : 's'} · callout pins
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <Maps
            projects={deferredProjects}
            selectedId={selectedId}
            baseLayer="street"
            viewMode="2d"
            perfLite={perfLite}
            onViewProject={(project) => setSelectedId(project.id)}
          />
        </div>

        {selected ? (
          <div className="absolute inset-x-3 bottom-3 z-[500] mx-auto max-w-lg rounded-xl border border-slate-700 bg-slate-950/90 p-3 shadow-xl backdrop-blur-md sm:inset-x-auto sm:right-3 sm:left-auto sm:w-80">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-wide text-cyan-300 uppercase">
                  {PROGRAM_META[selected.program]?.short ?? selected.program}
                </p>
                <h2 className="mt-0.5 truncate text-sm font-semibold text-white">
                  {selected.name}
                </h2>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                  <HiMapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">
                    {selected.municipality}, {selected.province}
                  </span>
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {projectStatusLabel(selected)} · {selected.progress}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
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
