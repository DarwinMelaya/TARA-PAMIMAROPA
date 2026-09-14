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
    <div className="h-full min-h-0 translate-y-0 opacity-100 transition-[opacity,transform] duration-500 ease-out motion-safe:starting:translate-y-1 motion-safe:starting:opacity-0">
      <CommandMapWorkspace
        projects={projects}
        variant="region"
        programsHref={programs.url()}
        pageTitle="Region dashboard · RD AI Planning"
      />
    </div>
  );
};

export default RegionDashboard;
