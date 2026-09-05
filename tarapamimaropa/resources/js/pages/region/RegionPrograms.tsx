import { usePage } from '@inertiajs/react';
import ProgramsWorkspace from '@/components/programs/ProgramsWorkspace';
import type { TaraProject } from '@/constants/taraProjects';
import { dashboard } from '@/routes/region';
import { importMethod } from '@/routes/region/programs';

type PageProps = {
  projects?: TaraProject[];
};

const RegionPrograms = () => {
  const { projects = [] } = usePage<PageProps>().props;

  return (
    <ProgramsWorkspace
      projects={projects}
      allowImport
      importUrl={importMethod.url()}
      homeHref={dashboard.url()}
      homeLabel="Command map"
      pageTitle="Programs"
    />
  );
};

export default RegionPrograms;
