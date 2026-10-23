'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Error no controlado:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xl">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <AlertTriangle className="h-7 w-7" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">Algo salió mal</h1>
                <p className="mt-2 text-sm text-slate-600">
                    La aplicación encontró un error inesperado. Puedes reintentar la operación.
                </p>
                {error.digest && (
                    <p className="mt-2 text-[10px] font-mono text-slate-400">Código: {error.digest}</p>
                )}
                <button
                    onClick={reset}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                >
                    <RotateCcw className="h-4 w-4" />
                    Reintentar
                </button>
            </div>
        </div>
    );
}
