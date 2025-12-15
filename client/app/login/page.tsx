'use client';
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function Login() {
    const router = useRouter();
    const { login, isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, router]);

    const handleLogin = async (email: string, password: string) => {
        const result = await login(email, password);
        const success = typeof result === 'boolean' ? result : result.success;
        if (success) {
            router.push("/");
        }
        return success;
    };

    // const handleGoogleLogin = async () => {
    //     const success = await loginWithGoogle();
    //     if (success) {
    //         router.push("/dashboard");
    //     }
    //     return success;
    // };

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to your account to continue"
        >
            <LoginForm
                onSubmit={handleLogin}
                // onGoogleLogin={handleGoogleLogin}
                // isLoading={isLoading}
                // error={error}
            />
        </AuthLayout>
    );
}
