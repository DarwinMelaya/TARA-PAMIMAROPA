import ProjectController from '@/actions/App/Http/Controllers/Psto/ProjectController';
import ProjectFormDialog from '@/components/modals/psto/ProjectFormDialog';
import type { Province } from '@/constants/taraProjects';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lockedProvince: Province;
    nextCodeSequence?: number;
};

const AddProjectsModal = ({
    open,
    onOpenChange,
    lockedProvince,
    nextCodeSequence = 1,
}: Props) => (
    <ProjectFormDialog
        open={open}
        onOpenChange={onOpenChange}
        province={lockedProvince}
        idPrefix="add-project"
        title="Add project"
        description={`Create a project under ${lockedProvince}. Only the project name is required.`}
        submitLabel="Save project"
        form={ProjectController.store.form()}
        nextCodeSequence={nextCodeSequence}
    />
);

export default AddProjectsModal;
