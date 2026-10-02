import { Form, Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

const EMAIL_KEY = 'tara_login_email';
const REMEMBER_KEY = 'tara_login_remember';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
    email?: string;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
    email: emailFromServer = '',
}: Props) {
    const [email, setEmail] = useState(emailFromServer);
    const [remember, setRemember] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const savedRemember = localStorage.getItem(REMEMBER_KEY) === '1';
        const savedEmail = localStorage.getItem(EMAIL_KEY) ?? '';

        setRemember(savedRemember);

        if (!emailFromServer && savedRemember && savedEmail) {
            setEmail(savedEmail);
        } else if (emailFromServer) {
            setEmail(emailFromServer);
        }

        setHydrated(true);
    }, [emailFromServer]);

    const persistLoginPrefs = (nextRemember = remember, nextEmail = email) => {
        if (nextRemember && nextEmail.trim()) {
            localStorage.setItem(EMAIL_KEY, nextEmail.trim());
            localStorage.setItem(REMEMBER_KEY, '1');
            return;
        }

        localStorage.removeItem(EMAIL_KEY);
        localStorage.removeItem(REMEMBER_KEY);
    };

    // Keep email in localStorage while Remember me is on (not only on submit).
    useEffect(() => {
        if (!hydrated) {
            return;
        }

        persistLoginPrefs();
    }, [hydrated, remember, email]);

    return (
        <>
            <Head title="Log in" />

            {status && (
                <div
                    role="status"
                    className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400"
                >
                    {status}
                </div>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        {/* Radix Checkbox is not a native input — hidden field posts remember. */}
                        <input
                            type="hidden"
                            name="remember"
                            value={remember ? '1' : '0'}
                        />

                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    autoComplete="username"
                                    inputMode="email"
                                    placeholder="name@example.com"
                                    className={fieldClass}
                                    value={hydrated ? email : emailFromServer}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    aria-invalid={
                                        errors.email ? true : undefined
                                    }
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className={fieldClass}
                                    aria-invalid={
                                        errors.password ? true : undefined
                                    }
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2.5">
                                    <Checkbox
                                        id="remember"
                                        title="Stay signed in on this device until you log out"
                                        checked={remember}
                                        onCheckedChange={(value) =>
                                            setRemember(value === true)
                                        }
                                    />
                                    <Label
                                        htmlFor="remember"
                                        className="cursor-pointer font-normal"
                                    >
                                        Keep me signed in
                                    </Label>
                                </div>
                                {canResetPassword && (
                                    <TextLink
                                        href={request()}
                                        className={linkClass}
                                    >
                                        Forgot password?
                                    </TextLink>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="mt-1 h-11 w-full cursor-pointer rounded-lg text-sm font-semibold"
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Sign in
                            </Button>
                        </div>

                        {canRegister && (
                            <p className="text-muted-foreground text-center text-sm">
                                No account yet?{' '}
                                <TextLink href={register()} className={linkClass}>
                                    Create an account
                                </TextLink>
                            </p>
                        )}

                        <p className="text-muted-foreground border-t pt-6 text-xs leading-relaxed">
                            For authorized DOST-MIMAROPA personnel only. Ask
                            your system administrator if you need access.
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

const fieldClass =
    'h-11 rounded-lg px-3.5';

const linkClass =
    'text-sm font-medium';

Login.layout = (page: ReactNode) => (
    <AuthSplitLayout
        title="Sign in"
        description="Use your account to access the project monitoring workspace."
    >
        {page}
    </AuthSplitLayout>
);
