import { useState } from 'react';
import ProjectController from '@/actions/App/Http/Controllers/Psto/ProjectController';
import ProjectFormDialog from '@/components/modals/psto/ProjectFormDialog';
import type { Province, TaraProject } from '@/constants/taraProjects';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lockedProvince: Province;
    project: TaraProject | null;
};

const EditProjectsModal = ({
    open,
    onOpenChange,
    lockedProvince,
    project,
}: Props) => {
    // Parent clears `project` on close; keep the last one so the close animation still has content.
    const [shown, setShown] = useState(project);
    if (project && project !== shown) {
        setShown(project);
    }

    if (!shown?.db_id) {
        return null;
    }

    return (
        <ProjectFormDialog
            open={open && project != null}
            onOpenChange={onOpenChange}
            province={lockedProvince}
            idPrefix="edit-project"
            title="Edit project"
            description={`Update details for ${shown.name}.`}
            submitLabel="Save changes"
            form={ProjectController.update.form(shown.db_id)}
            project={shown}
        />
    );
};

export default EditProjectsModal;
