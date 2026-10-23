'use client';

import { LogOut, ShieldAlert } from 'lucide-react';

interface AccessBlockedProps {
    title: string;
    message: string;
    onLogout: () => void | Promise<void>;
}

export function AccessBlocked({ title, message, onLogout }: AccessBlockedProps) {
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-slate-800/80 p-8 text-center shadow-2xl">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                    <ShieldAlert className="h-7 w-7" />
                </div>
                <h1 className="text-xl font-bold text-white">{title}</h1>
                <p className="mt-2 text-sm text-slate-300">{message}</p>
                <button
                    onClick={() => void onLogout()}
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
                >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                </button>
            </div>
        </div>
    );
}
