import { Form, Head } from '@inertiajs/react';
import { Lock, Mail } from 'lucide-react';
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
import AuthGlassLayout from '@/layouts/auth/auth-glass-layout';
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
                    className="mb-5 rounded-xl border border-green-200 bg-green-50/90 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-400"
                >
                    {status}
                </div>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        {/* Radix Checkbox is not a native input — hidden field posts remember. */}
                        <input
                            type="hidden"
                            name="remember"
                            value={remember ? '1' : '0'}
                        />

                        <div className="grid gap-3">
                            <div className="grid gap-1.5">
                                <Label htmlFor="email" className="sr-only">
                                    Email address
                                </Label>
                                <div className="relative">
                                    <Mail
                                        className={fieldIconClass}
                                        aria-hidden
                                    />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        autoComplete="username"
                                        inputMode="email"
                                        placeholder="Email address"
                                        className={fieldClass}
                                        value={
                                            hydrated ? email : emailFromServer
                                        }
                                        onChange={(event) =>
                                            setEmail(event.target.value)
                                        }
                                        aria-invalid={
                                            errors.email ? true : undefined
                                        }
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="password" className="sr-only">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Lock
                                        className={fieldIconClass}
                                        aria-hidden
                                    />
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        autoComplete="current-password"
                                        placeholder="Password"
                                        className={fieldClass}
                                        aria-invalid={
                                            errors.password ? true : undefined
                                        }
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
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
                                    className="cursor-pointer text-sm font-normal text-[#4b5563] dark:text-[#cfcfcf]"
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
                            className="h-11 w-full cursor-pointer rounded-xl bg-linear-to-b from-[#2563EB] to-[#1D4ED8] text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.7)] transition-[filter,box-shadow] duration-200 hover:shadow-[0_12px_28px_-8px_rgba(29,78,216,0.8)] hover:brightness-110 focus-visible:ring-[#60A5FA]/60 disabled:opacity-70"
                            disabled={processing}
                            data-test="login-button"
                        >
                            {processing && <Spinner />}
                            Sign in
                        </Button>

                        {canRegister && (
                            <p className="text-center text-sm text-[#4b5563] dark:text-[#cfcfcf]">
                                No account yet?{' '}
                                <TextLink
                                    href={register()}
                                    className={linkClass}
                                >
                                    Create an account
                                </TextLink>
                            </p>
                        )}

                        <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.14em] text-[#6b7280] uppercase dark:text-[#8b95a8]">
                            <span className="h-px flex-1 border-t border-dashed border-current opacity-40" />
                            Authorized personnel only
                            <span className="h-px flex-1 border-t border-dashed border-current opacity-40" />
                        </div>
                        <p className="-mt-2 text-center text-xs leading-relaxed text-[#6b7280] dark:text-[#a3acbd]">
                            For DOST-MIMAROPA staff. Ask your system
                            administrator if you need access.
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

const fieldClass =
    'h-11 rounded-xl border-transparent bg-[#eef2f7] pl-10 text-[#030A17] shadow-none placeholder:text-[#6b7280] focus-visible:border-[#60A5FA] focus-visible:ring-[#60A5FA]/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-[#8b95a8]';

const fieldIconClass =
    'pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-[#6b7280] dark:text-[#8b95a8]';

const linkClass =
    'text-sm font-semibold text-[#1D4ED8] decoration-[#1D4ED8]/40 hover:decoration-[#1D4ED8] dark:text-[#93C5FD] dark:decoration-[#93C5FD]/40';

Login.layout = (page: ReactNode) => (
    <AuthGlassLayout
        title="Sign in to"
        description="Access the project monitoring workspace for DOST-MIMAROPA."
    >
        {page}
    </AuthGlassLayout>
);
