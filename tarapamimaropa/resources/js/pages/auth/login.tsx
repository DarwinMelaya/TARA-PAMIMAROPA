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
                    className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400"
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
                                <Label
                                    htmlFor="email"
                                    className="gap-0.5 font-semibold text-[#1B2559] dark:text-white"
                                >
                                    Email
                                    <span
                                        className="text-[#4318FF] dark:text-[#9F8BFF]"
                                        aria-hidden="true"
                                    >
                                        *
                                    </span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="mail@example.com"
                                    className={fieldClass}
                                    value={hydrated ? email : emailFromServer}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="password"
                                    className="gap-0.5 font-semibold text-[#1B2559] dark:text-white"
                                >
                                    Password
                                    <span
                                        className="text-[#4318FF] dark:text-[#9F8BFF]"
                                        aria-hidden="true"
                                    >
                                        *
                                    </span>
                                </Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className={fieldClass}
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2.5">
                                    <Checkbox
                                        id="remember"
                                        tabIndex={3}
                                        checked={remember}
                                        onCheckedChange={(value) =>
                                            setRemember(value === true)
                                        }
                                        className="data-[state=checked]:border-[#4318FF] data-[state=checked]:bg-[#4318FF]"
                                    />
                                    <Label
                                        htmlFor="remember"
                                        className="font-normal text-[#1B2559] dark:text-white"
                                    >
                                        Keep me logged in
                                    </Label>
                                </div>
                                {canResetPassword && (
                                    <TextLink
                                        href={request()}
                                        className="text-sm font-medium text-[#4318FF] no-underline hover:underline dark:text-[#9F8BFF]"
                                        tabIndex={4}
                                    >
                                        Forgot password?
                                    </TextLink>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 h-12 w-full rounded-2xl bg-[#4318FF] text-sm font-semibold text-white shadow-lg shadow-[#4318FF]/25 hover:bg-[#3311DB] focus-visible:ring-[#4318FF]/40 dark:bg-[#7551FF] dark:hover:bg-[#6440F5]"
                                tabIndex={5}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Sign in
                            </Button>
                        </div>

                        {canRegister && (
                            <div className="text-sm text-[#1B2559] dark:text-white">
                                Not registered yet?{' '}
                                <TextLink
                                    href={register()}
                                    tabIndex={6}
                                    className="font-semibold text-[#4318FF] no-underline hover:underline dark:text-[#9F8BFF]"
                                >
                                    Create an account
                                </TextLink>
                            </div>
                        )}
                    </>
                )}
            </Form>
        </>
    );
}

const fieldClass =
    'h-12 rounded-2xl border-[#E0E5F2] px-4 focus-visible:border-[#4318FF] focus-visible:ring-[#4318FF]/20 dark:border-white/15';

Login.layout = (page: ReactNode) => (
    <AuthSplitLayout
        title="Sign In"
        description="Enter your email and password to sign in."
    >
        {page}
    </AuthSplitLayout>
);
