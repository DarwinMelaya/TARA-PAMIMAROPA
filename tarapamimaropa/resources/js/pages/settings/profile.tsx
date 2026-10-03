import { Form, Head, usePage } from '@inertiajs/react';
import { Check } from 'lucide-react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useInitials } from '@/hooks/use-initials';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

export default function Profile() {
    const { auth } = usePage<PageProps>().props;
    const getInitials = useInitials();

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <div className="bg-card overflow-hidden rounded-2xl border">
                <div className="flex items-center gap-4 border-b px-5 py-5 sm:px-6">
                    <span
                        aria-hidden
                        className="font-sei-display grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-[#BFDBFE] via-[#60A5FA] to-[#1D4ED8] text-lg font-extrabold text-[#030A17]"
                    >
                        {getInitials(auth.user.name)}
                    </span>
                    <div className="min-w-0">
                        <p className="font-sei-display truncate text-lg font-bold">
                            {auth.user.name}
                        </p>
                        <p className="text-muted-foreground truncate text-sm">
                            {auth.user.email}
                        </p>
                    </div>
                </div>

                <div className="space-y-6 px-5 py-6 sm:px-6">
                    <Heading
                        variant="small"
                        title="Profile"
                        description="Update your name and email address"
                    />

                    <Form
                        {...ProfileController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        className="space-y-5"
                    >
                        {({ processing, recentlySuccessful, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>

                                    <Input
                                        id="name"
                                        className="h-11 rounded-lg px-3.5"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Full name"
                                        aria-invalid={
                                            errors.name ? true : undefined
                                        }
                                    />

                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email address</Label>

                                    <Input
                                        id="email"
                                        type="email"
                                        className="h-11 rounded-lg px-3.5"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        inputMode="email"
                                        placeholder="name@example.com"
                                        aria-invalid={
                                            errors.email ? true : undefined
                                        }
                                    />

                                    <InputError message={errors.email} />
                                </div>

                                <div className="flex items-center gap-4 border-t pt-5">
                                    <Button
                                        disabled={processing}
                                        className="h-11 min-w-28 cursor-pointer rounded-lg px-5 font-semibold"
                                        data-test="update-profile-button"
                                    >
                                        {processing && <Spinner />}
                                        Save changes
                                    </Button>
                                    <p
                                        role="status"
                                        aria-live="polite"
                                        className={`text-muted-foreground inline-flex items-center gap-1.5 text-sm transition-opacity duration-200 ${recentlySuccessful ? 'opacity-100' : 'opacity-0'}`}
                                    >
                                        <Check
                                            className="text-primary size-4"
                                            aria-hidden
                                        />
                                        {recentlySuccessful ? 'Saved' : ''}
                                    </p>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </div>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
