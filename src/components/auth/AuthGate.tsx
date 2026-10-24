'use client';

import { useAuth } from '@/context/AuthContext';
import { CambioPasswordObligatorio } from './CambioPasswordObligatorio';

export function AuthGate({ children }: { children: React.ReactNode }) {
    const { user, userProfile, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            </div>
        );
    }

    if (user && userProfile?.mustChangePassword) {
        return <CambioPasswordObligatorio />;
    }

    return <>{children}</>;
}
