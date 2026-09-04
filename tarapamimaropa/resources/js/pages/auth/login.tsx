import { Form, Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
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

                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="email@example.com"
                                    value={hydrated ? email : emailFromServer}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm"
                                            tabIndex={5}
                                        >
                                            Forgot your password?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Password"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    tabIndex={3}
                                    checked={remember}
                                    onCheckedChange={(value) =>
                                        setRemember(value === true)
                                    }
                                />
                                <Label htmlFor="remember">Remember me</Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Log in
                            </Button>
                        </div>

                        {canRegister && (
                            <div className="text-muted-foreground text-center text-sm">
                                Don&apos;t have an account?{' '}
                                <TextLink href={register()} tabIndex={6}>
                                    Sign up
                                </TextLink>
                            </div>
                        )}
                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Log in to your account',
    description: 'Enter your email and password below to log in',
};
