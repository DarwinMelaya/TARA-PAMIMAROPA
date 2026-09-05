import { usePage } from '@inertiajs/react';
import CommandMapWorkspace from '@/components/dashboard/CommandMapWorkspace';
import type { TaraProject } from '@/constants/taraProjects';
import { programs } from '@/routes/region';

type PageProps = {
  projects?: TaraProject[];
};

const RegionDashboard = () => {
  const { projects = [] } = usePage<PageProps>().props;

  return (
    <CommandMapWorkspace
      projects={projects}
      variant="region"
      programsHref={programs.url()}
      pageTitle="Region dashboard"
    />
  );
};

export default RegionDashboard;
