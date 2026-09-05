import { Head, usePage } from '@inertiajs/react';
import ProgramsWorkspace from '@/components/programs/ProgramsWorkspace';
import type { Province, TaraProject } from '@/constants/taraProjects';
import { dashboard } from '@/routes/psto';
import {
  exportMethod,
  exportTemplate,
  importMethod,
} from '@/routes/psto/programs';

type PageProps = {
  projects?: TaraProject[];
  lockedProvince?: string | null;
  nextCodeSequence?: number;
};

const PstoPrograms = () => {
  const {
    projects = [],
    lockedProvince = null,
    nextCodeSequence = 1,
  } = usePage<PageProps>().props;

  if (!lockedProvince) {
    return (
      <>
        <Head title="PSTO Programs" />
        <div className="flex h-full flex-1 flex-col gap-4 p-4">
          <h1 className="text-xl font-semibold tracking-tight">Programs</h1>
          <p className="text-muted-foreground mt-1 max-w-prose text-sm">
            This PSTO account has no province assigned. Ask a super admin to set
            the province (for example Marinduque) so projects can load.
          </p>
        </div>
      </>
    );
  }

  return (
    <ProgramsWorkspace
      projects={projects}
      lockedProvince={lockedProvince as Province}
      allowImport
      importUrl={importMethod.url()}
      allowExport
      exportUrl={exportMethod.url()}
      exportTemplateUrl={exportTemplate.url()}
      allowMutate
      nextCodeSequence={nextCodeSequence}
      homeHref={dashboard.url()}
      homeLabel="Dashboard"
      pageTitle="PSTO Programs"
    />
  );
};

export default PstoPrograms;
